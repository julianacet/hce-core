package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

// ── Tipos de eventos adversos ─────────────────────────────────────────────────

func TiposEventoAdversoRouter(db *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	h := &tiposEAHandler{db: db}

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Put("/{tipoId}", h.actualizar)
	r.Patch("/{tipoId}/toggle", h.desactivar)
	r.Delete("/{tipoId}", h.eliminarTipo)

	return r
}

type tiposEAHandler struct{ db *pgxpool.Pool }

func (h *tiposEAHandler) listar(w http.ResponseWriter, r *http.Request) {
	soloActivos := r.URL.Query().Get("todos") != "1"

	query := `SELECT id, nombre, descripcion, requiere_reporte_invima, esta_activo, fecha_creacion, creado_por
	          FROM tipo_evento_adverso`
	if soloActivos {
		query += ` WHERE esta_activo = TRUE`
	}
	query += ` ORDER BY nombre ASC`

	rows, err := h.db.Query(r.Context(), query)
	if err != nil {
		log.Printf("listar tipos EA: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar tipos")
		return
	}
	defer rows.Close()

	tipos := []models.TipoEventoAdverso{}
	for rows.Next() {
		var t models.TipoEventoAdverso
		if err := rows.Scan(&t.ID, &t.Nombre, &t.Descripcion, &t.RequiereReporteINVIMA,
			&t.EstaActivo, &t.FechaCreacion, &t.CreadoPor); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer tipos")
			return
		}
		tipos = append(tipos, t)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tipos)
}

func (h *tiposEAHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede crear tipos")
		return
	}

	var input models.TipoEventoAdversoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if strings.TrimSpace(input.Nombre) == "" {
		responderError(w, http.StatusBadRequest, "el nombre es obligatorio")
		return
	}

	var t models.TipoEventoAdverso
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO tipo_evento_adverso (nombre, descripcion, requiere_reporte_invima, creado_por)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, nombre, descripcion, requiere_reporte_invima, esta_activo, fecha_creacion, creado_por`,
		strings.TrimSpace(input.Nombre), input.Descripcion, input.RequiereReporteINVIMA, u.Nombre,
	).Scan(&t.ID, &t.Nombre, &t.Descripcion, &t.RequiereReporteINVIMA,
		&t.EstaActivo, &t.FechaCreacion, &t.CreadoPor)
	if err != nil {
		log.Printf("crear tipo EA: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear tipo")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

func (h *tiposEAHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede editar tipos")
		return
	}

	id := chi.URLParam(r, "tipoId")
	var input models.TipoEventoAdversoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if strings.TrimSpace(input.Nombre) == "" {
		responderError(w, http.StatusBadRequest, "el nombre es obligatorio")
		return
	}

	var t models.TipoEventoAdverso
	err := h.db.QueryRow(r.Context(),
		`UPDATE tipo_evento_adverso
		 SET nombre = $1, descripcion = $2, requiere_reporte_invima = $3
		 WHERE id = $4
		 RETURNING id, nombre, descripcion, requiere_reporte_invima, esta_activo, fecha_creacion, creado_por`,
		strings.TrimSpace(input.Nombre), input.Descripcion, input.RequiereReporteINVIMA, id,
	).Scan(&t.ID, &t.Nombre, &t.Descripcion, &t.RequiereReporteINVIMA,
		&t.EstaActivo, &t.FechaCreacion, &t.CreadoPor)
	if err != nil {
		log.Printf("actualizar tipo EA: %v", err)
		responderError(w, http.StatusInternalServerError, "error al actualizar tipo")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func (h *tiposEAHandler) desactivar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede activar o desactivar tipos")
		return
	}
	id := chi.URLParam(r, "tipoId")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE tipo_evento_adverso SET esta_activo = NOT esta_activo WHERE id = $1 RETURNING esta_activo`, id,
	).Scan(&activo)
	if err != nil {
		responderError(w, http.StatusNotFound, "tipo no encontrado")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"esta_activo": activo})
}

