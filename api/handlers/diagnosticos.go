package handlers

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"hce/api/models"
)

func DiagnosticosRouter(db *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		q := strings.TrimSpace(r.URL.Query().Get("q"))
		if q == "" {
			responderJSON(w, http.StatusOK, []models.DiagnosticoCIE10{})
			return
		}
		pattern := "%" + strings.ToLower(q) + "%"
		rows, err := db.Query(r.Context(),
			`SELECT codigo, nombre FROM diagnostico_cie10
			 WHERE LOWER(codigo) LIKE $1 OR LOWER(nombre) LIKE $1
			 ORDER BY
			   CASE WHEN LOWER(codigo) = LOWER($2) THEN 0
			        WHEN LOWER(codigo) LIKE $1       THEN 1
			        ELSE 2 END,
			   nombre
			 LIMIT 20`,
			pattern, q,
		)
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al buscar diagnósticos")
			return
		}
		defer rows.Close()
		resultados := make([]models.DiagnosticoCIE10, 0)
		for rows.Next() {
			var d models.DiagnosticoCIE10
			if err := rows.Scan(&d.Codigo, &d.Nombre); err != nil {
				continue
			}
			resultados = append(resultados, d)
		}
		responderJSON(w, http.StatusOK, resultados)
	})
	return r
}
