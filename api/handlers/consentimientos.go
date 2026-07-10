package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

type ConsentimientoHandler struct {
	db *pgxpool.Pool
}

var reEtiquetaHTML = regexp.MustCompile(`<[^>]*>`)

// El editor de plantillas guarda el contenido como HTML; un documento "vacío"
// para Tiptap luce como "<p></p>", que TrimSpace por sí solo no detecta.
func htmlEstaVacio(contenido string) bool {
	return strings.TrimSpace(reEtiquetaHTML.ReplaceAllString(contenido, "")) == ""
}

// PlantillasRouter — montado en /consentimientos/plantillas.
// Listar queda disponible para cualquier usuario autenticado (se necesita para
// generar consentimientos); crear/editar/activar/eliminar requiere admin o médico.
func PlantillasRouter(db *pgxpool.Pool) http.Handler {
	h := &ConsentimientoHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.listarPlantillas)
	r.Group(func(r chi.Router) {
		r.Use(appmiddleware.RequiereRol("medico"))
		r.Post("/", h.crearPlantilla)
		r.Put("/{plantillaId}", h.actualizarPlantilla)
		r.Patch("/{plantillaId}/toggle", h.togglePlantilla)
		r.Delete("/{plantillaId}", h.eliminarPlantilla)
	})
	return r
}

// ConsentimientoGeneradoRouter — montado en /consentimientos/generados
func ConsentimientoGeneradoRouter(db *pgxpool.Pool) http.Handler {
	h := &ConsentimientoHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.listarConsentimientos)
	r.Post("/", h.generarConsentimiento)
	r.Patch("/{id}/firmar", h.firmarConsentimiento)
	return r
}

const scanConsentimiento = `
	SELECT cg.id, cg.encuentro_id, cg.plantilla_id, cg.plantilla_nombre,
	       cg.paciente_documento, cg.paciente_nombre, cg.tipo_documento,
	       cg.contenido_renderizado, cg.firmado, cg.fecha_firma, cg.firmado_por,
	       cg.fecha_generacion, cg.creado_por
	FROM consentimiento_generado cg`

func scanearConsentimiento(row interface {
	Scan(...any) error
}) (models.ConsentimientoGenerado, error) {
	var c models.ConsentimientoGenerado
	err := row.Scan(
		&c.ID, &c.EncuentroID, &c.PlantillaID, &c.PlantillaNombre,
		&c.PacienteDocumento, &c.PacienteNombre, &c.TipoDocumento,
		&c.ContenidoRenderizado, &c.Firmado, &c.FechaFirma, &c.FirmadoPor,
		&c.FechaGeneracion, &c.CreadoPor,
	)
	return c, err
}

// ── Plantillas ────────────────────────────────────────────────────────────────

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
	if strings.TrimSpace(input.Nombre) == "" || htmlEstaVacio(input.Contenido) {
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
	if strings.TrimSpace(input.Nombre) == "" || htmlEstaVacio(input.Contenido) {
		responderError(w, http.StatusBadRequest, "nombre y contenido son obligatorios")
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

// PATCH /consentimientos/plantillas/:plantillaId/toggle
func (h *ConsentimientoHandler) togglePlantilla(w http.ResponseWriter, r *http.Request) {
	plantillaID := chi.URLParam(r, "plantillaId")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE plantilla_consentimiento SET esta_activo = NOT esta_activo WHERE id=$1 RETURNING esta_activo`,
		plantillaID,
	).Scan(&activo)
	if err != nil {
		responderError(w, http.StatusNotFound, "plantilla no encontrada")
		return
	}
	responderJSON(w, http.StatusOK, map[string]bool{"esta_activo": activo})
}

// DELETE /consentimientos/plantillas/:plantillaId
func (h *ConsentimientoHandler) eliminarPlantilla(w http.ResponseWriter, r *http.Request) {
	plantillaID := chi.URLParam(r, "plantillaId")
	tag, err := h.db.Exec(r.Context(),
		`DELETE FROM plantilla_consentimiento WHERE id=$1`, plantillaID)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al eliminar plantilla")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "plantilla no encontrada")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Consentimientos standalone ────────────────────────────────────────────────

// GET /consentimientos/generados?q=&page=1&limit=20&orden=fecha&dir=desc
func (h *ConsentimientoHandler) listarConsentimientos(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	ordenParam := r.URL.Query().Get("orden")
	dirParam := strings.ToUpper(r.URL.Query().Get("dir"))
	if dirParam != "ASC" && dirParam != "DESC" {
		dirParam = "DESC"
	}
	var orderBy string
	switch ordenParam {
	case "paciente":
		orderBy = "cg.paciente_nombre " + dirParam
	case "plantilla":
		orderBy = "cg.plantilla_nombre " + dirParam + " NULLS LAST"
	case "estado":
		orderBy = "cg.firmado " + dirParam
	default:
		orderBy = "cg.fecha_generacion " + dirParam
	}

	var args argList
	where := "WHERE 1=1"
	if q != "" {
		like := args.Add("%" + q + "%")
		where += ` AND (cg.paciente_documento ILIKE ` + like + ` OR cg.paciente_nombre ILIKE ` + like + `)`
	}

	var total int
	if err := h.db.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM consentimiento_generado cg `+where,
		args.Slice()...,
	).Scan(&total); err != nil {
		log.Printf("listar consentimientos count: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar")
		return
	}

	query := scanConsentimiento + ` ` + where +
		` ORDER BY ` + orderBy +
		` LIMIT ` + args.Add(limit) +
		` OFFSET ` + args.Add(offset)

	rows, err := h.db.Query(r.Context(), query, args.Slice()...)
	if err != nil {
		log.Printf("listar consentimientos: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar")
		return
	}
	defer rows.Close()

	result := make([]models.ConsentimientoGenerado, 0)
	for rows.Next() {
		c, err := scanearConsentimiento(rows)
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer")
			return
		}
		result = append(result, c)
	}
	responderJSON(w, http.StatusOK, map[string]any{
		"consentimientos": result,
		"total":           total,
	})
}

