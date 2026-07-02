package handlers

import (
	"context"
	"encoding/json"
	"errors"
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
	"hce/api/repository"
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
		r.Put("/", h.actualizar)
		r.Patch("/finalizar", h.finalizar)
		r.Delete("/", h.eliminar)
		r.Mount("/formulas", FormulasRouter(db))
		r.Mount("/consentimiento", ConsentimientoEncuentroRouter(db))
		r.Mount("/notas", NotasEncuentroRouter(db))
		r.Mount("/ordenes", OrdenesExamenRouter(db))
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
	COALESCE(codigo_diagnostico_principal, ''), descripcion_diagnostico, tipo_diagnostico_principal, plan_manejo,
	fecha_creacion, creado_por, id_sistema_anterior,
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

	args := argList{documento}
	query := `SELECT` + columnasEncuentro + `
		FROM encuentro_clinico
		WHERE paciente_documento = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE`

	if estado != "" {
		query += ` AND estado = ` + args.Add(estado)
	} else {
		query += ` AND estado = 'finalizado'`
	}
	if desde != "" {
		query += ` AND fecha_atencion >= ` + args.Add(desde)
	}
	if hasta != "" {
		query += ` AND fecha_atencion <= ` + args.Add(hasta+" 23:59:59")
	}
	if diagnostico != "" {
		p := args.Add("%" + strings.ToLower(diagnostico) + "%")
		query += ` AND (LOWER(COALESCE(codigo_diagnostico_principal,'')) LIKE ` + p +
			` OR LOWER(COALESCE(descripcion_diagnostico,'')) LIKE ` + p +
			` OR EXISTS (SELECT 1 FROM encuentro_diagnostico ed WHERE ed.encuentro_clinico_id = encuentro_clinico.id AND (LOWER(COALESCE(ed.codigo,'')) LIKE ` + p + ` OR LOWER(ed.descripcion) LIKE ` + p + `)))`
	}
	query += ` ORDER BY fecha_atencion DESC`

	rows, err := h.db.Query(r.Context(), query, args.Slice()...)
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
		if errors.Is(err, pgx.ErrNoRows) {
			responderError(w, http.StatusNotFound, "encuentro no encontrado")
		} else {
			log.Printf("obtener encuentro %s: %v", encuentroID, err)
			responderError(w, http.StatusInternalServerError, "error al leer encuentro")
		}
		return
	}

	// Cargar diagnósticos completos
	diags, err := cargarDiagnosticos(r.Context(), h.db, e.ID)
	if err != nil {
		log.Printf("cargarDiagnosticos %s: %v", e.ID, err)
		responderError(w, http.StatusInternalServerError, "error al leer diagnósticos")
		return
	}
	e.Diagnosticos = diags

	if e.FinalidadConsulta == "11" && e.EncuentroPadreID != nil {
		e.EsPrimerControl = esPrimerControl(r.Context(), h.db, *e.EncuentroPadreID, e.EncuentroID)
	}

	responderJSON(w, http.StatusOK, e)
}

// POST /pacientes/{documento}/encuentros  — crea borrador
func (h *EncuentroHandler) crear(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")

	var input models.EncuentroInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
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

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	var e models.Encuentro
	if err := repository.ExecTx(r.Context(), h.db, func(tx pgx.Tx) error {
		var txErr error
		e, txErr = insertarEncuentro(r.Context(), tx, uuid.New().String(), documento, input, 1, u.Nombre)
		return txErr
	}); err != nil {
		log.Printf("crear encuentro: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear encuentro")
		return
	}

	responderJSON(w, http.StatusCreated, e)
}

