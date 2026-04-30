package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

type ConsentimientoHandler struct {
	db *pgxpool.Pool
}

// PlantillasRouter — montado en /consentimientos/plantillas
func PlantillasRouter(db *pgxpool.Pool) http.Handler {
	h := &ConsentimientoHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.listarPlantillas)
	r.Post("/", h.crearPlantilla)
	r.Put("/{plantillaId}", h.actualizarPlantilla)
	r.Delete("/{plantillaId}", h.desactivarPlantilla)
	return r
}

// ConsentimientoEncuentroRouter — montado bajo /{encuentroId}/consentimiento
func ConsentimientoEncuentroRouter(db *pgxpool.Pool) http.Handler {
	h := &ConsentimientoHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.obtenerConsentimiento)
	r.Post("/", h.registrarConsentimiento)
	return r
}

// GET /consentimientos/plantillas
func (h *ConsentimientoHandler) listarPlantillas(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT id, nombre, contenido, esta_activo, fecha_creacion, creado_por
		FROM plantilla_consentimiento
		ORDER BY esta_activo DESC, fecha_creacion ASC`)
	if err != nil {
		log.Printf("listar plantillas: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar plantillas")
		return
	}
	defer rows.Close()

	plantillas := make([]models.PlantillaConsentimiento, 0)
	for rows.Next() {
		var p models.PlantillaConsentimiento
		if err := rows.Scan(&p.ID, &p.Nombre, &p.Contenido, &p.EstaActivo, &p.FechaCreacion, &p.CreadoPor); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer plantilla")
			return
		}
		plantillas = append(plantillas, p)
	}
	responderJSON(w, http.StatusOK, plantillas)
}

// POST /consentimientos/plantillas
func (h *ConsentimientoHandler) crearPlantilla(w http.ResponseWriter, r *http.Request) {
	var input models.PlantillaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if strings.TrimSpace(input.Nombre) == "" || strings.TrimSpace(input.Contenido) == "" {
		responderError(w, http.StatusBadRequest, "nombre y contenido son obligatorios")
		return
	}

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	var p models.PlantillaConsentimiento
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO plantilla_consentimiento (nombre, contenido, creado_por)
		VALUES ($1, $2, $3)
		RETURNING id, nombre, contenido, esta_activo, fecha_creacion, creado_por`,
		input.Nombre, input.Contenido, u.Nombre,
	).Scan(&p.ID, &p.Nombre, &p.Contenido, &p.EstaActivo, &p.FechaCreacion, &p.CreadoPor)
	if err != nil {
		log.Printf("crear plantilla: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear plantilla")
		return
	}
	responderJSON(w, http.StatusCreated, p)
}

// PUT /consentimientos/plantillas/:plantillaId
func (h *ConsentimientoHandler) actualizarPlantilla(w http.ResponseWriter, r *http.Request) {
	plantillaID := chi.URLParam(r, "plantillaId")
	var input models.PlantillaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}

	var p models.PlantillaConsentimiento
	err := h.db.QueryRow(r.Context(), `
		UPDATE plantilla_consentimiento
		SET nombre = $1, contenido = $2
		WHERE id = $3
		RETURNING id, nombre, contenido, esta_activo, fecha_creacion, creado_por`,
		input.Nombre, input.Contenido, plantillaID,
	).Scan(&p.ID, &p.Nombre, &p.Contenido, &p.EstaActivo, &p.FechaCreacion, &p.CreadoPor)
	if err != nil {
		responderError(w, http.StatusNotFound, "plantilla no encontrada")
		return
	}
	responderJSON(w, http.StatusOK, p)
}

// DELETE /consentimientos/plantillas/:plantillaId  (soft delete)
func (h *ConsentimientoHandler) desactivarPlantilla(w http.ResponseWriter, r *http.Request) {
	plantillaID := chi.URLParam(r, "plantillaId")
	_, err := h.db.Exec(r.Context(), `
		UPDATE plantilla_consentimiento SET esta_activo = FALSE WHERE id = $1`,
		plantillaID,
	)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al desactivar plantilla")
		return
	}
	responderJSON(w, http.StatusOK, map[string]string{"mensaje": "plantilla desactivada"})
}

// GET /pacientes/:doc/encuentros/:encId/consentimiento
func (h *ConsentimientoHandler) obtenerConsentimiento(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")

	var c models.ConsentimientoGenerado
	err := h.db.QueryRow(r.Context(), `
		SELECT id, encuentro_id, plantilla_id, paciente_documento,
		       contenido_renderizado, fecha_generacion, creado_por
		FROM consentimiento_generado
		WHERE encuentro_id = $1
		ORDER BY fecha_generacion DESC LIMIT 1`,
		encuentroID,
	).Scan(&c.ID, &c.EncuentroID, &c.PlantillaID, &c.PacienteDocumento,
		&c.ContenidoRenderizado, &c.FechaGeneracion, &c.CreadoPor)
	if err != nil {
		responderError(w, http.StatusNotFound, "sin consentimiento generado")
		return
	}
	responderJSON(w, http.StatusOK, c)
}

// POST /pacientes/:doc/encuentros/:encId/consentimiento
func (h *ConsentimientoHandler) registrarConsentimiento(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")
	encuentroID := chi.URLParam(r, "encuentroId")

	var input models.ConsentimientoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	var plantillaID *string
	if input.PlantillaID != "" {
		plantillaID = &input.PlantillaID
	}

	var c models.ConsentimientoGenerado
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO consentimiento_generado
		  (encuentro_id, plantilla_id, paciente_documento, contenido_renderizado, creado_por)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, encuentro_id, plantilla_id, paciente_documento,
		          contenido_renderizado, fecha_generacion, creado_por`,
		encuentroID, plantillaID, documento, input.ContenidoRenderizado, u.Nombre,
	).Scan(&c.ID, &c.EncuentroID, &c.PlantillaID, &c.PacienteDocumento,
		&c.ContenidoRenderizado, &c.FechaGeneracion, &c.CreadoPor)
	if err != nil {
		log.Printf("registrar consentimiento: %v", err)
		responderError(w, http.StatusInternalServerError, "error al registrar consentimiento")
		return
	}
	responderJSON(w, http.StatusCreated, c)
}
