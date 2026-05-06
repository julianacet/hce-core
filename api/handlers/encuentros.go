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
		r.Put("/", h.actualizar)
		r.Mount("/formulas", FormulasRouter(db))
		r.Mount("/facturas", FacturasRouter(db))
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
	id, encuentro_id, numero_version, es_ultima_version, esta_activo,
	paciente_documento, encuentro_padre_id,
	fecha_atencion, causa_externa, finalidad_consulta, via_ingreso,
	motivo_consulta,
	signos_vitales, examen_fisico,
	COALESCE(codigo_diagnostico_principal, ''), descripcion_diagnostico, plan_manejo,
	hash_integridad, fecha_creacion, creado_por, id_sistema_anterior,
	CASE finalidad_consulta WHEN '10' THEN 'Consulta de primera vez' WHEN '11' THEN 'Consulta de control o seguimiento' WHEN '12' THEN 'Urgencias' ELSE finalidad_consulta END AS finalidad_consulta_nombre,
	CASE causa_externa WHEN '13' THEN 'Enfermedad general' WHEN '01' THEN 'Accidente de trabajo' WHEN '02' THEN 'Accidente de tránsito' WHEN '03' THEN 'Otro accidente' WHEN '04' THEN 'Lesión por agresión' WHEN '05' THEN 'Lesión autoinfligida' WHEN '06' THEN 'Evento catastrófico' ELSE causa_externa END AS causa_externa_nombre,
	CASE via_ingreso WHEN '01' THEN 'Urgencias' WHEN '02' THEN 'Consulta externa' WHEN '03' THEN 'Hospitalización' ELSE via_ingreso END AS via_ingreso_nombre`

// GET /pacientes/{documento}/encuentros?desde=&hasta=&diagnostico=
func (h *EncuentroHandler) listar(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")

	desde := strings.TrimSpace(r.URL.Query().Get("desde"))
	hasta := strings.TrimSpace(r.URL.Query().Get("hasta"))
	diagnostico := strings.TrimSpace(r.URL.Query().Get("diagnostico"))

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

	// Para controles con padre: calcular si es el primero sin factura previa
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

// PUT /pacientes/{documento}/encuentros/{encuentroId}
// Crea una nueva versión del encuentro (SCD2).
func (h *EncuentroHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")
	encuentroID := chi.URLParam(r, "encuentroId")

	var input models.EncuentroInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}

	var versionActual int
	err := h.db.QueryRow(r.Context(), `
		SELECT numero_version FROM encuentro_clinico
		WHERE encuentro_id = $1 AND paciente_documento = $2
		  AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		encuentroID, documento,
	).Scan(&versionActual)
	if err != nil {
		responderError(w, http.StatusNotFound, "encuentro no encontrado")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al iniciar transacción")
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(), `
		UPDATE encuentro_clinico SET es_ultima_version = FALSE
		WHERE encuentro_id = $1 AND es_ultima_version = TRUE`,
		encuentroID,
	)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al versionar encuentro")
		return
	}

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	e, err := insertarEncuentro(r.Context(), tx, encuentroID, documento, input, versionActual+1, u.Nombre)
	if err != nil {
		log.Printf("actualizar encuentro: %v", err)
		responderError(w, http.StatusInternalServerError, "error al guardar nueva versión")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		responderError(w, http.StatusInternalServerError, "error al confirmar transacción")
		return
	}

	responderJSON(w, http.StatusOK, e)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func escanearEncuentro(row scanner) (models.Encuentro, error) {
	var e models.Encuentro
	var svRaw, efRaw []byte
	err := row.Scan(
		&e.ID, &e.EncuentroID, &e.NumeroVersion, &e.EsUltimaVersion, &e.EstaActivo,
		&e.PacienteDocumento, &e.EncuentroPadreID,
		&e.FechaAtencion, &e.CausaExterna, &e.FinalidadConsulta, &e.ViaIngreso,
		&e.MotivoConsulta,
		&svRaw, &efRaw,
		&e.CodigoDiagnosticoPrincipal, &e.DescripcionDiagnostico, &e.PlanManejo,
		&e.HashIntegridad, &e.FechaCreacion, &e.CreadoPor, &e.IDSistemaAnterior,
		&e.FinalidadConsultaNombre, &e.CausaExternaNombre, &e.ViaIngresoNombre,
	)
	if err != nil {
		return e, err
	}
	e.SignosVitales = json.RawMessage(svRaw)
	e.ExamenFisico = json.RawMessage(efRaw)
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
			encuentro_id, numero_version, es_ultima_version, esta_activo,
			paciente_documento, encuentro_padre_id,
			fecha_atencion, causa_externa, finalidad_consulta, via_ingreso,
			motivo_consulta,
			signos_vitales, examen_fisico,
			codigo_diagnostico_principal, descripcion_diagnostico, plan_manejo,
			creado_por
		) VALUES (
			$1, $2, TRUE, TRUE,
			$3, $4,
			$5, $6, $7, $8,
			$9,
			$10, $11,
			$12, $13, $14,
			$15
		) RETURNING `+columnasEncuentro,
		encuentroID, version,
		documento, input.EncuentroPadreID,
		fechaAtencion, input.CausaExterna, input.FinalidadConsulta, input.ViaIngreso,
		input.MotivoConsulta,
		asJSON(input.SignosVitales), asJSON(input.ExamenFisico),
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

func tieneDiagnosticoPrincipal(diags []models.DiagnosticoInput) bool {
	for _, d := range diags {
		if d.Tipo == "principal" {
			return true
		}
	}
	return false
}

// esPrimerControl devuelve un *bool: true si este control es el primero para el
// encuentro padre (no existen controles previos con factura no anulada para ese padre),
// siempre que la configuración tenga primer_control_gratis = true.
// Devuelve nil si la config no se puede leer o si la opción está desactivada.
func esPrimerControl(ctx context.Context, db *pgxpool.Pool, padreID string, propioEncuentroID string) *bool {
	// Leer configuración
	var primerControlGratis bool
	err := db.QueryRow(ctx,
		`SELECT COALESCE((medico->>'primer_control_gratis')::boolean, true)
		 FROM configuracion_sistema WHERE id = 1`,
	).Scan(&primerControlGratis)
	if err != nil || !primerControlGratis {
		f := false
		return &f
	}

	// Contar controles anteriores con factura activa para el mismo padre
	var count int
	db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM encuentro_clinico ec
		JOIN factura f ON f.encuentro_id = ec.encuentro_id
		WHERE ec.encuentro_padre_id = $1
		  AND ec.finalidad_consulta = '11'
		  AND ec.es_ultima_version = TRUE AND ec.esta_activo = TRUE
		  AND f.es_ultima_version = TRUE AND f.esta_activo = TRUE
		  AND f.estado != 'anulada'
		  AND ec.encuentro_id != $2`,
		padreID, propioEncuentroID,
	).Scan(&count)

	result := count == 0
	return &result
}
