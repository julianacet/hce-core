package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
	"hce/api/repository"
)

type FormulaHandler struct {
	db *pgxpool.Pool
}

func FormulasRouter(db *pgxpool.Pool) http.Handler {
	h := &FormulaHandler{db: db}
	r := chi.NewRouter()

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Get("/{formulaId}", h.obtener)
	r.Delete("/{formulaId}", h.eliminar)

	return r
}

// GET /pacientes/{documento}/encuentros/{encuentroId}/formulas
func (h *FormulaHandler) listar(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")

	rows, err := h.db.Query(r.Context(), `
		SELECT id, formula_id, numero_version, es_ultima_version, esta_activo,
		       encuentro_id, tipo, observaciones, fecha_creacion, creado_por
		FROM formula_medica
		WHERE encuentro_id = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE
		ORDER BY fecha_creacion DESC`,
		encuentroID,
	)
	if err != nil {
		log.Printf("listar formulas: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar fórmulas")
		return
	}
	defer rows.Close()

	formulas := make([]models.Formula, 0)
	for rows.Next() {
		var f models.Formula
		if err := rows.Scan(
			&f.ID, &f.FormulaID, &f.NumeroVersion, &f.EsUltimaVersion, &f.EstaActivo,
			&f.EncuentroID, &f.Tipo, &f.Observaciones, &f.FechaCreacion, &f.CreadoPor,
		); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer fórmula")
			return
		}
		meds, err := obtenerMedicamentos(r.Context(), h.db, f.ID)
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer medicamentos")
			return
		}
		f.Medicamentos = meds
		formulas = append(formulas, f)
	}

	responderJSON(w, http.StatusOK, formulas)
}

