package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"hce/api/models"
)

type AntecedentesHandler struct {
	db *pgxpool.Pool
}

// AntecedentesRouter handles patient-facing routes under /pacientes/{documento}/antecedentes.
func AntecedentesRouter(db *pgxpool.Pool) http.Handler {
	h := &AntecedentesHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.obtenerConRespuestas)
	r.Put("/", h.guardarRespuestas)
	return r
}

// PreguntasAntecedentesRouter handles admin CRUD under /antecedentes/preguntas.
func PreguntasAntecedentesRouter(db *pgxpool.Pool) http.Handler {
	h := &AntecedentesHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.listarPreguntas)
	r.Post("/", h.crearPregunta)
	r.Put("/{id}", h.actualizarPregunta)
	r.Patch("/{id}/toggle", h.togglePregunta)
	r.Delete("/{id}", h.eliminarPregunta)
	return r
}

// ── Patient routes ────────────────────────────────────────────────────────────

// GET /pacientes/{documento}/antecedentes
// Returns all active questions grouped by category, with the patient's answers merged in.
func (h *AntecedentesHandler) obtenerConRespuestas(w http.ResponseWriter, r *http.Request) {
	doc := chi.URLParam(r, "documento")
	rows, err := h.db.Query(r.Context(), `
		SELECT p.id, p.categoria, p.texto, p.tipo_respuesta, p.opciones,
		       p.tiene_detalle, p.placeholder_detalle, p.solo_genero, p.orden, p.esta_activo,
		       r.valor, r.detalle
		FROM antecedente_pregunta p
		LEFT JOIN antecedente_respuesta r
		       ON r.pregunta_id = p.id AND r.numero_documento = $1
		WHERE p.esta_activo = TRUE
		ORDER BY p.categoria, p.orden`,
		doc,
	)
	if err != nil {
		log.Printf("obtener antecedentes: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar antecedentes")
		return
	}
	defer rows.Close()

	resultado := make(map[string][]models.PreguntaConRespuesta)
	for rows.Next() {
		var p models.PreguntaConRespuesta
		var optsBytes []byte
		if err := rows.Scan(
			&p.ID, &p.Categoria, &p.Texto, &p.TipoRespuesta, &optsBytes,
			&p.TieneDetalle, &p.PlaceholderDetalle, &p.SoloGenero, &p.Orden, &p.EstaActivo,
			&p.Valor, &p.Detalle,
		); err != nil {
			log.Printf("scan pregunta: %v", err)
			continue
		}
		p.Opciones = json.RawMessage(optsBytes)
		resultado[p.Categoria] = append(resultado[p.Categoria], p)
	}

	responderJSON(w, http.StatusOK, resultado)
}