// PUT /pacientes/{documento}/encuentros/{encuentroId}  — actualiza borrador
func (h *EncuentroHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")
	encuentroID := chi.URLParam(r, "encuentroId")

	var input models.EncuentroInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}

	// Solo se puede editar si está en borrador
	var estadoActual string
	var rowID string
	err := h.db.QueryRow(r.Context(),
		`SELECT id, estado FROM encuentro_clinico WHERE encuentro_id = $1 AND paciente_documento = $2 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		encuentroID, documento,
	).Scan(&rowID, &estadoActual)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			responderError(w, http.StatusNotFound, "encuentro no encontrado")
		} else {
			responderError(w, http.StatusInternalServerError, "error al verificar encuentro")
		}
		return
	}
	if estadoActual != "borrador" {
		responderError(w, http.StatusConflict, "solo se pueden editar encuentros en borrador")
		return
	}

	fechaAtencion := time.Now()
	if input.FechaAtencion != nil {
		if t, err := time.Parse(time.RFC3339, *input.FechaAtencion); err == nil {
			fechaAtencion = t
		}
	}

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
	tipoDiag := input.TipoDiagnosticoPrincipal
	if tipoDiag == "" {
		tipoDiag = "01"
	}

	if err := repository.ExecTx(r.Context(), h.db, func(tx pgx.Tx) error {
		_, err := tx.Exec(r.Context(), `
			UPDATE encuentro_clinico SET
				encuentro_padre_id = $1, fecha_atencion = $2, causa_externa = $3,
				finalidad_consulta = $4, via_ingreso = $5, motivo_consulta = $6,
				descripcion_ingreso = $7, signos_vitales = $8, examen_fisico = $9,
				revision_sistemas = $10, codigo_diagnostico_principal = $11,
				descripcion_diagnostico = $12, tipo_diagnostico_principal = $13,
				plan_manejo = $14
			WHERE id = $15`,
			input.EncuentroPadreID, fechaAtencion, input.CausaExterna,
			input.FinalidadConsulta, input.ViaIngreso, input.MotivoConsulta,
			input.DescripcionIngreso, asJSON(input.SignosVitales), asJSON(input.ExamenFisico),
			asJSON(input.RevisionSistemas), codigoPrincipal, descPrincipal, tipoDiag,
			input.PlanManejo, rowID,
		)
		if err != nil {
			return err
		}
		// Reemplazar diagnósticos
		if _, err := tx.Exec(r.Context(), `DELETE FROM encuentro_diagnostico WHERE encuentro_clinico_id = $1`, rowID); err != nil {
			return err
		}
		for i, d := range input.Diagnosticos {
			if strings.TrimSpace(d.Descripcion) == "" {
				continue
			}
			if _, err := tx.Exec(r.Context(),
				`INSERT INTO encuentro_diagnostico (encuentro_clinico_id, tipo, tipo_clinico, codigo, descripcion, orden) VALUES ($1,$2,$3,$4,$5,$6)`,
				rowID, d.Tipo, d.TipoClinico, d.Codigo, d.Descripcion, i,
			); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		log.Printf("actualizar borrador %s: %v", encuentroID, err)
		responderError(w, http.StatusInternalServerError, "error al actualizar borrador")
		return
	}

	// Devolver encuentro actualizado
	row := h.db.QueryRow(r.Context(), `SELECT`+columnasEncuentro+` FROM encuentro_clinico WHERE id = $1`, rowID)
	e, err := escanearEncuentro(row)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al leer encuentro")
		return
	}
	diags, _ := cargarDiagnosticos(r.Context(), h.db, e.ID)
	e.Diagnosticos = diags
	responderJSON(w, http.StatusOK, e)
}

// PATCH /pacientes/{documento}/encuentros/{encuentroId}/finalizar
func (h *EncuentroHandler) finalizar(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")
	encuentroID := chi.URLParam(r, "encuentroId")

	var rowID, estadoActual, motivoActual string
	err := h.db.QueryRow(r.Context(),
		`SELECT id, estado, motivo_consulta FROM encuentro_clinico WHERE encuentro_id = $1 AND paciente_documento = $2 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		encuentroID, documento,
	).Scan(&rowID, &estadoActual, &motivoActual)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			responderError(w, http.StatusNotFound, "encuentro no encontrado")
		} else {
			responderError(w, http.StatusInternalServerError, "error al verificar encuentro")
		}
		return
	}
	if estadoActual != "borrador" {
		responderError(w, http.StatusConflict, "el encuentro ya está finalizado")
		return
	}
	if strings.TrimSpace(motivoActual) == "" {
		responderError(w, http.StatusBadRequest, "motivo_consulta es obligatorio para finalizar")
		return
	}

	// Verificar diagnóstico principal
	var tienePrincipal bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM encuentro_diagnostico WHERE encuentro_clinico_id = $1 AND tipo = 'principal')`,
		rowID,
	).Scan(&tienePrincipal)
	if !tienePrincipal {
		responderError(w, http.StatusBadRequest, "se requiere al menos un diagnóstico principal para finalizar")
		return
	}

	if _, err := h.db.Exec(r.Context(),
		`UPDATE encuentro_clinico SET estado = 'finalizado' WHERE id = $1`, rowID,
	); err != nil {
		log.Printf("finalizar encuentro %s: %v", encuentroID, err)
		responderError(w, http.StatusInternalServerError, "error al finalizar encuentro")
		return
	}

	row := h.db.QueryRow(r.Context(), `SELECT`+columnasEncuentro+` FROM encuentro_clinico WHERE id = $1`, rowID)
	e, err := escanearEncuentro(row)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al leer encuentro")
		return
	}
	diags, _ := cargarDiagnosticos(r.Context(), h.db, e.ID)
	e.Diagnosticos = diags

	// Vincular con factura pendiente si no es primer control gratuito
	esControlGratuito := e.FinalidadConsulta == "11" &&
		e.EncuentroPadreID != nil &&
		func() bool {
			pc := esPrimerControl(r.Context(), h.db, *e.EncuentroPadreID, e.EncuentroID)
			return pc != nil && *pc
		}()
	if !esControlGratuito {
		vincularEncuentroConFactura(r.Context(), h.db, documento, e.ID)
	}

	responderJSON(w, http.StatusOK, e)
}

// DELETE /pacientes/{documento}/encuentros/{encuentroId} — elimina todas las versiones
func (h *EncuentroHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" && u.Rol != "medico" {
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
		&e.CodigoDiagnosticoPrincipal, &e.DescripcionDiagnostico, &e.TipoDiagnosticoPrincipal, &e.PlanManejo,
		&e.FechaCreacion, &e.CreadoPor, &e.IDSistemaAnterior,
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

	tipoDiag := input.TipoDiagnosticoPrincipal
	if tipoDiag == "" {
		tipoDiag = "01"
	}

	row := db.QueryRow(ctx, `
		INSERT INTO encuentro_clinico (
			encuentro_id, numero_version, es_ultima_version, esta_activo, estado,
			paciente_documento, encuentro_padre_id,
			fecha_atencion, causa_externa, finalidad_consulta, via_ingreso,
			motivo_consulta, descripcion_ingreso,
			signos_vitales, examen_fisico, revision_sistemas,
			codigo_diagnostico_principal, descripcion_diagnostico, tipo_diagnostico_principal, plan_manejo,
			creado_por
		) VALUES (
			$1, $2, TRUE, TRUE, 'borrador',
			$3, $4,
			$5, $6, $7, $8,
			$9, $10,
			$11, $12, $13,
			$14, $15, $16, $17,
			$18
		) RETURNING `+columnasEncuentro,
		encuentroID, version,
		documento, input.EncuentroPadreID,
		fechaAtencion, input.CausaExterna, input.FinalidadConsulta, input.ViaIngreso,
		input.MotivoConsulta, input.DescripcionIngreso,
		asJSON(input.SignosVitales), asJSON(input.ExamenFisico), asJSON(input.RevisionSistemas),
		codigoPrincipal, descPrincipal, tipoDiag, input.PlanManejo,
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
			`INSERT INTO encuentro_diagnostico (encuentro_clinico_id, tipo, tipo_clinico, codigo, descripcion, orden)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			e.ID, d.Tipo, d.TipoClinico, d.Codigo, d.Descripcion, i,
		)
		if err != nil {
			return models.Encuentro{}, fmt.Errorf("insertar diagnóstico: %w", err)
		}
		e.Diagnosticos = append(e.Diagnosticos, models.EncuentroDiagnostico{
			Tipo:        d.Tipo,
			TipoClinico: d.TipoClinico,
			Codigo:      d.Codigo,
			Descripcion: d.Descripcion,
			Orden:       i,
		})
	}

	return e, nil
}

