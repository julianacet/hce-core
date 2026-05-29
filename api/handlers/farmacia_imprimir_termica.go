package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// POST /api/farmacia/facturas/:id/imprimir-termica
func FarmaciaImprimirTermicaFactura(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		printerName := os.Getenv("PRINTER_TERMICA")
		if printerName == "" {
			responderError(w, http.StatusServiceUnavailable,
				"impresora térmica no configurada — define PRINTER_TERMICA")
			return
		}

		id := chi.URLParam(r, "id")

		type row struct {
			Numero            string
			PacienteDocumento string
			PacienteNombre    string
			Fecha             time.Time
			Total             float64
			Estado            string
			CreadoPor         string
			Notas             *string
		}
		var f row
		err := db.QueryRow(r.Context(), `
			SELECT f.numero, f.paciente_documento,
			       COALESCE(CONCAT_WS(' ', p.nombre_primero, p.nombre_segundo,
			                          p.apellido_primero, p.apellido_segundo),
			                f.paciente_documento),
			       f.fecha, f.total, f.estado, f.creado_por, f.notas
			FROM farmacia.factura f
			LEFT JOIN paciente p ON p.numero_documento = f.paciente_documento
			  AND p.es_ultima_version = TRUE AND p.esta_activo = TRUE
			WHERE f.id = $1`, id,
		).Scan(&f.Numero, &f.PacienteDocumento, &f.PacienteNombre,
			&f.Fecha, &f.Total, &f.Estado, &f.CreadoPor, &f.Notas)
		if err != nil {
			responderError(w, http.StatusNotFound, "factura no encontrada")
			return
		}

		rows, err := db.Query(r.Context(), `
			SELECT nombre_medicamento, concentracion, forma_farmaceutica,
			       cantidad, precio_unitario, subtotal
			FROM farmacia.factura_item
			WHERE factura_id = $1
			ORDER BY nombre_medicamento`, id)
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer ítems")
			return
		}
		defer rows.Close()

		var items []farmTermicaItem
		for rows.Next() {
			var it farmTermicaItem
			if err := rows.Scan(&it.Nombre, &it.Concentracion, &it.FormaFarmaceutica,
				&it.Cantidad, &it.PrecioUnitario, &it.Subtotal); err != nil {
				continue
			}
			items = append(items, it)
		}

		var medicoJSON []byte
		db.QueryRow(r.Context(), `SELECT medico FROM configuracion_sistema WHERE id = 1`).Scan(&medicoJSON)
		var cfg struct {
			NombreConsultorio string `json:"nombreConsultorio"`
			Nombre            string `json:"nombre"`
			NIT               string `json:"nit"`
			Telefono          string `json:"telefono"`
			Impresion         struct {
				TermicaFactura string `json:"termicaFactura"`
			} `json:"impresion"`
		}
		json.Unmarshal(medicoJSON, &cfg)

		width := 32
		if cfg.Impresion.TermicaFactura == "Termica80" {
			width = 48
		}

		data := farmEscpos(f.Numero, f.PacienteDocumento, f.PacienteNombre,
			f.Fecha, f.Total, f.Estado, f.CreadoPor, f.Notas,
			items, cfg.NombreConsultorio, cfg.Nombre, cfg.NIT, cfg.Telefono, width)

		tmp, err := os.CreateTemp("", "farm-print-*.bin")
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al preparar impresión")
			return
		}
		defer os.Remove(tmp.Name())
		tmp.Write(data)
		tmp.Close()

		// Reutiliza enviarImpresora del mismo package (imprimir_termica.go)
		if err := enviarImpresora(printerName, tmp.Name()); err != nil {
			responderError(w, http.StatusInternalServerError,
				fmt.Sprintf("error al enviar a impresora: %s", err.Error()))
			return
		}

		responderJSON(w, http.StatusOK, map[string]string{"estado": "imprimiendo"})
	}
}

// ── ESC/POS para farmacia ─────────────────────────────────────────────────────

type farmTermicaItem struct {
	Nombre            string
	Concentracion     string
	FormaFarmaceutica string
	Cantidad          float64
	PrecioUnitario    float64
	Subtotal          float64
}

