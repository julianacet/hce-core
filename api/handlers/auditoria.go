package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"hce/api/models"
)

type AuditoriaHandler struct {
	db *pgxpool.Pool
}

func AuditoriaRouter(db *pgxpool.Pool) http.Handler {
	h := &AuditoriaHandler{db: db}
	r := chi.NewRouter()

	r.Get("/", h.general)
	r.Get("/paciente/{documento}", h.porPaciente)
	r.Get("/encuentro/{encuentroId}", h.porEncuentro)

	return r
}

// GET /auditoria?limit=50&offset=0
func (h *AuditoriaHandler) general(w http.ResponseWriter, r *http.Request) {
	limit, offset := paginacion(r)

	rows, err := h.db.Query(r.Context(), `
		SELECT id, nombre_tabla, registro_id, accion,
		       datos_anteriores::text, datos_nuevos::text,
		       usuario_id, fecha_cambio
		FROM log_auditoria
		ORDER BY fecha_cambio DESC
		LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		log.Printf("auditoria general: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar auditoría")
		return
	}
	defer rows.Close()

	responderJSON(w, http.StatusOK, escanearLogs(rows, w))
}

// GET /auditoria/paciente/{documento}
// Devuelve todos los registros relacionados con las filas del paciente.
func (h *AuditoriaHandler) porPaciente(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")
	limit, offset := paginacion(r)

	rows, err := h.db.Query(r.Context(), `
		SELECT l.id, l.nombre_tabla, l.registro_id, l.accion,
		       l.datos_anteriores::text, l.datos_nuevos::text,
		       l.usuario_id, l.fecha_cambio
		FROM log_auditoria l
		WHERE (
			-- Cambios directos en el paciente
			(l.nombre_tabla = 'paciente' AND (l.datos_nuevos->>'numero_documento' = $1 OR l.datos_anteriores->>'numero_documento' = $1))
			OR
			-- Cambios en encuentros del paciente
			(l.nombre_tabla = 'encuentro_clinico' AND (l.datos_nuevos->>'paciente_documento' = $1 OR l.datos_anteriores->>'paciente_documento' = $1))
			OR
			-- Cambios en fórmulas de encuentros del paciente
			(l.nombre_tabla = 'formula_medica' AND l.registro_id IN (
				SELECT id FROM formula_medica fm
				JOIN encuentro_clinico ec ON fm.encuentro_id = ec.encuentro_id
				WHERE ec.paciente_documento = $1
			))
		)
		ORDER BY l.fecha_cambio DESC
		LIMIT $2 OFFSET $3`,
		documento, limit, offset,
	)
	if err != nil {
		log.Printf("auditoria por paciente: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar auditoría")
		return
	}
	defer rows.Close()

	responderJSON(w, http.StatusOK, escanearLogs(rows, w))
}

// GET /auditoria/encuentro/{encuentroId}
func (h *AuditoriaHandler) porEncuentro(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")
	limit, offset := paginacion(r)

	rows, err := h.db.Query(r.Context(), `
		SELECT l.id, l.nombre_tabla, l.registro_id, l.accion,
		       l.datos_anteriores::text, l.datos_nuevos::text,
		       l.usuario_id, l.fecha_cambio
		FROM log_auditoria l
		WHERE (
			(l.nombre_tabla = 'encuentro_clinico' AND (l.datos_nuevos->>'encuentro_id' = $1 OR l.datos_anteriores->>'encuentro_id' = $1))
			OR
			(l.nombre_tabla = 'formula_medica' AND (l.datos_nuevos->>'encuentro_id' = $1 OR l.datos_anteriores->>'encuentro_id' = $1))
		)
		ORDER BY l.fecha_cambio DESC
		LIMIT $2 OFFSET $3`,
		encuentroID, limit, offset,
	)
	if err != nil {
		log.Printf("auditoria por encuentro: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar auditoría")
		return
	}
	defer rows.Close()

	responderJSON(w, http.StatusOK, escanearLogs(rows, w))
}

// ── helpers ──────────────────────────────────────────────────────────────────

func escanearLogs(rows interface {
	Next() bool
	Scan(...any) error
	Err() error
}, w http.ResponseWriter) []models.LogAuditoria {
	logs := make([]models.LogAuditoria, 0)
	for rows.Next() {
		var l models.LogAuditoria
		var datosAnt, datosNuev *string
		if err := rows.Scan(
			&l.ID, &l.NombreTabla, &l.RegistroID, &l.Accion,
			&datosAnt, &datosNuev,
			&l.UsuarioID, &l.FechaCambio,
		); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer log")
			return nil
		}
		l.DatosAnteriores = datosAnt
		l.DatosNuevos = datosNuev
		logs = append(logs, l)
	}
	return logs
}

func paginacion(r *http.Request) (limit, offset int) {
	limit = 50
	offset = 0
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}
	return

}

// evitar que el compilador se queje del import no usado
var _ = json.Marshal
