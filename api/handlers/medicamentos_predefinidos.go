package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
)

type MedicamentoPredefinido struct {
	ID                string  `json:"id"`
	Codigo            *string `json:"codigo"`
	Nombre            string  `json:"nombre"`
	Concentracion     *string `json:"concentracion"`
	FormaFarmaceutica *string `json:"forma_farmaceutica"`
	Tipo              string  `json:"tipo"`
	EstaActivo        bool    `json:"esta_activo"`
}

type MedicamentoPredefinidoInput struct {
	Codigo            *string `json:"codigo"`
	Nombre            string  `json:"nombre"`
	Concentracion     *string `json:"concentracion"`
	FormaFarmaceutica *string `json:"forma_farmaceutica"`
	Tipo              string  `json:"tipo"`
}

const colsMed = `id::text, codigo, nombre, concentracion, forma_farmaceutica, tipo, esta_activo`

func MedicamentosPredefinidosRouter(db *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()
	h := &medicamentosHandler{db: db}

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Put("/{id}", h.actualizar)
	r.Patch("/{id}/toggle", h.toggle)
	r.Delete("/{id}", h.eliminar)

	return r
}

type medicamentosHandler struct{ db *pgxpool.Pool }

func (h *medicamentosHandler) listar(w http.ResponseWriter, r *http.Request) {
	tipo := strings.TrimSpace(r.URL.Query().Get("tipo"))
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	soloActivos := r.URL.Query().Get("todos") != "1"

	base := `SELECT ` + colsMed + ` FROM medicamento_predefinido WHERE 1=1`
	args := []any{}
	argIdx := 1

	if soloActivos {
		base += ` AND esta_activo = TRUE`
	}
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

	rows, err := h.db.Query(r.Context(), base, args...)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al consultar medicamentos")
		return
	}
	defer rows.Close()

	result := make([]MedicamentoPredefinido, 0)
	for rows.Next() {
		var m MedicamentoPredefinido
		if err := rows.Scan(&m.ID, &m.Codigo, &m.Nombre, &m.Concentracion, &m.FormaFarmaceutica, &m.Tipo, &m.EstaActivo); err != nil {
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
}

func (h *medicamentosHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede crear medicamentos")
		return
	}

	var inp MedicamentoPredefinidoInput
	if err := json.NewDecoder(r.Body).Decode(&inp); err != nil {
		responderError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	if strings.TrimSpace(inp.Nombre) == "" {
		responderError(w, http.StatusBadRequest, "el nombre es obligatorio")
		return
	}
	if inp.Tipo != "pos" && inp.Tipo != "no_pos" {
		responderError(w, http.StatusBadRequest, "tipo debe ser 'pos' o 'no_pos'")
		return
	}

	var m MedicamentoPredefinido
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO medicamento_predefinido (codigo, nombre, concentracion, forma_farmaceutica, tipo)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING `+colsMed,
		inp.Codigo, strings.TrimSpace(inp.Nombre), inp.Concentracion, inp.FormaFarmaceutica, inp.Tipo,
	).Scan(&m.ID, &m.Codigo, &m.Nombre, &m.Concentracion, &m.FormaFarmaceutica, &m.Tipo, &m.EstaActivo)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al crear medicamento")
		return
	}

	responderJSON(w, http.StatusCreated, m)
}

func (h *medicamentosHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede editar medicamentos")
		return
	}

	id := chi.URLParam(r, "id")
	var inp MedicamentoPredefinidoInput
	if err := json.NewDecoder(r.Body).Decode(&inp); err != nil {
		responderError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	if strings.TrimSpace(inp.Nombre) == "" {
		responderError(w, http.StatusBadRequest, "el nombre es obligatorio")
		return
	}
	if inp.Tipo != "pos" && inp.Tipo != "no_pos" {
		responderError(w, http.StatusBadRequest, "tipo debe ser 'pos' o 'no_pos'")
		return
	}

	var m MedicamentoPredefinido
	err := h.db.QueryRow(r.Context(),
		`UPDATE medicamento_predefinido
		 SET codigo=$1, nombre=$2, concentracion=$3, forma_farmaceutica=$4, tipo=$5
		 WHERE id=$6
		 RETURNING `+colsMed,
		inp.Codigo, strings.TrimSpace(inp.Nombre), inp.Concentracion, inp.FormaFarmaceutica, inp.Tipo, id,
	).Scan(&m.ID, &m.Codigo, &m.Nombre, &m.Concentracion, &m.FormaFarmaceutica, &m.Tipo, &m.EstaActivo)
	if err != nil {
		responderError(w, http.StatusNotFound, "medicamento no encontrado")
		return
	}

	responderJSON(w, http.StatusOK, m)
}

func (h *medicamentosHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar medicamentos")
		return
	}

	id := chi.URLParam(r, "id")
	tag, err := h.db.Exec(r.Context(), `DELETE FROM medicamento_predefinido WHERE id=$1`, id)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al eliminar medicamento")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "medicamento no encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *medicamentosHandler) toggle(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede activar o desactivar medicamentos")
		return
	}

	id := chi.URLParam(r, "id")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE medicamento_predefinido SET esta_activo = NOT esta_activo WHERE id=$1 RETURNING esta_activo`,
		id,
	).Scan(&activo)
	if err != nil {
		responderError(w, http.StatusNotFound, "medicamento no encontrado")
		return
	}

	responderJSON(w, http.StatusOK, map[string]bool{"esta_activo": activo})
}
