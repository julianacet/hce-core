package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"hce/api/models"
)

type CupsHandler struct {
	db *pgxpool.Pool
}

func CupsRouter(db *pgxpool.Pool) http.Handler {
	h := &CupsHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.buscar)
	return r
}

// GET /cups?q=texto&limit=20
func (h *CupsHandler) buscar(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	limit := 20
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	var args []any
	query := `SELECT codigo, descripcion FROM cups_codigo WHERE esta_activo = TRUE`

	if q != "" {
		args = append(args, "%"+strings.ToLower(q)+"%")
		query += ` AND (LOWER(codigo) LIKE $1 OR unaccent(LOWER(descripcion)) LIKE unaccent($1))`
	}
	args = append(args, limit)
	query += ` ORDER BY codigo LIMIT $` + strconv.Itoa(len(args))

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		log.Printf("buscar cups: %v", err)
		responderError(w, http.StatusInternalServerError, "error al buscar CUPS")
		return
	}
	defer rows.Close()

	resultados := make([]models.CupsCodigo, 0)
	for rows.Next() {
		var c models.CupsCodigo
		if err := rows.Scan(&c.Codigo, &c.Descripcion); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer CUPS")
			return
		}
		resultados = append(resultados, c)
	}

	responderJSON(w, http.StatusOK, resultados)
}