// PUT /pacientes/{documento}/antecedentes
// Batch upsert answers. Only non-empty values are persisted.
func (h *AntecedentesHandler) guardarRespuestas(w http.ResponseWriter, r *http.Request) {
	doc := chi.URLParam(r, "documento")
	var inputs []models.RespuestaInput
	if err := json.NewDecoder(r.Body).Decode(&inputs); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	ctx := r.Context()
	for _, inp := range inputs {
		if inp.Valor == "" {
			continue
		}
		_, err := h.db.Exec(ctx, `
			INSERT INTO antecedente_respuesta (numero_documento, pregunta_id, valor, detalle, actualizado_en)
			VALUES ($1, $2, $3, $4, NOW())
			ON CONFLICT (numero_documento, pregunta_id) DO UPDATE SET
				valor = EXCLUDED.valor,
				detalle = EXCLUDED.detalle,
				actualizado_en = NOW()`,
			doc, inp.PreguntaID, inp.Valor, inp.Detalle,
		)
		if err != nil {
			log.Printf("guardar respuesta %s: %v", inp.PreguntaID, err)
			responderError(w, http.StatusInternalServerError, "error al guardar respuesta")
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Admin routes ─────────────────────────────────────────────────────────────

// GET /antecedentes/preguntas
func (h *AntecedentesHandler) listarPreguntas(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT id, categoria, texto, tipo_respuesta, opciones,
		       tiene_detalle, placeholder_detalle, solo_genero, orden, esta_activo
		FROM antecedente_pregunta
		ORDER BY categoria, orden`)
	if err != nil {
		log.Printf("listar preguntas: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar")
		return
	}
	defer rows.Close()

	preguntas := []models.AntecedentePregunta{}
	for rows.Next() {
		var p models.AntecedentePregunta
		var optsBytes []byte
		if err := rows.Scan(
			&p.ID, &p.Categoria, &p.Texto, &p.TipoRespuesta, &optsBytes,
			&p.TieneDetalle, &p.PlaceholderDetalle, &p.SoloGenero, &p.Orden, &p.EstaActivo,
		); err != nil {
			continue
		}
		p.Opciones = json.RawMessage(optsBytes)
		preguntas = append(preguntas, p)
	}
	responderJSON(w, http.StatusOK, preguntas)
}

// POST /antecedentes/preguntas
func (h *AntecedentesHandler) crearPregunta(w http.ResponseWriter, r *http.Request) {
	var inp models.AntecedentePreguntaInput
	if err := json.NewDecoder(r.Body).Decode(&inp); err != nil || inp.Texto == "" || inp.Categoria == "" {
		responderError(w, http.StatusBadRequest, "categoria y texto son requeridos")
		return
	}

	var optsJSON *string
	if len(inp.Opciones) > 0 && string(inp.Opciones) != "null" {
		s := string(inp.Opciones)
		optsJSON = &s
	}

	var p models.AntecedentePregunta
	var optsBytes []byte
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO antecedente_pregunta
		    (categoria, texto, tipo_respuesta, opciones, tiene_detalle, placeholder_detalle, solo_genero, orden)
		VALUES ($1,$2,$3,$4::jsonb,TRUE,$5,$6,$7)
		RETURNING id, categoria, texto, tipo_respuesta, opciones,
		          tiene_detalle, placeholder_detalle, solo_genero, orden, esta_activo`,
		inp.Categoria, inp.Texto, inp.TipoRespuesta, optsJSON,
		inp.PlaceholderDetalle, inp.SoloGenero, inp.Orden,
	).Scan(
		&p.ID, &p.Categoria, &p.Texto, &p.TipoRespuesta, &optsBytes,
		&p.TieneDetalle, &p.PlaceholderDetalle, &p.SoloGenero, &p.Orden, &p.EstaActivo,
	)
	if err != nil {
		log.Printf("crear pregunta: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear")
		return
	}
	p.Opciones = json.RawMessage(optsBytes)
	responderJSON(w, http.StatusCreated, p)
}

// PUT /antecedentes/preguntas/{id}
func (h *AntecedentesHandler) actualizarPregunta(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var inp models.AntecedentePreguntaInput
	if err := json.NewDecoder(r.Body).Decode(&inp); err != nil || inp.Texto == "" {
		responderError(w, http.StatusBadRequest, "texto es requerido")
		return
	}

	var optsJSON *string
	if len(inp.Opciones) > 0 && string(inp.Opciones) != "null" {
		s := string(inp.Opciones)
		optsJSON = &s
	}

	var p models.AntecedentePregunta
	var optsBytes []byte
	err := h.db.QueryRow(r.Context(), `
		UPDATE antecedente_pregunta
		SET categoria=$1, texto=$2, tipo_respuesta=$3, opciones=$4::jsonb,
		    tiene_detalle=TRUE, placeholder_detalle=$5, solo_genero=$6, orden=$7
		WHERE id=$8
		RETURNING id, categoria, texto, tipo_respuesta, opciones,
		          tiene_detalle, placeholder_detalle, solo_genero, orden, esta_activo`,
		inp.Categoria, inp.Texto, inp.TipoRespuesta, optsJSON,
		inp.PlaceholderDetalle, inp.SoloGenero, inp.Orden, id,
	).Scan(
		&p.ID, &p.Categoria, &p.Texto, &p.TipoRespuesta, &optsBytes,
		&p.TieneDetalle, &p.PlaceholderDetalle, &p.SoloGenero, &p.Orden, &p.EstaActivo,
	)
	if err != nil {
		log.Printf("actualizar pregunta: %v", err)
		responderError(w, http.StatusNotFound, "pregunta no encontrada")
		return
	}
	p.Opciones = json.RawMessage(optsBytes)
	responderJSON(w, http.StatusOK, p)
}

// DELETE /antecedentes/preguntas/{id}
func (h *AntecedentesHandler) eliminarPregunta(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tag, err := h.db.Exec(r.Context(),
		`DELETE FROM antecedente_pregunta WHERE id=$1`, id)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al eliminar pregunta")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "pregunta no encontrada")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// PATCH /antecedentes/preguntas/{id}/toggle
func (h *AntecedentesHandler) togglePregunta(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE antecedente_pregunta SET esta_activo = NOT esta_activo WHERE id=$1 RETURNING esta_activo`,
		id,
	).Scan(&activo)
	if err != nil {
		responderError(w, http.StatusNotFound, "pregunta no encontrada")
		return
	}
	responderJSON(w, http.StatusOK, map[string]bool{"esta_activo": activo})
}
