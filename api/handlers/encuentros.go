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
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

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
	})

	return r
}

const columnasEncuentro = `
	id, encuentro_id, numero_version, es_ultima_version, esta_activo,
	paciente_documento, encuentro_padre_id,
	fecha_atencion, causa_externa, finalidad_consulta, via_ingreso,
	motivo_consulta, examen_fisico,
	codigo_diagnostico_principal, descripcion_diagnostico, plan_manejo,
	hash_integridad, fecha_creacion, creado_por, id_sistema_anterior`

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
		query += ` AND (LOWER(codigo_diagnostico_principal) LIKE $` + fmt.Sprintf("%d", len(args)) +
			` OR LOWER(descripcion_diagnostico) LIKE $` + fmt.Sprintf("%d", len(args)) + `)`
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

	if strings.TrimSpace(input.MotivoConsulta) == "" || strings.TrimSpace(input.CodigoDiagnosticoPrincipal) == "" {
		responderError(w, http.StatusBadRequest, "motivo_consulta y codigo_diagnostico_principal son obligatorios")
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
	e, err := insertarEncuentro(r.Context(), h.db, uuid.New().String(), documento, input, 1, u.Nombre)
	if err != nil {
		log.Printf("crear encuentro: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear encuentro")
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
	err := row.Scan(
		&e.ID, &e.EncuentroID, &e.NumeroVersion, &e.EsUltimaVersion, &e.EstaActivo,
		&e.PacienteDocumento, &e.EncuentroPadreID,
		&e.FechaAtencion, &e.CausaExterna, &e.FinalidadConsulta, &e.ViaIngreso,
		&e.MotivoConsulta, &e.ExamenFisico,
		&e.CodigoDiagnosticoPrincipal, &e.DescripcionDiagnostico, &e.PlanManejo,
		&e.HashIntegridad, &e.FechaCreacion, &e.CreadoPor, &e.IDSistemaAnterior,
	)
	return e, err
}

func insertarEncuentro(ctx context.Context, db queryRower, encuentroID string, documento string, input models.EncuentroInput, version int, creadoPor string) (models.Encuentro, error) {
	fechaAtencion := time.Now()
	if input.FechaAtencion != nil {
		if t, err := time.Parse(time.RFC3339, *input.FechaAtencion); err == nil {
			fechaAtencion = t
		}
	}

	row := db.QueryRow(ctx, `
		INSERT INTO encuentro_clinico (
			encuentro_id, numero_version, es_ultima_version, esta_activo,
			paciente_documento, encuentro_padre_id,
			fecha_atencion, causa_externa, finalidad_consulta, via_ingreso,
			motivo_consulta, examen_fisico,
			codigo_diagnostico_principal, descripcion_diagnostico, plan_manejo,
			creado_por
		) VALUES (
			$1, $2, TRUE, TRUE,
			$3, $4,
			$5, $6, $7, $8,
			$9, $10,
			$11, $12, $13,
			$14
		) RETURNING`+columnasEncuentro,
		encuentroID, version,
		documento, input.EncuentroPadreID,
		fechaAtencion, input.CausaExterna, input.FinalidadConsulta, input.ViaIngreso,
		input.MotivoConsulta, input.ExamenFisico,
		input.CodigoDiagnosticoPrincipal, input.DescripcionDiagnostico, input.PlanManejo,
		creadoPor,
	)
	return escanearEncuentro(row)
}
