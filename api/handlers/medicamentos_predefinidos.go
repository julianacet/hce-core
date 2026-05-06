package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MedicamentoPredefinido struct {
	ID                string  `json:"id"`
	Codigo            *string `json:"codigo"`
	Nombre            string  `json:"nombre"`
	Concentracion     *string `json:"concentracion"`
	FormaFarmaceutica *string `json:"forma_farmaceutica"`
	Tipo              string  `json:"tipo"`
}

func MedicamentosPredefinidosRouter(db *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		tipo := strings.TrimSpace(r.URL.Query().Get("tipo"))
		q := strings.TrimSpace(r.URL.Query().Get("q"))

		base := `
			SELECT id::text, codigo, nombre, concentracion, forma_farmaceutica, tipo
			FROM medicamento_predefinido
			WHERE esta_activo = TRUE`
		args := []any{}
		argIdx := 1

		if tipo == "pos" || tipo == "no_pos" {
			base += fmt.Sprintf(` AND tipo = $%d`, argIdx)
			args = append(args, tipo)
			argIdx++
		}

		if q != "" {
			base += fmt.Sprintf(` AND nombre ILIKE $%d`, argIdx)
			args = append(args, "%"+q+"%")
		}

		base += ` ORDER BY nombre LIMIT 80`

		rows, err := db.Query(r.Context(), base, args...)
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al consultar medicamentos")
			return
		}
		defer rows.Close()

		result := make([]MedicamentoPredefinido, 0)
		for rows.Next() {
			var m MedicamentoPredefinido
			if err := rows.Scan(&m.ID, &m.Codigo, &m.Nombre, &m.Concentracion, &m.FormaFarmaceutica, &m.Tipo); err != nil {
				responderError(w, http.StatusInternalServerError, "error al leer medicamento")
				return
			}
			result = append(result, m)
		}
		if rows.Err() != nil {
			responderError(w, http.StatusInternalServerError, "error al iterar medicamentos")
			return
		}

		responderJSON(w, http.StatusOK, result)
	})
	return r
}