// POST /consentimientos/generados
func (h *ConsentimientoHandler) generarConsentimiento(w http.ResponseWriter, r *http.Request) {
	var input models.ConsentimientoStandaloneInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if strings.TrimSpace(input.PacienteDocumento) == "" || htmlEstaVacio(input.ContenidoRenderizado) {
		responderError(w, http.StatusBadRequest, "paciente_documento y contenido_renderizado son obligatorios")
		return
	}

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	var plantillaID *string
	var plantillaNombre *string
	if input.PlantillaID != "" {
		plantillaID = &input.PlantillaID
		var nombre string
		if err := h.db.QueryRow(r.Context(),
			`SELECT nombre FROM plantilla_consentimiento WHERE id = $1`, *plantillaID,
		).Scan(&nombre); err != nil {
			responderError(w, http.StatusNotFound, "plantilla no encontrada")
			return
		}
		plantillaNombre = &nombre
	}

	// El nombre de la plantilla se congela aquí (igual que contenido_renderizado):
	// si luego la plantilla se renombra o se borra, este consentimiento no cambia.
	var c models.ConsentimientoGenerado
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO consentimiento_generado
		  (plantilla_id, plantilla_nombre, paciente_documento, paciente_nombre, tipo_documento, contenido_renderizado, creado_por)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, encuentro_id, plantilla_id, plantilla_nombre,
		          paciente_documento, paciente_nombre, tipo_documento,
		          contenido_renderizado, firmado, fecha_firma, firmado_por,
		          fecha_generacion, creado_por`,
		plantillaID, plantillaNombre, input.PacienteDocumento, input.PacienteNombre,
		input.TipoDocumento, input.ContenidoRenderizado, u.Nombre,
	).Scan(
		&c.ID, &c.EncuentroID, &c.PlantillaID, &c.PlantillaNombre,
		&c.PacienteDocumento, &c.PacienteNombre, &c.TipoDocumento,
		&c.ContenidoRenderizado, &c.Firmado, &c.FechaFirma, &c.FirmadoPor,
		&c.FechaGeneracion, &c.CreadoPor,
	)
	if err != nil {
		log.Printf("generar consentimiento: %v", err)
		responderError(w, http.StatusInternalServerError, "error al generar consentimiento")
		return
	}
	responderJSON(w, http.StatusCreated, c)
}

// PATCH /consentimientos/generados/:id/firmar
func (h *ConsentimientoHandler) firmarConsentimiento(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u := appmiddleware.UsuarioDesdeContexto(r.Context())

	row := h.db.QueryRow(r.Context(), `
		UPDATE consentimiento_generado
		SET firmado = TRUE, fecha_firma = NOW(), firmado_por = $1
		WHERE id = $2
		RETURNING id, encuentro_id, plantilla_id, plantilla_nombre,
		          paciente_documento, paciente_nombre, tipo_documento,
		          contenido_renderizado, firmado, fecha_firma, firmado_por,
		          fecha_generacion, creado_por`,
		u.Nombre, id,
	)
	c, err := scanearConsentimiento(row)
	if err != nil {
		responderError(w, http.StatusNotFound, "consentimiento no encontrado")
		return
	}
	responderJSON(w, http.StatusOK, c)
}
