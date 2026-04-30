package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"hce/api/models"
)

func DashboardRouter(db *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	h := &dashboardHandler{db: db}
	r.Get("/", h.resumen)
	return r
}

type dashboardHandler struct{ db *pgxpool.Pool }

func (h *dashboardHandler) resumen(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	res := models.DashboardResumen{
		InsumosStockBajo: []models.InsumoAlerta{},
		UltimosPacientes: []models.UltimoPaciente{},
	}

	// Encuentros de hoy
	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM encuentro_clinico
		WHERE fecha_atencion::date = CURRENT_DATE
		  AND es_ultima_version = TRUE AND esta_activo = TRUE`,
	).Scan(&res.EncuentrosHoy); err != nil {
		log.Printf("dashboard encuentros_hoy: %v", err)
	}

	// Pacientes distintos atendidos este mes
	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT paciente_documento) FROM encuentro_clinico
		WHERE date_trunc('month', fecha_atencion) = date_trunc('month', CURRENT_DATE)
		  AND es_ultima_version = TRUE AND esta_activo = TRUE`,
	).Scan(&res.PacientesMes); err != nil {
		log.Printf("dashboard pacientes_mes: %v", err)
	}

	// Total facturado este mes (emitida + pagada)
	if err := h.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(total), 0) FROM factura
		WHERE date_trunc('month', fecha_emision) = date_trunc('month', CURRENT_DATE)
		  AND estado IN ('emitida', 'pagada')
		  AND es_ultima_version = TRUE AND esta_activo = TRUE`,
	).Scan(&res.FacturadoMes); err != nil {
		log.Printf("dashboard facturado_mes: %v", err)
	}

	// Promedio satisfacción general (todo el tiempo)
	var promedio *float64
	if err := h.db.QueryRow(ctx, `
		SELECT AVG(satisfaccion_general)::float FROM encuesta_satisfaccion`,
	).Scan(&promedio); err != nil {
		log.Printf("dashboard satisfaccion: %v", err)
	}
	res.SatisfaccionPromedio = promedio

	// Insumos con stock bajo o agotado
	rows, err := h.db.Query(ctx, `
		SELECT id, nombre, stock_actual, stock_minimo, unidad
		FROM insumo
		WHERE stock_actual <= stock_minimo AND esta_activo = TRUE
		ORDER BY (stock_actual - stock_minimo) ASC`)
	if err != nil {
		log.Printf("dashboard insumos_stock_bajo: %v", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var i models.InsumoAlerta
			if err := rows.Scan(&i.ID, &i.Nombre, &i.StockActual, &i.StockMinimo, &i.Unidad); err == nil {
				res.InsumosStockBajo = append(res.InsumosStockBajo, i)
			}
		}
	}

	// Últimos 8 pacientes atendidos
	rows2, err := h.db.Query(ctx, `
		SELECT
			e.encuentro_id,
			e.paciente_documento,
			CONCAT_WS(' ',
				p.nombre_primero, NULLIF(p.nombre_segundo, ''),
				p.apellido_primero, NULLIF(p.apellido_segundo, '')
			) AS nombre_paciente,
			e.fecha_atencion,
			e.codigo_diagnostico_principal,
			e.descripcion_diagnostico
		FROM encuentro_clinico e
		JOIN paciente p
			ON p.numero_documento = e.paciente_documento
			AND p.es_ultima_version = TRUE
		WHERE e.es_ultima_version = TRUE AND e.esta_activo = TRUE
		ORDER BY e.fecha_atencion DESC
		LIMIT 8`)
	if err != nil {
		log.Printf("dashboard ultimos_pacientes: %v", err)
	} else {
		defer rows2.Close()
		for rows2.Next() {
			var u models.UltimoPaciente
			if err := rows2.Scan(
				&u.EncuentroID, &u.PacienteDocumento, &u.NombrePaciente,
				&u.FechaAtencion, &u.CodigoDiagnosticoPrincipal, &u.DescripcionDiagnostico,
			); err == nil {
				res.UltimosPacientes = append(res.UltimosPacientes, u)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}
