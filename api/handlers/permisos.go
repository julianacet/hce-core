package handlers

import (
	"net/http"
	"slices"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"hce/api/permisos"
)

type permisosHandler struct{ db *pgxpool.Pool }

var rolesAsignables = []string{"medico", "recepcionista", "enfermeria", "facturador", "farmacia"}

func PermisosRouter(db *pgxpool.Pool) http.Handler {
	h := &permisosHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.matriz)
	r.Put("/{recurso}/{rol}", h.crear)
	r.Delete("/{recurso}/{rol}", h.eliminar)
	return r
}

// GET /permisos
func (h *permisosHandler) matriz(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), "SELECT rol, recurso FROM rol_permiso")
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al leer permisos")
		return
	}
	defer rows.Close()

	asignaciones := make(map[string][]string)
	for rows.Next() {
		var rol, recurso string
		if err := rows.Scan(&rol, &recurso); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer permisos")
			return
		}
		asignaciones[recurso] = append(asignaciones[recurso], rol)
	}

	responderJSON(w, http.StatusOK, map[string]any{
		"roles":        rolesAsignables,
		"recursos":     permisos.Catalogo(),
		"asignaciones": asignaciones,
	})
}

type permisoInput struct {
	Rol     string `json:"rol"`
	Recurso string `json:"recurso"`
}

func (input permisoInput) validar() (mensaje string, ok bool) {
	if !slices.Contains(permisos.Catalogo(), input.Recurso) {
		return "recurso desconocido", false
	}
	if !slices.Contains(rolesAsignables, input.Rol) {
		return "rol inválido", false
	}
	return "", true
}

// PUT /permisos/{recurso}/{rol} — otorga un recurso a un rol. Idempotente:
// llamarlo varias veces deja el mismo estado (ON CONFLICT DO NOTHING).
func (h *permisosHandler) crear(w http.ResponseWriter, r *http.Request) {
	input := permisoInput{Recurso: chi.URLParam(r, "recurso"), Rol: chi.URLParam(r, "rol")}
	if mensaje, ok := input.validar(); !ok {
		responderError(w, http.StatusBadRequest, mensaje)
		return
	}

	if _, err := h.db.Exec(r.Context(),
		`INSERT INTO rol_permiso (rol, recurso) VALUES ($1, $2) ON CONFLICT (rol, recurso) DO NOTHING`,
		input.Rol, input.Recurso,
	); err != nil {
		responderError(w, http.StatusInternalServerError, "error al guardar el permiso")
		return
	}

	if err := permisos.Recargar(r.Context()); err != nil {
		responderError(w, http.StatusInternalServerError, "permiso guardado, pero falló recargar la caché")
		return
	}

	responderJSON(w, http.StatusOK, input)
}

// DELETE /permisos/{recurso}/{rol} — revoca un recurso de un rol.
func (h *permisosHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	input := permisoInput{Recurso: chi.URLParam(r, "recurso"), Rol: chi.URLParam(r, "rol")}
	if mensaje, ok := input.validar(); !ok {
		responderError(w, http.StatusBadRequest, mensaje)
		return
	}

	if _, err := h.db.Exec(r.Context(),
		`DELETE FROM rol_permiso WHERE rol=$1 AND recurso=$2`,
		input.Rol, input.Recurso,
	); err != nil {
		responderError(w, http.StatusInternalServerError, "error al eliminar el permiso")
		return
	}

	if err := permisos.Recargar(r.Context()); err != nil {
		responderError(w, http.StatusInternalServerError, "permiso eliminado, pero falló recargar la caché")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
