package handlers

import (
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
		CitasHoy:              []models.CitaHoy{},
		ConsultasPorDia:       []models.ConsultaPorDia{},
		TopDiagnosticos:       []models.TopDiagnostico{},
		InsumosStockBajo:      []models.InsumoAlerta{},
		InsumosProximosVencer: []models.InsumoProximoVencer{},
		UltimosPacientes:      []models.UltimoPaciente{},
	}

	// ── Métricas simples ────────────────────────────────────────────────────

	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM encuentro_clinico
		WHERE fecha_atencion::date = CURRENT_DATE
		  AND es_ultima_version = TRUE AND esta_activo = TRUE`,
	).Scan(&res.EncuentrosHoy); err != nil {
		log.Printf("dashboard encuentros_hoy: %v", err)
		res.Advertencias = append(res.Advertencias, "encuentros_hoy")
	}

	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT paciente_documento) FROM encuentro_clinico
		WHERE date_trunc('month', fecha_atencion) = date_trunc('month', CURRENT_DATE)
		  AND es_ultima_version = TRUE AND esta_activo = TRUE`,
	).Scan(&res.PacientesMes); err != nil {
		log.Printf("dashboard pacientes_mes: %v", err)
		res.Advertencias = append(res.Advertencias, "pacientes_mes")
	}

	if err := h.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(total), 0) FROM factura
		WHERE date_trunc('month', fecha_creacion) = date_trunc('month', CURRENT_DATE)
		  AND estado = 'activa'
		  AND es_ultima_version = TRUE AND esta_activo = TRUE`,
	).Scan(&res.FacturadoMes); err != nil {
		log.Printf("dashboard facturado_mes: %v", err)
		res.Advertencias = append(res.Advertencias, "facturado_mes")
	}

	var promedio *float64
	if err := h.db.QueryRow(ctx, `
		SELECT AVG(satisfaccion_general)::float FROM encuesta_satisfaccion`,
	).Scan(&promedio); err != nil {
		log.Printf("dashboard satisfaccion: %v", err)
		res.Advertencias = append(res.Advertencias, "satisfaccion_promedio")
	} else {
		res.SatisfaccionPromedio = promedio
	}

	// ── Citas de hoy ────────────────────────────────────────────────────────

	rowsCitas, err := h.db.Query(ctx, `
		SELECT id, hora_inicio::text, paciente_nombre, paciente_documento, estado, motivo
		FROM cita
		WHERE fecha = CURRENT_DATE
		ORDER BY hora_inicio ASC`)
	if err != nil {
		log.Printf("dashboard citas_hoy: %v", err)
		res.Advertencias = append(res.Advertencias, "citas_hoy")
	} else {
		defer rowsCitas.Close()
		for rowsCitas.Next() {
			var c models.CitaHoy
			if err := rowsCitas.Scan(&c.ID, &c.HoraInicio, &c.PacienteNombre, &c.PacienteDoc, &c.Estado, &c.Motivo); err == nil {
				res.CitasHoy = append(res.CitasHoy, c)
			}
		}
	}

	// ── Consultas por día — últimos 30 días ─────────────────────────────────

	rowsDias, err := h.db.Query(ctx, `
		SELECT
			g.day::date::text AS fecha,
			COALESCE(cnt.total, 0) AS total
		FROM generate_series(
			CURRENT_DATE - INTERVAL '29 days',
			CURRENT_DATE,
			'1 day'::interval
		) AS g(day)
		LEFT JOIN (
			SELECT fecha_atencion::date AS fecha, COUNT(*) AS total
			FROM encuentro_clinico
			WHERE fecha_atencion >= CURRENT_DATE - INTERVAL '29 days'
			  AND es_ultima_version = TRUE AND esta_activo = TRUE
			GROUP BY fecha_atencion::date
		) cnt ON cnt.fecha = g.day::date
		ORDER BY g.day ASC`)
	if err != nil {
		log.Printf("dashboard consultas_por_dia: %v", err)
		res.Advertencias = append(res.Advertencias, "consultas_por_dia")
	} else {
		defer rowsDias.Close()
		for rowsDias.Next() {
			var d models.ConsultaPorDia
			if err := rowsDias.Scan(&d.Fecha, &d.Total); err == nil {
				res.ConsultasPorDia = append(res.ConsultasPorDia, d)
			}
		}
	}

	// ── Top 5 diagnósticos del mes ──────────────────────────────────────────

	rowsDiag, err := h.db.Query(ctx, `
		SELECT
			codigo_diagnostico_principal AS codigo,
			COALESCE(descripcion_diagnostico, '') AS descripcion,
			COUNT(*) AS total
		FROM encuentro_clinico
		WHERE date_trunc('month', fecha_atencion) = date_trunc('month', CURRENT_DATE)
		  AND es_ultima_version = TRUE AND esta_activo = TRUE
		  AND codigo_diagnostico_principal IS NOT NULL
		  AND codigo_diagnostico_principal != ''
		GROUP BY codigo_diagnostico_principal, descripcion_diagnostico
		ORDER BY total DESC
		LIMIT 5`)
	if err != nil {
		log.Printf("dashboard top_diagnosticos: %v", err)
		res.Advertencias = append(res.Advertencias, "top_diagnosticos")
	} else {
		defer rowsDiag.Close()
		for rowsDiag.Next() {
			var d models.TopDiagnostico
			if err := rowsDiag.Scan(&d.Codigo, &d.Descripcion, &d.Total); err == nil {
				res.TopDiagnosticos = append(res.TopDiagnosticos, d)
			}
		}
	}

	// ── Insumos con stock bajo ───────────────────────────────────────────────

	rowsStock, err := h.db.Query(ctx, `
		SELECT id, nombre, stock_actual, stock_minimo, unidad
		FROM insumo
		WHERE stock_actual <= stock_minimo AND esta_activo = TRUE
		ORDER BY (stock_actual - stock_minimo) ASC`)
	if err != nil {
		log.Printf("dashboard insumos_stock_bajo: %v", err)
		res.Advertencias = append(res.Advertencias, "insumos_stock_bajo")
	} else {
		defer rowsStock.Close()
		for rowsStock.Next() {
			var i models.InsumoAlerta
			if err := rowsStock.Scan(&i.ID, &i.Nombre, &i.StockActual, &i.StockMinimo, &i.Unidad); err == nil {
				res.InsumosStockBajo = append(res.InsumosStockBajo, i)
			}
		}
	}

	// ── Insumos próximos a vencer (≤ 30 días) ───────────────────────────────

	rowsVencer, err := h.db.Query(ctx, `
		SELECT
			id, nombre,
			fecha_vencimiento::date::text,
			(fecha_vencimiento::date - CURRENT_DATE)::int AS dias_restantes
		FROM insumo
		WHERE esta_activo = TRUE
		  AND fecha_vencimiento IS NOT NULL
		  AND fecha_vencimiento::date > CURRENT_DATE
		  AND fecha_vencimiento::date <= CURRENT_DATE + INTERVAL '30 days'
		ORDER BY fecha_vencimiento ASC`)
	if err != nil {
		log.Printf("dashboard insumos_proximos_vencer: %v", err)
		res.Advertencias = append(res.Advertencias, "insumos_proximos_vencer")
	} else {
		defer rowsVencer.Close()
		for rowsVencer.Next() {
			var i models.InsumoProximoVencer
			if err := rowsVencer.Scan(&i.ID, &i.Nombre, &i.FechaVencimiento, &i.DiasRestantes); err == nil {
				res.InsumosProximosVencer = append(res.InsumosProximosVencer, i)
			}
		}
	}

	// ── Últimos pacientes atendidos ──────────────────────────────────────────

	rowsPacientes, err := h.db.Query(ctx, `
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
		res.Advertencias = append(res.Advertencias, "ultimos_pacientes")
	} else {
		defer rowsPacientes.Close()
		for rowsPacientes.Next() {
			var u models.UltimoPaciente
			if err := rowsPacientes.Scan(
				&u.EncuentroID, &u.PacienteDocumento, &u.NombrePaciente,
				&u.FechaAtencion, &u.CodigoDiagnosticoPrincipal, &u.DescripcionDiagnostico,
			); err == nil {
				res.UltimosPacientes = append(res.UltimosPacientes, u)
			}
		}
	}

	responderJSON(w, http.StatusOK, res)
}
