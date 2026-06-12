package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type farmaciaMedicamentosHandler struct{ db *pgxpool.Pool }

func FarmaciaMedicamentosRouter(db *pgxpool.Pool) http.Handler {
	h := &farmaciaMedicamentosHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.listar)
	return r
}

// GET /api/farmacia/medicamentos?q=texto&tipo=pos|no_pos
func (h *farmaciaMedicamentosHandler) listar(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	tipo := r.URL.Query().Get("tipo")

	query := `
		SELECT id, COALESCE(codigo,''), nombre,
		       COALESCE(concentracion,''), COALESCE(forma_farmaceutica,''), tipo
		FROM medicamento_predefinido
		WHERE esta_activo = TRUE`
	args := []any{}

	if q != "" {
		args = append(args, prepBusquedaMed(q))
		query += fmt.Sprintf(` AND unaccent(nombre) ILIKE unaccent($%d)`, len(args))
	}
	if tipo == "pos" || tipo == "no_pos" {
		args = append(args, tipo)
		query += fmt.Sprintf(` AND tipo = $%d`, len(args))
	}

	query += ` ORDER BY nombre LIMIT 50`

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		log.Printf("farmacia listar medicamentos: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar medicamentos")
		return
	}
	defer rows.Close()

	type Medicamento struct {
		ID                int    `json:"id"`
		Codigo            string `json:"codigo"`
		Nombre            string `json:"nombre"`
		Concentracion     string `json:"concentracion"`
		FormaFarmaceutica string `json:"forma_farmaceutica"`
		Tipo              string `json:"tipo"`
	}

	lista := []Medicamento{}
	for rows.Next() {
		var m Medicamento
		if err := rows.Scan(&m.ID, &m.Codigo, &m.Nombre, &m.Concentracion, &m.FormaFarmaceutica, &m.Tipo); err != nil {
			log.Printf("farmacia escanear medicamento: %v", err)
			continue
		}
		lista = append(lista, m)
	}

	responderJSON(w, http.StatusOK, lista)
}