// GET /pacientes/{documento}/encuentros/{encuentroId}/formulas/{formulaId}
func (h *FormulaHandler) obtener(w http.ResponseWriter, r *http.Request) {
	formulaID := chi.URLParam(r, "formulaId")
	encuentroID := chi.URLParam(r, "encuentroId")

	var f models.Formula
	err := h.db.QueryRow(r.Context(), `
		SELECT id, formula_id, numero_version, es_ultima_version, esta_activo,
		       encuentro_id, tipo, observaciones, fecha_creacion, creado_por
		FROM formula_medica
		WHERE formula_id = $1 AND encuentro_id = $2
		  AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		formulaID, encuentroID,
	).Scan(
		&f.ID, &f.FormulaID, &f.NumeroVersion, &f.EsUltimaVersion, &f.EstaActivo,
		&f.EncuentroID, &f.Tipo, &f.Observaciones, &f.FechaCreacion, &f.CreadoPor,
	)
	if err != nil {
		responderError(w, http.StatusNotFound, "fórmula no encontrada")
		return
	}

	meds, err := obtenerMedicamentos(r.Context(), h.db, f.ID)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al leer medicamentos")
		return
	}
	f.Medicamentos = meds

	responderJSON(w, http.StatusOK, f)
}

// POST /pacientes/{documento}/encuentros/{encuentroId}/formulas
// La fórmula se crea en una transacción atómica junto con sus medicamentos.
func (h *FormulaHandler) crear(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")

	var input models.FormulaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}

	if len(input.Medicamentos) == 0 {
		responderError(w, http.StatusBadRequest, "la fórmula debe tener al menos un medicamento")
		return
	}

	if input.Tipo != "pos" && input.Tipo != "no_pos" {
		input.Tipo = "pos"
	}

	// Verificar que el encuentro existe
	var existe bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM encuentro_clinico WHERE encuentro_id = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE)`,
		encuentroID,
	).Scan(&existe)
	if !existe {
		responderError(w, http.StatusNotFound, "encuentro no encontrado")
		return
	}

	// Validar medicamentos antes de abrir la transacción
	for _, m := range input.Medicamentos {
		if m.NombreMedicamento == "" {
			responderError(w, http.StatusBadRequest, "cada medicamento requiere nombre")
			return
		}
	}

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	formulaID := uuid.New().String()
	var f models.Formula
	meds := make([]models.Medicamento, 0, len(input.Medicamentos))

	if err := repository.ExecTx(r.Context(), h.db, func(tx pgx.Tx) error {
		if err := tx.QueryRow(r.Context(), `
			INSERT INTO formula_medica (
				formula_id, numero_version, es_ultima_version, esta_activo,
				encuentro_id, tipo, observaciones, creado_por
			) VALUES ($1, 1, TRUE, TRUE, $2, $3, $4, $5)
			RETURNING id, formula_id, numero_version, es_ultima_version, esta_activo,
			          encuentro_id, tipo, observaciones, fecha_creacion, creado_por`,
			formulaID, encuentroID, input.Tipo, input.Observaciones, u.Nombre,
		).Scan(
			&f.ID, &f.FormulaID, &f.NumeroVersion, &f.EsUltimaVersion, &f.EstaActivo,
			&f.EncuentroID, &f.Tipo, &f.Observaciones, &f.FechaCreacion, &f.CreadoPor,
		); err != nil {
			return err
		}
		for i, m := range input.Medicamentos {
			var med models.Medicamento
			if err := tx.QueryRow(r.Context(), `
				INSERT INTO formula_medicamento (
					formula_id, nombre_medicamento, concentracion, forma_farmaceutica,
					dosis, frecuencia, duracion_tratamiento, cantidad_dispensar,
					indicaciones, orden
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
				RETURNING id, formula_id, nombre_medicamento, concentracion, forma_farmaceutica,
				          dosis, frecuencia, duracion_tratamiento, cantidad_dispensar,
				          indicaciones, orden`,
				f.ID, m.NombreMedicamento, m.Concentracion, m.FormaFarmaceutica,
				m.Dosis, m.Frecuencia, m.DuracionTratamiento, m.CantidadDispensar,
				m.Indicaciones, i+1,
			).Scan(
				&med.ID, &med.FormulaID, &med.NombreMedicamento, &med.Concentracion, &med.FormaFarmaceutica,
				&med.Dosis, &med.Frecuencia, &med.DuracionTratamiento, &med.CantidadDispensar,
				&med.Indicaciones, &med.Orden,
			); err != nil {
				return err
			}
			meds = append(meds, med)
		}
		return nil
	}); err != nil {
		log.Printf("crear formula: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear fórmula")
		return
	}

	f.Medicamentos = meds
	responderJSON(w, http.StatusCreated, f)
}

// DELETE /pacientes/{documento}/encuentros/{encuentroId}/formulas/{formulaId}
func (h *FormulaHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" && u.Rol != "medico" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar fórmulas")
		return
	}
	formulaID := chi.URLParam(r, "formulaId")
	tag, err := h.db.Exec(r.Context(),
		`DELETE FROM formula_medica WHERE formula_id=$1`, formulaID)
	if err != nil {
		log.Printf("eliminar formula: %v", err)
		responderError(w, http.StatusInternalServerError, "error al eliminar fórmula")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "fórmula no encontrada")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func obtenerMedicamentos(ctx context.Context, db *pgxpool.Pool, formulaRowID string) ([]models.Medicamento, error) {
	rows, err := db.Query(ctx, `
		SELECT id, formula_id, nombre_medicamento, concentracion, forma_farmaceutica,
		       dosis, frecuencia, duracion_tratamiento, cantidad_dispensar,
		       indicaciones, orden
		FROM formula_medicamento
		WHERE formula_id = $1
		ORDER BY orden`,
		formulaRowID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	meds := make([]models.Medicamento, 0)
	for rows.Next() {
		var m models.Medicamento
		if err := rows.Scan(
			&m.ID, &m.FormulaID, &m.NombreMedicamento, &m.Concentracion, &m.FormaFarmaceutica,
			&m.Dosis, &m.Frecuencia, &m.DuracionTratamiento, &m.CantidadDispensar,
			&m.Indicaciones, &m.Orden,
		); err != nil {
			return nil, err
		}
		meds = append(meds, m)
	}
	return meds, rows.Err()
}