func (h *tiposEAHandler) eliminarTipo(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar tipos")
		return
	}
	id := chi.URLParam(r, "tipoId")
	tag, err := h.db.Exec(r.Context(), `DELETE FROM tipo_evento_adverso WHERE id=$1`, id)
	if err != nil {
		log.Printf("eliminar tipo EA: %v", err)
		responderError(w, http.StatusInternalServerError, "error al eliminar tipo")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "tipo no encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Reportes de eventos adversos ─────────────────────────────────────────────

func EventosAdversosRouter(db *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	h := &eventosAdversosHandler{db: db}

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Get("/{eventoId}", h.obtener)
	r.Put("/{eventoId}", h.actualizar)
	r.Put("/{eventoId}/seguimiento", h.actualizarSeguimiento)
	r.Patch("/{eventoId}/toggle", h.toggle)
	r.Delete("/{eventoId}", h.eliminar)

	return r
}

type eventosAdversosHandler struct{ db *pgxpool.Pool }

const colsEvento = `
	e.id, e.numero, e.tipo_id, t.nombre,
	e.fecha_evento, e.paciente_documento, e.diagnostico_activo,
	e.clasificacion, e.categoria_danio, e.se_informo_paciente,
	e.descripcion, e.como_se_detecto, e.factores_contribuyentes,
	e.acciones_inmediatas, e.requiere_causa_raiz, e.analisis_causa_raiz,
	e.acciones_mejora, e.responsable_seguimiento, e.fecha_limite_mejora::text,
	e.estado, e.fecha_cierre, e.cerrado_por,
	e.creado_por, e.fecha_creacion`

func escanearEvento(row interface{ Scan(...any) error }) (models.EventoAdverso, error) {
	var e models.EventoAdverso
	var factoresJSON []byte
	err := row.Scan(
		&e.ID, &e.Numero, &e.TipoID, &e.TipoNombre,
		&e.FechaEvento, &e.PacienteDocumento, &e.DiagnosticoActivo,
		&e.Clasificacion, &e.CategoriaDanio, &e.SeInformoPaciente,
		&e.Descripcion, &e.ComoSeDetecto, &factoresJSON,
		&e.AccionesInmediatas, &e.RequiereCausaRaiz, &e.AnalisisCausaRaiz,
		&e.AccionesMejora, &e.ResponsableSeguimiento, &e.FechaLimiteMejora,
		&e.Estado, &e.FechaCierre, &e.CerradoPor,
		&e.CreadoPor, &e.FechaCreacion,
	)
	if err == nil {
		e.FactoresContribuyentes = models.UnmarshalFactores(factoresJSON)
	}
	return e, err
}

func (h *eventosAdversosHandler) listar(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	estado := q.Get("estado")
	tipoID := q.Get("tipo_id")

	query := `SELECT ` + colsEvento + `
	          FROM evento_adverso e
	          LEFT JOIN tipo_evento_adverso t ON t.id = e.tipo_id
	          WHERE 1=1`
	args := []any{}
	n := 1

	if estado != "" {
		args = append(args, estado)
		query += ` AND e.estado = $` + strconv.Itoa(n)
		n++
	}
	if tipoID != "" {
		args = append(args, tipoID)
		query += ` AND e.tipo_id = $` + strconv.Itoa(n)
		n++
	}
	query += ` ORDER BY e.fecha_evento DESC LIMIT 100`

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		log.Printf("listar eventos adversos: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar eventos")
		return
	}
	defer rows.Close()

	eventos := []models.EventoAdverso{}
	for rows.Next() {
		e, err := escanearEvento(rows)
		if err != nil {
			log.Printf("escanear evento: %v", err)
			responderError(w, http.StatusInternalServerError, "error al leer eventos")
			return
		}
		eventos = append(eventos, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(eventos)
}

func (h *eventosAdversosHandler) obtener(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "eventoId")

	row := h.db.QueryRow(r.Context(),
		`SELECT `+colsEvento+`
		 FROM evento_adverso e
		 LEFT JOIN tipo_evento_adverso t ON t.id = e.tipo_id
		 WHERE e.id = $1`, id)

	e, err := escanearEvento(row)
	if err != nil {
		responderError(w, http.StatusNotFound, "evento no encontrado")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(e)
}

func (h *eventosAdversosHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())

	var input models.EventoAdversoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if strings.TrimSpace(input.Descripcion) == "" {
		responderError(w, http.StatusBadRequest, "la descripción es obligatoria")
		return
	}
	if input.Clasificacion == "" || input.CategoriaDanio == "" {
		responderError(w, http.StatusBadRequest, "clasificación y categoría del daño son obligatorias")
		return
	}

	fechaEvento, err := time.Parse(time.RFC3339, input.FechaEvento)
	if err != nil {
		fechaEvento, err = time.Parse("2006-01-02T15:04", input.FechaEvento)
		if err != nil {
			responderError(w, http.StatusBadRequest, "fecha_evento inválida")
			return
		}
	}

	factoresJSON := models.MarshalFactores(input.FactoresContribuyentes)

	var id string
	err = h.db.QueryRow(r.Context(),
		`INSERT INTO evento_adverso (
			tipo_id, fecha_evento, paciente_documento, diagnostico_activo,
			clasificacion, categoria_danio, se_informo_paciente,
			descripcion, como_se_detecto, factores_contribuyentes,
			acciones_inmediatas, requiere_causa_raiz, creado_por
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id`,
		input.TipoID, fechaEvento, input.PacienteDocumento, input.DiagnosticoActivo,
		input.Clasificacion, input.CategoriaDanio, input.SeInformoPaciente,
		strings.TrimSpace(input.Descripcion), input.ComoSeDetecto, factoresJSON,
		input.AccionesInmediatas, input.RequiereCausaRaiz, u.Nombre,
	).Scan(&id)
	if err != nil {
		log.Printf("crear evento adverso: %v", err)
		responderError(w, http.StatusInternalServerError, "error al registrar evento")
		return
	}

	row := h.db.QueryRow(r.Context(),
		`SELECT `+colsEvento+`
		 FROM evento_adverso e
		 LEFT JOIN tipo_evento_adverso t ON t.id = e.tipo_id
		 WHERE e.id = $1`, id)

	e, err := escanearEvento(row)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al leer evento creado")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(e)
}

func (h *eventosAdversosHandler) toggle(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede activar o desactivar eventos")
		return
	}
	id := chi.URLParam(r, "eventoId")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE evento_adverso SET esta_activo = NOT esta_activo WHERE id = $1 RETURNING esta_activo`, id,
	).Scan(&activo)
	if err != nil {
		responderError(w, http.StatusNotFound, "evento no encontrado")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"esta_activo": activo})
}

func (h *eventosAdversosHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar eventos")
		return
	}
	id := chi.URLParam(r, "eventoId")
	tag, err := h.db.Exec(r.Context(), `DELETE FROM evento_adverso WHERE id=$1`, id)
	if err != nil {
		log.Printf("eliminar evento adverso: %v", err)
		responderError(w, http.StatusInternalServerError, "error al eliminar evento")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "evento no encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *eventosAdversosHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" && u.Rol != "medico" {
		responderError(w, http.StatusForbidden, "acceso denegado")
		return
	}

	id := chi.URLParam(r, "eventoId")
	var input models.EventoAdversoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if strings.TrimSpace(input.Descripcion) == "" {
		responderError(w, http.StatusBadRequest, "la descripción es obligatoria")
		return
	}
	if input.Clasificacion == "" || input.CategoriaDanio == "" {
		responderError(w, http.StatusBadRequest, "clasificación y categoría del daño son obligatorias")
		return
	}

	fechaEvento, err := time.Parse(time.RFC3339, input.FechaEvento)
	if err != nil {
		fechaEvento, err = time.Parse("2006-01-02T15:04", input.FechaEvento)
		if err != nil {
			responderError(w, http.StatusBadRequest, "fecha_evento inválida")
			return
		}
	}

	factoresJSON := models.MarshalFactores(input.FactoresContribuyentes)

	_, err = h.db.Exec(r.Context(),
		`UPDATE evento_adverso
		 SET tipo_id = $1, fecha_evento = $2, paciente_documento = $3,
		     diagnostico_activo = $4, clasificacion = $5, categoria_danio = $6,
		     se_informo_paciente = $7, descripcion = $8, como_se_detecto = $9,
		     factores_contribuyentes = $10, acciones_inmediatas = $11,
		     requiere_causa_raiz = $12
		 WHERE id = $13`,
		input.TipoID, fechaEvento, input.PacienteDocumento,
		input.DiagnosticoActivo, input.Clasificacion, input.CategoriaDanio,
		input.SeInformoPaciente, strings.TrimSpace(input.Descripcion),
		input.ComoSeDetecto, factoresJSON, input.AccionesInmediatas,
		input.RequiereCausaRaiz, id,
	)
	if err != nil {
		log.Printf("actualizar evento adverso: %v", err)
		responderError(w, http.StatusInternalServerError, "error al actualizar evento")
		return
	}

	row := h.db.QueryRow(r.Context(),
		`SELECT `+colsEvento+`
		 FROM evento_adverso e
		 LEFT JOIN tipo_evento_adverso t ON t.id = e.tipo_id
		 WHERE e.id = $1`, id)

	e, err := escanearEvento(row)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al leer evento")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(e)
}

func (h *eventosAdversosHandler) actualizarSeguimiento(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" && u.Rol != "medico" {
		responderError(w, http.StatusForbidden, "acceso denegado")
		return
	}

	id := chi.URLParam(r, "eventoId")
	var input models.SeguimientoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}

	var fechaCierre *time.Time
	var cerradoPor *string
	if input.Estado == "cerrado" {
		now := time.Now()
		fechaCierre = &now
		cerradoPor = &u.Nombre
	}

	_, err := h.db.Exec(r.Context(),
		`UPDATE evento_adverso
		 SET analisis_causa_raiz = $1, acciones_mejora = $2,
		     responsable_seguimiento = $3, fecha_limite_mejora = $4,
		     estado = $5, fecha_cierre = $6, cerrado_por = $7
		 WHERE id = $8`,
		input.AnalisisCausaRaiz, input.AccionesMejora,
		input.ResponsableSeguimiento, input.FechaLimiteMejora,
		input.Estado, fechaCierre, cerradoPor, id,
	)
	if err != nil {
		log.Printf("actualizar seguimiento EA: %v", err)
		responderError(w, http.StatusInternalServerError, "error al actualizar seguimiento")
		return
	}

	row := h.db.QueryRow(r.Context(),
		`SELECT `+colsEvento+`
		 FROM evento_adverso e
		 LEFT JOIN tipo_evento_adverso t ON t.id = e.tipo_id
		 WHERE e.id = $1`, id)

	e, err := escanearEvento(row)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al leer evento")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(e)
}

