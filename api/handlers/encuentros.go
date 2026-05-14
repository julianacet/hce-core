package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

// asJSON convierte json.RawMessage a []byte para pgx; nil si vacío.
func asJSON(r json.RawMessage) interface{} {
	if len(r) == 0 || string(r) == "null" {
		return nil
	}
	return []byte(r)
}

type EncuentroHandler struct {
	db *pgxpool.Pool
}

func EncuentrosRouter(db *pgxpool.Pool) http.Handler {
	h := &EncuentroHandler{db: db}
	r := chi.NewRouter()

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Route("/{encuentroId}", func(r chi.Router) {
		r.Get("/", h.obtener)
		r.Delete("/", h.eliminar)
		r.Mount("/formulas", FormulasRouter(db))
		r.Mount("/consentimiento", ConsentimientoEncuentroRouter(db))
		r.Mount("/notas", NotasEncuentroRouter(db))
	})

	return r
}

// encuentroQuerier es satisfecho tanto por *pgxpool.Pool como por pgx.Tx.
type encuentroQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

const columnasEncuentro = `
	id, encuentro_id, numero_version, es_ultima_version, esta_activo, estado,
	paciente_documento, encuentro_padre_id,
	fecha_atencion, causa_externa, finalidad_consulta, via_ingreso,
	motivo_consulta, descripcion_ingreso,
	signos_vitales, examen_fisico, revision_sistemas,
	COALESCE(codigo_diagnostico_principal, ''), descripcion_diagnostico, plan_manejo,
	hash_integridad, fecha_creacion, creado_por, id_sistema_anterior,
	CASE finalidad_consulta WHEN '10' THEN 'Consulta de primera vez' WHEN '11' THEN 'Consulta de control o seguimiento' WHEN '12' THEN 'Urgencias' ELSE finalidad_consulta END AS finalidad_consulta_nombre,
	CASE causa_externa WHEN '13' THEN 'Enfermedad general' WHEN '01' THEN 'Accidente de trabajo' WHEN '02' THEN 'Accidente de tránsito' WHEN '03' THEN 'Otro accidente' WHEN '04' THEN 'Lesión por agresión' WHEN '05' THEN 'Lesión autoinfligida' WHEN '06' THEN 'Evento catastrófico' ELSE causa_externa END AS causa_externa_nombre,
	CASE via_ingreso WHEN '01' THEN 'Urgencias' WHEN '02' THEN 'Consulta externa' WHEN '03' THEN 'Hospitalización' ELSE via_ingreso END AS via_ingreso_nombre`

// GET /pacientes/{documento}/encuentros?desde=&hasta=&diagnostico=&estado=
func (h *EncuentroHandler) listar(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")

	desde := strings.TrimSpace(r.URL.Query().Get("desde"))
	hasta := strings.TrimSpace(r.URL.Query().Get("hasta"))
	diagnostico := strings.TrimSpace(r.URL.Query().Get("diagnostico"))
	estado := strings.TrimSpace(r.URL.Query().Get("estado"))

	query := `SELECT` + columnasEncuentro + `
		FROM encuentro_clinico
		WHERE paciente_documento = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE`
	args := []any{documento}

	if desde != "" {
		args = append(args, desde)
		query += ` AND fecha_atencion >= $` + fmt.Sprintf("%d", len(args))
	}
	if hasta != "" {
		args = append(args, hasta+" 23:59:59")
		query += ` AND fecha_atencion <= $` + fmt.Sprintf("%d", len(args))
	}
	if estado != "" {
		args = append(args, estado)
		query += ` AND estado = $` + fmt.Sprintf("%d", len(args))
	}
	if diagnostico != "" {
		args = append(args, "%"+strings.ToLower(diagnostico)+"%")
		idx := fmt.Sprintf("%d", len(args))
		query += ` AND (LOWER(COALESCE(codigo_diagnostico_principal,'')) LIKE $` + idx +
			` OR LOWER(COALESCE(descripcion_diagnostico,'')) LIKE $` + idx +
			` OR EXISTS (SELECT 1 FROM encuentro_diagnostico ed WHERE ed.encuentro_clinico_id = encuentro_clinico.id AND (LOWER(COALESCE(ed.codigo,'')) LIKE $` + idx + ` OR LOWER(ed.descripcion) LIKE $` + idx + `)))`
	}
	query += ` ORDER BY fecha_atencion DESC`

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		log.Printf("listar encuentros: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar encuentros")
		return
	}
	defer rows.Close()

	encuentros := make([]models.Encuentro, 0)
	for rows.Next() {
		e, err := escanearEncuentro(rows)
		if err != nil {
			log.Printf("escanear encuentro: %v", err)
			responderError(w, http.StatusInternalServerError, "error al leer encuentro")
			return
		}
		encuentros = append(encuentros, e)
	}
	if rows.Err() != nil {
		responderError(w, http.StatusInternalServerError, "error al iterar encuentros")
		return
	}

	responderJSON(w, http.StatusOK, encuentros)
}