func farmEscpos(
	numero, docPaciente, nombrePaciente string,
	fecha time.Time, total float64, estado, creadoPor string, notas *string,
	items []farmTermicaItem,
	consultorio, nombre, nit, telefono string, width int,
) []byte {
	var b bytes.Buffer
	w := func(s string) { b.WriteString(s) }

	zona := time.FixedZone("COT", -5*3600)
	f := fecha.In(zona)

	w(escReset)
	w(escCP850)
	w(escCenter)

	if consultorio != "" {
		w(escBoldOn + farmWrap(ascii(consultorio), width) + escBoldOff)
	}
	if nombre != "" {
		w(farmWrap(ascii(nombre), width))
	}
	if nit != "" {
		w("NIT " + nit + "\n")
	}
	if telefono != "" {
		w("Tel: " + telefono + "\n")
	}
	w("\n")

	w(escBoldOn + "FACTURA DE VENTA\n" + escBoldOff)
	w(escLeft)
	w(farmColumnas("No. "+numero,
		fmt.Sprintf("%02d/%02d/%04d %02d:%02d", f.Day(), f.Month(), f.Year(), f.Hour(), f.Minute()),
		width) + "\n")

	if estado == "anulada" {
		w(escCenter + escBoldOn + "*** ANULADA ***\n" + escBoldOff + escLeft)
	}
	w("\n")

	w(farmWrap("Paciente: "+ascii(nombrePaciente), width))
	w("Doc:      " + docPaciente + "\n\n")

	for _, it := range items {
		w(farmWrap(ascii(it.Nombre), width))
		detalle := ascii(strings.Join([]string{it.Concentracion, it.FormaFarmaceutica}, " "))
		detalle = strings.TrimSpace(detalle)
		precio := ""
		if it.Cantidad != 1 {
			precio = fmt.Sprintf("%.0f x %s", it.Cantidad, farmCop(it.PrecioUnitario))
		} else {
			precio = farmCop(it.PrecioUnitario)
		}
		if detalle != "" {
			w(farmWrap("  "+detalle, width))
		}
		w(farmColumnas("  "+precio, farmCop(it.Subtotal), width) + "\n")
	}
	w("\n")

	w(farmColumnas("IVA (excluido):", "$0", width) + "\n")
	w(escBoldOn + farmColumnas("TOTAL:", farmCop(total), width) + "\n" + escBoldOff)

	if notas != nil && strings.TrimSpace(*notas) != "" {
		w("\n" + farmWrap("Nota: "+ascii(*notas), width))
	}

	w(escCenter)
	w("\nDespachado por: " + ascii(creadoPor) + "\n")
	w("Excluido de IVA Art. 476\n")
	w("Gracias por su confianza\n")
	w("\n\n\n")
	w(escCut)

	return b.Bytes()
}

func farmColumnas(izq, der string, width int) string {
	lw := utf8.RuneCountInString(izq)
	rw := utf8.RuneCountInString(der)
	sp := width - lw - rw
	if sp < 1 {
		sp = 1
	}
	return izq + strings.Repeat(" ", sp) + der
}

func farmWrap(s string, width int) string {
	runes := []rune(s)
	if len(runes) <= width {
		return s + "\n"
	}
	var sb strings.Builder
	for len(runes) > 0 {
		if len(runes) <= width {
			sb.WriteString(string(runes))
			sb.WriteByte('\n')
			break
		}
		cut := width
		for cut > width/2 && runes[cut] != ' ' {
			cut--
		}
		if runes[cut] == ' ' {
			sb.WriteString(string(runes[:cut]))
			sb.WriteByte('\n')
			runes = runes[cut+1:]
		} else {
			sb.WriteString(string(runes[:width]))
			sb.WriteByte('\n')
			runes = runes[width:]
		}
	}
	return sb.String()
}

func farmCop(v float64) string {
	s := fmt.Sprintf("%.0f", v)
	n := len(s)
	var out []byte
	for i := 0; i < n; i++ {
		if i > 0 && (n-i)%3 == 0 {
			out = append(out, '.')
		}
		out = append(out, s[i])
	}
	return "$" + string(out)
}
