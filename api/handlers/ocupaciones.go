package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OcupacionesHandler struct {
	db *pgxpool.Pool
}

func OcupacionesRouter(db *pgxpool.Pool) http.Handler {
	h := &OcupacionesHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.buscar)
	r.Get("/{codigo}", h.getUna)
	return r
}

type ocupacion struct {
	Codigo string `json:"codigo"`
	Nombre string `json:"nombre"`
}

// GET /ocupaciones?q=texto&limit=20
func (h *OcupacionesHandler) buscar(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	limit := 20
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	var args []any
	query := `SELECT codigo, nombre FROM ocupacion`

	if q != "" {
		args = append(args, "%"+strings.ToLower(q)+"%")
		query += ` WHERE unaccent(LOWER(nombre)) LIKE unaccent($1) OR codigo LIKE $1`
	}
	args = append(args, limit)
	query += ` ORDER BY nombre LIMIT $` + strconv.Itoa(len(args))

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		log.Printf("buscar ocupaciones: %v", err)
		responderError(w, http.StatusInternalServerError, "error al buscar ocupaciones")
		return
	}
	defer rows.Close()

	resultado := make([]ocupacion, 0)
	for rows.Next() {
		var o ocupacion
		if err := rows.Scan(&o.Codigo, &o.Nombre); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer ocupacion")
			return
		}
		resultado = append(resultado, o)
	}
	responderJSON(w, http.StatusOK, resultado)
}

func (h *OcupacionesHandler) getUna(w http.ResponseWriter, r *http.Request) {
	codigo := chi.URLParam(r, "codigo")
	var o ocupacion
	err := h.db.QueryRow(r.Context(),
		`SELECT codigo, nombre FROM ocupacion WHERE codigo = $1`, codigo).
		Scan(&o.Codigo, &o.Nombre)
	if err != nil {
		responderError(w, http.StatusNotFound, "ocupación no encontrada")
		return
	}
	responderJSON(w, http.StatusOK, o)
}