// GET /pacientes/{documento}/encuentros/{encuentroId}
func (h *EncuentroHandler) obtener(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")
	encuentroID := chi.URLParam(r, "encuentroId")

	row := h.db.QueryRow(r.Context(),
		`SELECT`+columnasEncuentro+`
		 FROM encuentro_clinico
		 WHERE encuentro_id = $1 AND paciente_documento = $2
		   AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		encuentroID, documento,
	)

	e, err := escanearEncuentro(row)
	if err != nil {
		responderError(w, http.StatusNotFound, "encuentro no encontrado")
		return
	}

	// Cargar diagnósticos completos
	e.Diagnosticos = cargarDiagnosticos(r.Context(), h.db, e.ID)

	if e.FinalidadConsulta == "11" && e.EncuentroPadreID != nil {
		e.EsPrimerControl = esPrimerControl(r.Context(), h.db, *e.EncuentroPadreID, e.EncuentroID)
	}

	responderJSON(w, http.StatusOK, e)
}

// POST /pacientes/{documento}/encuentros
func (h *EncuentroHandler) crear(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")

	var input models.EncuentroInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}

	if strings.TrimSpace(input.MotivoConsulta) == "" {
		responderError(w, http.StatusBadRequest, "motivo_consulta es obligatorio")
		return
	}
	if !tieneDiagnosticoPrincipal(input.Diagnosticos) {
		responderError(w, http.StatusBadRequest, "se requiere al menos un diagnóstico principal")
		return
	}

	var existe bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM paciente WHERE numero_documento = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE)`,
		documento,
	).Scan(&existe)
	if !existe {
		responderError(w, http.StatusNotFound, "paciente no encontrado")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al iniciar transacción")
		return
	}
	defer tx.Rollback(r.Context())

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	e, err := insertarEncuentro(r.Context(), tx, uuid.New().String(), documento, input, 1, u.Nombre)
	if err != nil {
		log.Printf("crear encuentro: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear encuentro")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		responderError(w, http.StatusInternalServerError, "error al confirmar transacción")
		return
	}

	responderJSON(w, http.StatusCreated, e)
}

