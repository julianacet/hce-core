package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type farmaciaDashboardHandler struct{ db *pgxpool.Pool }

func FarmaciaDashboardRouter(db *pgxpool.Pool) http.Handler {
	h := &farmaciaDashboardHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.resumen)
	return r
}

// GET /api/farmacia/dashboard?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
func (h *farmaciaDashboardHandler) resumen(w http.ResponseWriter, r *http.Request) {
	now := time.Now()

	desde := r.URL.Query().Get("desde")
	hasta := r.URL.Query().Get("hasta")
	if desde == "" {
		desde = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
	}
	if hasta == "" {
		hasta = now.Format("2006-01-02")
	}

	type TopMedicamento struct {
		Nombre        string  `json:"nombre"`
		TotalIngresos float64 `json:"total_ingresos"`
		TotalCantidad float64 `json:"total_cantidad"`
	}
	type Resumen struct {
		TotalVentas     float64          `json:"total_ventas"`
		NumFacturas     int              `json:"num_facturas"`
		TicketPromedio  float64          `json:"ticket_promedio"`
		NumAnuladas     int              `json:"num_anuladas"`
		TopMedicamentos []TopMedicamento `json:"top_medicamentos"`
		Desde           string           `json:"desde"`
		Hasta           string           `json:"hasta"`
	}

	res := Resumen{Desde: desde, Hasta: hasta, TopMedicamentos: []TopMedicamento{}}

	err := h.db.QueryRow(r.Context(), `
		SELECT
			COALESCE(SUM(total)  FILTER (WHERE estado != 'anulada'), 0),
			COUNT(*)             FILTER (WHERE estado != 'anulada'),
			COALESCE(AVG(total)  FILTER (WHERE estado != 'anulada'), 0),
			COUNT(*)             FILTER (WHERE estado =  'anulada')
		FROM farmacia.factura
		WHERE fecha >= $1::date
		  AND fecha <  $2::date + interval '1 day'`,
		desde, hasta,
	).Scan(&res.TotalVentas, &res.NumFacturas, &res.TicketPromedio, &res.NumAnuladas)
	if err != nil {
		log.Printf("farmacia dashboard resumen: %v", err)
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT fi.nombre_medicamento,
		       COALESCE(SUM(fi.subtotal), 0)  AS total_ingresos,
		       COALESCE(SUM(fi.cantidad), 0)  AS total_cantidad
		FROM farmacia.factura_item fi
		JOIN farmacia.factura f ON f.id = fi.factura_id
		WHERE f.estado != 'anulada'
		  AND f.fecha >= $1::date
		  AND f.fecha <  $2::date + interval '1 day'
		GROUP BY fi.nombre_medicamento
		ORDER BY total_ingresos DESC
		LIMIT 5`,
		desde, hasta,
	)
	if err != nil {
		log.Printf("farmacia dashboard top medicamentos: %v", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var t TopMedicamento
			if err := rows.Scan(&t.Nombre, &t.TotalIngresos, &t.TotalCantidad); err != nil {
				log.Printf("farmacia dashboard scan top: %v", err)
				continue
			}
			res.TopMedicamentos = append(res.TopMedicamentos, t)
		}
	}

	responderJSON(w, http.StatusOK, res)
}
