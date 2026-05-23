package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"hce/api/models"
)

// POST /facturas/{facturaId}/imprimir-termica
func ImprimirTermicaFactura(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		printerName := os.Getenv("PRINTER_TERMICA")
		if printerName == "" {
			responderError(w, http.StatusServiceUnavailable,
				"impresora térmica no configurada — define la variable de entorno PRINTER_TERMICA")
			return
		}

		facturaID := chi.URLParam(r, "facturaId")

		var f models.Factura
		err := db.QueryRow(r.Context(), `
			SELECT id, factura_id, paciente_documento, estado, subtotal, total, fecha_creacion, creado_por
			FROM factura
			WHERE factura_id = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
			facturaID,
		).Scan(&f.ID, &f.FacturaID, &f.PacienteDocumento, &f.Estado,
			&f.Subtotal, &f.Total, &f.FechaCreacion, &f.CreadoPor)
		if err != nil {
			responderError(w, http.StatusNotFound, "factura no encontrada")
			return
		}

		items, err := obtenerItems(r.Context(), db, f.ID)
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer items")
			return
		}
		f.Items = items

		// Nombre del paciente
		var nombrePaciente string
		db.QueryRow(r.Context(), `
			SELECT TRIM(
				COALESCE(nombre_primero,'') || ' ' || COALESCE(nombre_segundo,'') || ' ' ||
				COALESCE(apellido_primero,'') || ' ' || COALESCE(apellido_segundo,''))
			FROM paciente
			WHERE numero_documento = $1
			ORDER BY numero_version DESC LIMIT 1`,
			f.PacienteDocumento,
		).Scan(&nombrePaciente)
		if nombrePaciente == "" {
			nombrePaciente = f.PacienteDocumento
		}

		// Configuración del consultorio / médico
		var medicoJSON []byte
		db.QueryRow(r.Context(), `SELECT medico FROM configuracion_sistema WHERE id = 1`).Scan(&medicoJSON)

		var cfg struct {
			NombreConsultorio string `json:"nombreConsultorio"`
			Nombre            string `json:"nombre"`
			Especialidad      string `json:"especialidad"`
			NIT               string `json:"nit"`
			Direccion         string `json:"direccion"`
			Ciudad            string `json:"ciudad"`
			Telefono          string `json:"telefono"`
			Impresion         struct {
				TermicaFactura string `json:"termicaFactura"`
			} `json:"impresion"`
		}
		json.Unmarshal(medicoJSON, &cfg)

		width := 32 // 58 mm
		if cfg.Impresion.TermicaFactura == "Termica80" {
			width = 48
		}

		data := escposFactura(f, nombrePaciente, cfg.NombreConsultorio, cfg.Nombre,
			cfg.Especialidad, cfg.NIT, cfg.Direccion, cfg.Ciudad, cfg.Telefono, width)

		tmp, err := os.CreateTemp("", "hce-print-*.bin")
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al preparar impresión")
			return
		}
		defer os.Remove(tmp.Name())
		tmp.Write(data)
		tmp.Close()

		if err := enviarImpresora(printerName, tmp.Name()); err != nil {
			responderError(w, http.StatusInternalServerError,
				fmt.Sprintf("error al enviar a impresora: %s", err.Error()))
			return
		}

		responderJSON(w, http.StatusOK, map[string]string{"estado": "imprimiendo"})
	}
}

// ── Envío a impresora (multiplataforma) ───────────────────────────────────────

func enviarImpresora(printerName, filePath string) error {
	if runtime.GOOS == "windows" {
		return enviarWindows(printerName, filePath)
	}
	// Linux / macOS: lp con CUPS
	out, err := exec.Command("lp", "-d", printerName, "-o", "raw", filePath).CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s", strings.TrimSpace(string(out)))
	}
	return nil
}

// enviarWindows usa PowerShell + WinSpool para enviar ESC/POS en modo RAW.
func enviarWindows(printerName, filePath string) error {
	// Escapa la ruta para PowerShell (barras invertidas dobles)
	psPath := strings.ReplaceAll(filePath, `\`, `\\`)
	psPrinter := strings.ReplaceAll(printerName, `'`, `''`)

	script := fmt.Sprintf(`
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;
public class WinPrint {
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Auto)]
  public class DOCINFO{public string pDocName;public string pOutputFile;public string pDataType;}
  [DllImport("winspool.drv",CharSet=CharSet.Auto,SetLastError=true)]
  public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr d);
  [DllImport("winspool.drv",SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv",CharSet=CharSet.Auto,SetLastError=true)]
  public static extern int StartDocPrinter(IntPtr h,int lv,[In,MarshalAs(UnmanagedType.LPStruct)]DOCINFO di);
  [DllImport("winspool.drv",SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv",SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv",SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv",SetLastError=true)]
  public static extern bool WritePrinter(IntPtr h,IntPtr p,int n,out int w);
}
'@
$hp=[IntPtr]::Zero
[WinPrint]::OpenPrinter('%s',[ref]$hp,[IntPtr]::Zero)|Out-Null
$di=New-Object WinPrint+DOCINFO;$di.pDocName='HCE';$di.pDataType='RAW'
[WinPrint]::StartDocPrinter($hp,1,$di)|Out-Null
[WinPrint]::StartPagePrinter($hp)|Out-Null
$bytes=[IO.File]::ReadAllBytes('%s')
$ptr=[Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
[Runtime.InteropServices.Marshal]::Copy($bytes,0,$ptr,$bytes.Length)
$w=0;[WinPrint]::WritePrinter($hp,$ptr,$bytes.Length,[ref]$w)|Out-Null
[Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)
[WinPrint]::EndPagePrinter($hp)|Out-Null
[WinPrint]::EndDocPrinter($hp)|Out-Null
[WinPrint]::ClosePrinter($hp)|Out-Null
`, psPrinter, psPath)

	out, err := exec.Command("powershell",
		"-NoProfile", "-NonInteractive", "-Command", script).CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s", strings.TrimSpace(string(out)))
	}
	return nil
}