// DELETE /pacientes/{documento}/encuentros/{encuentroId} — elimina todas las versiones
func (h *EncuentroHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar encuentros")
		return
	}
	encuentroID := chi.URLParam(r, "encuentroId")
	tag, err := h.db.Exec(r.Context(),
		`DELETE FROM encuentro_clinico WHERE encuentro_id=$1`, encuentroID)
	if err != nil {
		log.Printf("eliminar encuentro: %v", err)
		responderError(w, http.StatusInternalServerError, "error al eliminar encuentro")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "encuentro no encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func escanearEncuentro(row scanner) (models.Encuentro, error) {
	var e models.Encuentro
	var svRaw, efRaw, rsRaw []byte
	err := row.Scan(
		&e.ID, &e.EncuentroID, &e.NumeroVersion, &e.EsUltimaVersion, &e.EstaActivo, &e.Estado,
		&e.PacienteDocumento, &e.EncuentroPadreID,
		&e.FechaAtencion, &e.CausaExterna, &e.FinalidadConsulta, &e.ViaIngreso,
		&e.MotivoConsulta, &e.DescripcionIngreso,
		&svRaw, &efRaw, &rsRaw,
		&e.CodigoDiagnosticoPrincipal, &e.DescripcionDiagnostico, &e.PlanManejo,
		&e.HashIntegridad, &e.FechaCreacion, &e.CreadoPor, &e.IDSistemaAnterior,
		&e.FinalidadConsultaNombre, &e.CausaExternaNombre, &e.ViaIngresoNombre,
	)
	if err != nil {
		return e, err
	}
	e.SignosVitales = json.RawMessage(svRaw)
	e.ExamenFisico = json.RawMessage(efRaw)
	e.RevisionSistemas = json.RawMessage(rsRaw)
	return e, nil
}

func insertarEncuentro(ctx context.Context, db encuentroQuerier, encuentroID string, documento string, input models.EncuentroInput, version int, creadoPor string) (models.Encuentro, error) {
	fechaAtencion := time.Now()
	if input.FechaAtencion != nil {
		if t, err := time.Parse(time.RFC3339, *input.FechaAtencion); err == nil {
			fechaAtencion = t
		}
	}

	// Derivar campos RIPS desde el primer diagnóstico principal
	var codigoPrincipal *string
	var descPrincipal *string
	for _, d := range input.Diagnosticos {
		if d.Tipo == "principal" {
			codigoPrincipal = d.Codigo
			desc := d.Descripcion
			descPrincipal = &desc
			break
		}
	}

	row := db.QueryRow(ctx, `
		INSERT INTO encuentro_clinico (
			encuentro_id, numero_version, es_ultima_version, esta_activo, estado,
			paciente_documento, encuentro_padre_id,
			fecha_atencion, causa_externa, finalidad_consulta, via_ingreso,
			motivo_consulta, descripcion_ingreso,
			signos_vitales, examen_fisico, revision_sistemas,
			codigo_diagnostico_principal, descripcion_diagnostico, plan_manejo,
			creado_por
		) VALUES (
			$1, $2, TRUE, TRUE, 'finalizado',
			$3, $4,
			$5, $6, $7, $8,
			$9, $10,
			$11, $12, $13,
			$14, $15, $16,
			$17
		) RETURNING `+columnasEncuentro,
		encuentroID, version,
		documento, input.EncuentroPadreID,
		fechaAtencion, input.CausaExterna, input.FinalidadConsulta, input.ViaIngreso,
		input.MotivoConsulta, input.DescripcionIngreso,
		asJSON(input.SignosVitales), asJSON(input.ExamenFisico), asJSON(input.RevisionSistemas),
		codigoPrincipal, descPrincipal, input.PlanManejo,
		creadoPor,
	)

	e, err := escanearEncuentro(row)
	if err != nil {
		return models.Encuentro{}, err
	}

	// Insertar diagnósticos en encuentro_diagnostico
	for i, d := range input.Diagnosticos {
		if strings.TrimSpace(d.Descripcion) == "" {
			continue
		}
		_, err := db.Exec(ctx,
			`INSERT INTO encuentro_diagnostico (encuentro_clinico_id, tipo, codigo, descripcion, orden)
			 VALUES ($1, $2, $3, $4, $5)`,
			e.ID, d.Tipo, d.Codigo, d.Descripcion, i,
		)
		if err != nil {
			return models.Encuentro{}, fmt.Errorf("insertar diagnóstico: %w", err)
		}
		e.Diagnosticos = append(e.Diagnosticos, models.EncuentroDiagnostico{
			Tipo:        d.Tipo,
			Codigo:      d.Codigo,
			Descripcion: d.Descripcion,
			Orden:       i,
		})
	}

	return e, nil
}

