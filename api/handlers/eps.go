package handlers

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EpsHandler struct {
	db *pgxpool.Pool
}

func EpsRouter(db *pgxpool.Pool) http.Handler {
	h := &EpsHandler{db: db}
	r := chi.NewRouter()
	r.Get("/regimenes", h.getRegimenes)
	r.Get("/", h.getEps)
	r.Get("/{codigo}", h.getUna)
	return r
}

type regimenSalud struct {
	Codigo string `json:"codigo"`
	Nombre string `json:"nombre"`
}

type epsEntidad struct {
	Codigo  string `json:"codigo"`
	Nombre  string `json:"nombre"`
	Regimen string `json:"regimen"`
}

func (h *EpsHandler) getRegimenes(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(),
		`SELECT codigo, nombre FROM regimen_salud ORDER BY nombre`)
	if err != nil {
		log.Printf("getRegimenes: %v", err)
		responderError(w, http.StatusInternalServerError, "error al obtener regímenes")
		return
	}
	defer rows.Close()

	resultado := make([]regimenSalud, 0)
	for rows.Next() {
		var rs regimenSalud
		if err := rows.Scan(&rs.Codigo, &rs.Nombre); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer régimen")
			return
		}
		resultado = append(resultado, rs)
	}
	responderJSON(w, http.StatusOK, resultado)
}

func (h *EpsHandler) getEps(w http.ResponseWriter, r *http.Request) {
	regimen := r.URL.Query().Get("regimen")
	if regimen == "" {
		responderError(w, http.StatusBadRequest, "parámetro 'regimen' requerido")
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT codigo, nombre, regimen FROM eps WHERE regimen = $1 ORDER BY nombre`,
		regimen)
	if err != nil {
		log.Printf("getEps: %v", err)
		responderError(w, http.StatusInternalServerError, "error al obtener EPS")
		return
	}
	defer rows.Close()

	resultado := make([]epsEntidad, 0)
	for rows.Next() {
		var e epsEntidad
		if err := rows.Scan(&e.Codigo, &e.Nombre, &e.Regimen); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer EPS")
			return
		}
		resultado = append(resultado, e)
	}
	responderJSON(w, http.StatusOK, resultado)
}

func (h *EpsHandler) getUna(w http.ResponseWriter, r *http.Request) {
	codigo := chi.URLParam(r, "codigo")
	var e epsEntidad
	err := h.db.QueryRow(r.Context(),
		`SELECT codigo, nombre, regimen FROM eps WHERE codigo = $1 LIMIT 1`,
		codigo).Scan(&e.Codigo, &e.Nombre, &e.Regimen)
	if err != nil {
		responderError(w, http.StatusNotFound, "EPS no encontrada")
		return
	}
	responderJSON(w, http.StatusOK, e)
}