// ── ESC/POS ───────────────────────────────────────────────────────────────────

const (
	escReset    = "\x1b@"
	escCP850    = "\x1b\x74\x02" // code page 850 (Latin-1, soporta español)
	escCenter   = "\x1b\x61\x01"
	escLeft     = "\x1b\x61\x00"
	escBoldOn   = "\x1b\x45\x01"
	escBoldOff  = "\x1b\x45\x00"
	escTallOn   = "\x1d\x21\x01"
	escTallOff  = "\x1d\x21\x00"
	escCut      = "\x1d\x56\x41\x03"
)

func escposFactura(f models.Factura, paciente, consultorio, medico, especialidad, nit, direccion, ciudad, telefono string, width int) []byte {
	var b bytes.Buffer
	w := func(s string) { b.WriteString(s) }

	zona := time.FixedZone("COT", -5*3600)
	fecha := f.FechaCreacion.In(zona)

	w(escReset)
	w(escCP850)

	// ── Encabezado ───────────────────────────────────────────────────────────
	w(escCenter)
	if medico != "" {
		w(escBoldOn + wrap(ascii(medico), width) + escBoldOff)
	}
	if especialidad != "" {
		w(wrap(ascii(especialidad), width))
	}
	if nit != "" {
		w("NIT " + nit + "\n")
	}
	if telefono != "" {
		w("Tel: " + telefono + "\n")
	}
	w("\n")

	// ── Título ───────────────────────────────────────────────────────────────
	w(escBoldOn + "FACTURA DE VENTA\n" + escBoldOff)
	w(escLeft)

	ref := strings.ToUpper(f.FacturaID[:8])
	w(columnas("Ref: "+ref, fmt.Sprintf("%02d/%02d/%04d %02d:%02d", fecha.Day(), fecha.Month(), fecha.Year(), fecha.Hour(), fecha.Minute()), width) + "\n")

	if f.Estado == "anulada" {
		w(escCenter + escBoldOn + "*** ANULADA ***\n" + escBoldOff + escLeft)
	}

	w("\n")

	// ── Paciente ─────────────────────────────────────────────────────────────
	w(wrap("Paciente: "+ascii(paciente), width))
	w("Doc:      " + f.PacienteDocumento + "\n\n")

	// ── Items ────────────────────────────────────────────────────────────────
	for _, item := range f.Items {
		w(wrap(ascii(item.Descripcion), width))
		detalle := item.CodigoCups
		if item.Cantidad > 1 {
			detalle += fmt.Sprintf(" %d x %s", item.Cantidad, copStr(item.ValorUnitario))
		}
		w(columnas("  "+detalle, copStr(item.Subtotal), width) + "\n")
	}

	w("\n")

	// ── Total ────────────────────────────────────────────────────────────────
	w(columnas("Subtotal:", copStr(f.Total), width) + "\n")
	w(columnas("IVA:", "$0", width) + "\n")
	w(escBoldOn + columnas("TOTAL:", copStr(f.Total), width) + "\n" + escBoldOff)

	// ── Pie ──────────────────────────────────────────────────────────────────
	w(escCenter)
	w("\nExcluido de IVA Art. 476\n")
	w("Gracias por su confianza\n")

	w("\n\n\n")
	w(escCut)

	return b.Bytes()
}

// ── helpers de formato ────────────────────────────────────────────────────────

// columnas alinea izquierda y derecha dentro de width.
func columnas(izq, der string, width int) string {
	lw := utf8.RuneCountInString(izq)
	rw := utf8.RuneCountInString(der)
	sp := width - lw - rw
	if sp < 1 {
		sp = 1
	}
	return izq + strings.Repeat(" ", sp) + der
}

// wrap parte s en líneas de hasta width caracteres, rompiendo en espacios cuando es posible.
func wrap(s string, width int) string {
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

// ascii transliterates Spanish accented characters to plain ASCII.
func ascii(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch r {
		case 'á', 'à', 'ä', 'â': b.WriteByte('a')
		case 'é', 'è', 'ë', 'ê': b.WriteByte('e')
		case 'í', 'ì', 'ï', 'î': b.WriteByte('i')
		case 'ó', 'ò', 'ö', 'ô': b.WriteByte('o')
		case 'ú', 'ù', 'ü', 'û': b.WriteByte('u')
		case 'Á', 'À', 'Ä', 'Â': b.WriteByte('A')
		case 'É', 'È', 'Ë', 'Ê': b.WriteByte('E')
		case 'Í', 'Ì', 'Ï', 'Î': b.WriteByte('I')
		case 'Ó', 'Ò', 'Ö', 'Ô': b.WriteByte('O')
		case 'Ú', 'Ù', 'Ü', 'Û': b.WriteByte('U')
		case 'ñ': b.WriteByte('n')
		case 'Ñ': b.WriteByte('N')
		case '·', '•': b.WriteByte('-')
		default:
			if r < 128 {
				b.WriteRune(r)
			} else {
				b.WriteByte('?')
			}
		}
	}
	return b.String()
}

func juntarNoVacios(sep string, ss ...string) string {
	var r []string
	for _, s := range ss {
		if strings.TrimSpace(s) != "" {
			r = append(r, s)
		}
	}
	return strings.Join(r, sep)
}

// copStr formatea un valor como moneda COP sin decimales.
func copStr(v float64) string {
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