func cargarDiagnosticos(ctx context.Context, db *pgxpool.Pool, encuentroClinicID string) []models.EncuentroDiagnostico {
	rows, err := db.Query(ctx,
		`SELECT id, tipo, codigo, descripcion, orden
		 FROM encuentro_diagnostico
		 WHERE encuentro_clinico_id = $1
		 ORDER BY orden`,
		encuentroClinicID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var diags []models.EncuentroDiagnostico
	for rows.Next() {
		var d models.EncuentroDiagnostico
		if err := rows.Scan(&d.ID, &d.Tipo, &d.Codigo, &d.Descripcion, &d.Orden); err != nil {
			continue
		}
		diags = append(diags, d)
	}
	return diags
}

// ── Listado global de encuentros ─────────────────────────────────────────────

// EncuentrosGlobalRouter expone GET /encuentros (listado global, no por paciente).
func EncuentrosGlobalRouter(db *pgxpool.Pool) http.Handler {
	h := &EncuentroHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.listarGlobal)
	return r
}

type EncuentroResumen struct {
	EncuentroID                string    `json:"encuentro_id"`
	FechaAtencion              time.Time `json:"fecha_atencion"`
	Estado                     string    `json:"estado"`
	FinalidadConsulta          string    `json:"finalidad_consulta"`
	FinalidadConsultaNombre    string    `json:"finalidad_consulta_nombre"`
	MotivoConsulta             string    `json:"motivo_consulta"`
	PacienteDocumento          string    `json:"paciente_documento"`
	TipoDocumento              string    `json:"tipo_documento"`
	PacienteNombre             string    `json:"paciente_nombre"`
	CodigoDiagnosticoPrincipal string    `json:"codigo_diagnostico_principal"`
	DescripcionDiagnostico     *string   `json:"descripcion_diagnostico"`
}

type EncuentrosGlobalResp struct {
	Encuentros []EncuentroResumen `json:"encuentros"`
	Total      int                `json:"total"`
}