func cargarDiagnosticos(ctx context.Context, db *pgxpool.Pool, encuentroClinicID string) ([]models.EncuentroDiagnostico, error) {
	rows, err := db.Query(ctx,
		`SELECT id, tipo, tipo_clinico, codigo, descripcion, orden
		 FROM encuentro_diagnostico
		 WHERE encuentro_clinico_id = $1
		 ORDER BY orden`,
		encuentroClinicID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var diags []models.EncuentroDiagnostico
	for rows.Next() {
		var d models.EncuentroDiagnostico
		if err := rows.Scan(&d.ID, &d.Tipo, &d.TipoClinico, &d.Codigo, &d.Descripcion, &d.Orden); err != nil {
			return nil, err
		}
		diags = append(diags, d)
	}
	return diags, rows.Err()
}

// ── Listado global de encuentros ─────────────────────────────────────────────

// EncuentrosGlobalRouter expone GET /encuentros (listado global, no por paciente).
func EncuentrosGlobalRouter(db *pgxpool.Pool) http.Handler {
	h := &EncuentroHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.listarGlobal)
	r.Get("/vinculacion-preview", h.vinculacionPreview)
	return r
}

// GET /encuentros/vinculacion-preview?paciente=<doc>
// Devuelve la factura más antigua sin encuentro del paciente que sería
// vinculada al finalizar un encuentro. Devuelve null si no hay ninguna.
func (h *EncuentroHandler) vinculacionPreview(w http.ResponseWriter, r *http.Request) {
	paciente := r.URL.Query().Get("paciente")
	if paciente == "" {
		responderError(w, http.StatusBadRequest, "paciente es obligatorio")
		return
	}

	type resultado struct {
		FacturaID     string  `json:"factura_id"`
		FechaCreacion string  `json:"fecha_creacion"`
		Total         float64 `json:"total"`
	}

	var res resultado
	err := h.db.QueryRow(r.Context(), `
		SELECT f.factura_id, f.fecha_creacion::text, f.total
		FROM factura f
		WHERE f.paciente_documento = $1
		  AND f.es_ultima_version = TRUE AND f.esta_activo = TRUE
		  AND f.encuentro_id IS NULL
		ORDER BY f.fecha_creacion ASC
		LIMIT 1`,
		paciente,
	).Scan(&res.FacturaID, &res.FechaCreacion, &res.Total)

	if err != nil {
		responderJSON(w, http.StatusOK, nil)
		return
	}

	responderJSON(w, http.StatusOK, res)
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
	exportar := r.URL.Query().Get("export") == "1"

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

	var args argList
	where := `ec.es_ultima_version = TRUE AND ec.esta_activo = TRUE`

	if estado != "" {
		where += ` AND ec.estado = ` + args.Add(estado)
	}

	if q != "" {
		p := args.Add("%" + strings.ToLower(q) + "%")
		where += ` AND (
			LOWER(ec.paciente_documento) LIKE ` + p + `
			OR LOWER(p.nombre_primero || ' ' || COALESCE(p.nombre_segundo,'') || ' ' || p.apellido_primero || ' ' || COALESCE(p.apellido_segundo,'')) LIKE ` + p + `
			OR LOWER(p.apellido_primero || ' ' || COALESCE(p.apellido_segundo,'')) LIKE ` + p + `
		)`
	}
	if desde != "" {
		where += ` AND ec.fecha_atencion >= ` + args.Add(desde)
	}
	if hasta != "" {
		where += ` AND ec.fecha_atencion <= ` + args.Add(hasta+" 23:59:59")
	}
	if finalidad != "" {
		where += ` AND ec.finalidad_consulta = ` + args.Add(finalidad)
	}

	orderDir := "DESC"
	if strings.ToLower(strings.TrimSpace(r.URL.Query().Get("dir"))) == "asc" {
		orderDir = "ASC"
	}
	var orderByClause string
	switch strings.TrimSpace(r.URL.Query().Get("orden")) {
	case "paciente":
		orderByClause = "p.nombre_primero " + orderDir + ", p.apellido_primero " + orderDir
	case "finalidad":
		orderByClause = "ec.finalidad_consulta " + orderDir
	case "diagnostico":
		orderByClause = "COALESCE(ec.codigo_diagnostico_principal,'') " + orderDir
	case "estado":
		orderByClause = "ec.estado " + orderDir
	default:
		orderByClause = "ec.fecha_atencion " + orderDir
	}

	// Labels unificados con columnasEncuentro (B3)
	baseQuery := `
		SELECT
			ec.encuentro_id,
			ec.fecha_atencion,
			ec.estado,
			ec.finalidad_consulta,
			CASE ec.finalidad_consulta
				WHEN '10' THEN 'Consulta de primera vez'
				WHEN '11' THEN 'Consulta de control o seguimiento'
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
		ORDER BY ` + orderByClause

	var query string
	if exportar {
		query = baseQuery
	} else {
		query = baseQuery + ` LIMIT ` + args.Add(limit) + ` OFFSET ` + args.Add(offset)
	}
	queryArgs := args.Slice()

	rows, err := h.db.Query(r.Context(), query, queryArgs...)
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

// esPrimerControl devuelve true si primer_control_gratis está activo en configuración
// y no existen controles previos para el mismo encuentro padre.
func esPrimerControl(ctx context.Context, db *pgxpool.Pool, padreID string, propioEncuentroID string) *bool {
	var result bool
	err := db.QueryRow(ctx, `
		SELECT
			COALESCE((medico->>'primer_control_gratis')::boolean, true)
			AND NOT EXISTS (
				SELECT 1 FROM encuentro_clinico
				WHERE encuentro_padre_id = $1
				  AND finalidad_consulta = '11'
				  AND es_ultima_version = TRUE AND esta_activo = TRUE
				  AND encuentro_id != $2
			)
		FROM configuracion_sistema WHERE id = 1`,
		padreID, propioEncuentroID,
	).Scan(&result)
	if err != nil {
		return nil
	}
	return &result
}

