package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
)

type ExamenPredefinido struct {
	ID         int     `json:"id"`
	Nombre     string  `json:"nombre"`
	CodigoCups *string `json:"codigo_cups"`
	Categoria  string  `json:"categoria"`
	EstaActivo bool    `json:"esta_activo"`
}

type ExamenPredefinidoInput struct {
	Nombre     string  `json:"nombre"`
	CodigoCups *string `json:"codigo_cups"`
	Categoria  string  `json:"categoria"`
}

var categoriasExamen = map[string]bool{
	"laboratorio": true,
	"imagen":      true,
	"patologia":   true,
	"otro":        true,
}

func ExamenesPredefinidosRouter(db *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()
	h := &examenesPredefinidosHandler{db: db}

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Put("/{id}", h.actualizar)
	r.Patch("/{id}/toggle", h.toggle)
	r.Delete("/{id}", h.eliminar)

	return r
}

type examenesPredefinidosHandler struct{ db *pgxpool.Pool }

const colsExamen = `id, nombre, codigo_cups, categoria, esta_activo`

func (h *examenesPredefinidosHandler) listar(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	categoria := r.URL.Query().Get("categoria")
	todos := r.URL.Query().Get("todos") == "1"

	query := `SELECT ` + colsExamen + ` FROM examen_predefinido WHERE 1=1`
	args := []any{}
	n := 1

	if !todos {
		query += ` AND esta_activo = TRUE`
	}
	if q != "" {
		args = append(args, "%"+strings.ToLower(q)+"%")
		query += ` AND LOWER(nombre) LIKE $` + strconv.Itoa(n)
		n++
	}
	if categoria != "" {
		args = append(args, categoria)
		query += ` AND categoria = $` + strconv.Itoa(n)
	}
	query += ` ORDER BY categoria, nombre LIMIT 80`

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al consultar exámenes")
		return
	}
	defer rows.Close()

	examenes := []ExamenPredefinido{}
	for rows.Next() {
		var e ExamenPredefinido
		if err := rows.Scan(&e.ID, &e.Nombre, &e.CodigoCups, &e.Categoria, &e.EstaActivo); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer examen")
			return
		}
		examenes = append(examenes, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(examenes)
}

func (h *examenesPredefinidosHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" && u.Rol != "medico" {
		responderError(w, http.StatusForbidden, "solo el administrador puede crear exámenes")
		return
	}
	var input ExamenPredefinidoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if strings.TrimSpace(input.Nombre) == "" {
		responderError(w, http.StatusBadRequest, "el nombre es obligatorio")
		return
	}
	if !categoriasExamen[input.Categoria] {
		responderError(w, http.StatusBadRequest, "categoría inválida")
		return
	}

	var e ExamenPredefinido
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO examen_predefinido (nombre, codigo_cups, categoria)
		 VALUES ($1, $2, $3) RETURNING `+colsExamen,
		strings.TrimSpace(input.Nombre), input.CodigoCups, input.Categoria,
	).Scan(&e.ID, &e.Nombre, &e.CodigoCups, &e.Categoria, &e.EstaActivo)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al crear examen")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(e)
}

func (h *examenesPredefinidosHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" && u.Rol != "medico" {
		responderError(w, http.StatusForbidden, "solo el administrador puede editar exámenes")
		return
	}
	id := chi.URLParam(r, "id")
	var input ExamenPredefinidoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if strings.TrimSpace(input.Nombre) == "" {
		responderError(w, http.StatusBadRequest, "el nombre es obligatorio")
		return
	}
	if !categoriasExamen[input.Categoria] {
		responderError(w, http.StatusBadRequest, "categoría inválida")
		return
	}

	var e ExamenPredefinido
	err := h.db.QueryRow(r.Context(),
		`UPDATE examen_predefinido SET nombre=$1, codigo_cups=$2, categoria=$3
		 WHERE id=$4 RETURNING `+colsExamen,
		strings.TrimSpace(input.Nombre), input.CodigoCups, input.Categoria, id,
	).Scan(&e.ID, &e.Nombre, &e.CodigoCups, &e.Categoria, &e.EstaActivo)
	if err != nil {
		responderError(w, http.StatusNotFound, "examen no encontrado")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(e)
}

func (h *examenesPredefinidosHandler) toggle(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" && u.Rol != "medico" {
		responderError(w, http.StatusForbidden, "solo el administrador puede modificar exámenes")
		return
	}
	id := chi.URLParam(r, "id")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE examen_predefinido SET esta_activo = NOT esta_activo WHERE id=$1 RETURNING esta_activo`, id,
	).Scan(&activo)
	if err != nil {
		responderError(w, http.StatusNotFound, "examen no encontrado")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"esta_activo": activo})
}

func (h *examenesPredefinidosHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" && u.Rol != "medico" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar exámenes")
		return
	}
	id := chi.URLParam(r, "id")
	tag, err := h.db.Exec(r.Context(), `DELETE FROM examen_predefinido WHERE id=$1`, id)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al eliminar")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "examen no encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