// GET /encuentros?q=&desde=&hasta=&finalidad=&estado=&page=&limit=
func (h *EncuentroHandler) listarGlobal(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	desde := strings.TrimSpace(r.URL.Query().Get("desde"))
	hasta := strings.TrimSpace(r.URL.Query().Get("hasta"))
	finalidad := strings.TrimSpace(r.URL.Query().Get("finalidad"))
	estado := strings.TrimSpace(r.URL.Query().Get("estado"))

	page := 1
	limit := 30
	if v := r.URL.Query().Get("page"); v != "" {
		if n, err := fmt.Sscanf(v, "%d", &page); n == 0 || err != nil || page < 1 {
			page = 1
		}
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := fmt.Sscanf(v, "%d", &limit); n == 0 || err != nil || limit < 1 || limit > 100 {
			limit = 30
		}
	}
	offset := (page - 1) * limit

	where := `ec.es_ultima_version = TRUE AND ec.esta_activo = TRUE`
	args := []any{}

	if q != "" {
		args = append(args, "%"+strings.ToLower(q)+"%")
		idx := fmt.Sprintf("%d", len(args))
		where += ` AND (
			LOWER(ec.paciente_documento) LIKE $` + idx + `
			OR LOWER(p.nombre_primero || ' ' || COALESCE(p.nombre_segundo,'') || ' ' || p.apellido_primero || ' ' || COALESCE(p.apellido_segundo,'')) LIKE $` + idx + `
			OR LOWER(p.apellido_primero || ' ' || COALESCE(p.apellido_segundo,'')) LIKE $` + idx + `
		)`
	}
	if desde != "" {
		args = append(args, desde)
		where += ` AND ec.fecha_atencion >= $` + fmt.Sprintf("%d", len(args))
	}
	if hasta != "" {
		args = append(args, hasta+" 23:59:59")
		where += ` AND ec.fecha_atencion <= $` + fmt.Sprintf("%d", len(args))
	}
	if finalidad != "" {
		args = append(args, finalidad)
		where += ` AND ec.finalidad_consulta = $` + fmt.Sprintf("%d", len(args))
	}
	if estado != "" {
		args = append(args, estado)
		where += ` AND ec.estado = $` + fmt.Sprintf("%d", len(args))
	}

	argsCount := append(args, limit, offset)
	idxLimit := fmt.Sprintf("%d", len(argsCount)-1)
	idxOffset := fmt.Sprintf("%d", len(argsCount))

	query := `
		SELECT
			ec.encuentro_id,
			ec.fecha_atencion,
			ec.estado,
			ec.finalidad_consulta,
			CASE ec.finalidad_consulta
				WHEN '10' THEN 'Primera vez'
				WHEN '11' THEN 'Control'
				WHEN '12' THEN 'Urgencias'
				ELSE ec.finalidad_consulta
			END,
			ec.motivo_consulta,
			ec.paciente_documento,
			p.tipo_documento,
			TRIM(p.nombre_primero || ' ' || COALESCE(p.nombre_segundo || ' ','') || p.apellido_primero || COALESCE(' ' || p.apellido_segundo,'')),
			COALESCE(ec.codigo_diagnostico_principal,''),
			ec.descripcion_diagnostico,
			COUNT(*) OVER() AS total
		FROM encuentro_clinico ec
		JOIN paciente p ON p.numero_documento = ec.paciente_documento
			AND p.es_ultima_version = TRUE AND p.esta_activo = TRUE
		WHERE ` + where + `
		ORDER BY ec.fecha_atencion DESC
		LIMIT $` + idxLimit + ` OFFSET $` + idxOffset

	rows, err := h.db.Query(r.Context(), query, argsCount...)
	if err != nil {
		log.Printf("listarGlobal encuentros: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar encuentros")
		return
	}
	defer rows.Close()

	lista := make([]EncuentroResumen, 0)
	var total int
	for rows.Next() {
		var e EncuentroResumen
		if err := rows.Scan(
			&e.EncuentroID, &e.FechaAtencion, &e.Estado,
			&e.FinalidadConsulta, &e.FinalidadConsultaNombre,
			&e.MotivoConsulta,
			&e.PacienteDocumento, &e.TipoDocumento, &e.PacienteNombre,
			&e.CodigoDiagnosticoPrincipal, &e.DescripcionDiagnostico,
			&total,
		); err != nil {
			log.Printf("escanear encuentro global: %v", err)
			responderError(w, http.StatusInternalServerError, "error al leer encuentros")
			return
		}
		lista = append(lista, e)
	}
	if rows.Err() != nil {
		responderError(w, http.StatusInternalServerError, "error al iterar encuentros")
		return
	}

	responderJSON(w, http.StatusOK, EncuentrosGlobalResp{Encuentros: lista, Total: total})
}

func tieneDiagnosticoPrincipal(diags []models.DiagnosticoInput) bool {
	for _, d := range diags {
		if d.Tipo == "principal" {
			return true
		}
	}
	return false
}

// esPrimerControl devuelve true si no existen controles previos para el mismo
// encuentro padre, siempre que primer_control_gratis esté activo en configuración.
func esPrimerControl(ctx context.Context, db *pgxpool.Pool, padreID string, propioEncuentroID string) *bool {
	var primerControlGratis bool
	err := db.QueryRow(ctx,
		`SELECT COALESCE((medico->>'primer_control_gratis')::boolean, true)
		 FROM configuracion_sistema WHERE id = 1`,
	).Scan(&primerControlGratis)
	if err != nil || !primerControlGratis {
		f := false
		return &f
	}

	var count int
	db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM encuentro_clinico
		WHERE encuentro_padre_id = $1
		  AND finalidad_consulta = '11'
		  AND es_ultima_version = TRUE AND esta_activo = TRUE
		  AND encuentro_id != $2`,
		padreID, propioEncuentroID,
	).Scan(&count)

	result := count == 0
	return &result
}

