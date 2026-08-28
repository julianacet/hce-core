package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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

	// Listar/ver queda disponible para cualquiera con acceso a la ficha del
	// paciente (recepcionista, enfermeria); emitir/editar fórmula es un acto
	// exclusivo del médico tratante.
	r.Get("/", h.listar)
	r.Get("/{formulaId}", h.obtener)
	r.Group(func(r chi.Router) {
		r.Use(appmiddleware.RequiereRol("nueva-consulta"))
		r.Post("/", h.crear)
		r.Put("/{formulaId}", h.actualizar)
		r.Patch("/{formulaId}/finalizar", h.finalizar)
		r.Delete("/{formulaId}", h.eliminar)
	})

	return r
}

// formulaQuerier es satisfecho tanto por *pgxpool.Pool como por pgx.Tx.
type formulaQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

const columnasFormula = `id, formula_id, numero_version, es_ultima_version, esta_activo, estado,
	       encuentro_id, tipo, observaciones, fecha_creacion, creado_por`

func escanearFormula(row scanner) (models.Formula, error) {
	var f models.Formula
	err := row.Scan(
		&f.ID, &f.FormulaID, &f.NumeroVersion, &f.EsUltimaVersion, &f.EstaActivo, &f.Estado,
		&f.EncuentroID, &f.Tipo, &f.Observaciones, &f.FechaCreacion, &f.CreadoPor,
	)
	return f, err
}

// GET /pacientes/{documento}/encuentros/{encuentroId}/formulas?estado=
func (h *FormulaHandler) listar(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")
	estado := strings.TrimSpace(r.URL.Query().Get("estado"))
	if estado == "" {
		estado = "finalizado"
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT `+columnasFormula+`
		FROM formula_medica
		WHERE encuentro_id = $1 AND estado = $2 AND es_ultima_version = TRUE AND esta_activo = TRUE
		ORDER BY fecha_creacion DESC`,
		encuentroID, estado,
	)
	if err != nil {
		log.Printf("listar formulas: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar fórmulas")
		return
	}
	defer rows.Close()

	formulas := make([]models.Formula, 0)
	for rows.Next() {
		f, err := escanearFormula(rows)
		if err != nil {
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

	row := h.db.QueryRow(r.Context(), `
		SELECT `+columnasFormula+`
		FROM formula_medica
		WHERE formula_id = $1 AND encuentro_id = $2
		  AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		formulaID, encuentroID,
	)
	f, err := escanearFormula(row)
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

// POST /pacientes/{documento}/encuentros/{encuentroId}/formulas  — crea borrador
func (h *FormulaHandler) crear(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")

	var input models.FormulaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
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

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	formulaID := uuid.New().String()
	var f models.Formula

	if err := repository.ExecTx(r.Context(), h.db, func(tx pgx.Tx) error {
		var txErr error
		f, txErr = insertarFormula(r.Context(), tx, formulaID, encuentroID, input, u.Nombre)
		return txErr
	}); err != nil {
		log.Printf("crear formula: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear fórmula")
		return
	}

	responderJSON(w, http.StatusCreated, f)
}

// PUT /pacientes/{documento}/encuentros/{encuentroId}/formulas/{formulaId}  — actualiza borrador
func (h *FormulaHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")
	formulaID := chi.URLParam(r, "formulaId")

	var input models.FormulaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if input.Tipo != "pos" && input.Tipo != "no_pos" {
		input.Tipo = "pos"
	}

	// Solo se puede editar si está en borrador
	var rowID, estadoActual string
	err := h.db.QueryRow(r.Context(),
		`SELECT id, estado FROM formula_medica WHERE formula_id = $1 AND encuentro_id = $2 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		formulaID, encuentroID,
	).Scan(&rowID, &estadoActual)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			responderError(w, http.StatusNotFound, "fórmula no encontrada")
		} else {
			responderError(w, http.StatusInternalServerError, "error al verificar fórmula")
		}
		return
	}
	if estadoActual != "borrador" {
		responderError(w, http.StatusConflict, "solo se pueden editar fórmulas en borrador")
		return
	}

	var f models.Formula
	if err := repository.ExecTx(r.Context(), h.db, func(tx pgx.Tx) error {
		if _, err := tx.Exec(r.Context(),
			`UPDATE formula_medica SET tipo = $1, observaciones = $2 WHERE id = $3`,
			input.Tipo, input.Observaciones, rowID,
		); err != nil {
			return err
		}
		if _, err := tx.Exec(r.Context(), `DELETE FROM formula_medicamento WHERE formula_id = $1`, rowID); err != nil {
			return err
		}
		meds, err := insertarMedicamentos(r.Context(), tx, rowID, input.Medicamentos)
		if err != nil {
			return err
		}
		row := tx.QueryRow(r.Context(), `SELECT `+columnasFormula+` FROM formula_medica WHERE id = $1`, rowID)
		f, err = escanearFormula(row)
		if err != nil {
			return err
		}
		f.Medicamentos = meds
		return nil
	}); err != nil {
		log.Printf("actualizar borrador formula %s: %v", formulaID, err)
		responderError(w, http.StatusInternalServerError, "error al actualizar borrador")
		return
	}

	responderJSON(w, http.StatusOK, f)
}

// PATCH /pacientes/{documento}/encuentros/{encuentroId}/formulas/{formulaId}/finalizar
func (h *FormulaHandler) finalizar(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")
	formulaID := chi.URLParam(r, "formulaId")

	var rowID, estadoActual string
	err := h.db.QueryRow(r.Context(),
		`SELECT id, estado FROM formula_medica WHERE formula_id = $1 AND encuentro_id = $2 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		formulaID, encuentroID,
	).Scan(&rowID, &estadoActual)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			responderError(w, http.StatusNotFound, "fórmula no encontrada")
		} else {
			responderError(w, http.StatusInternalServerError, "error al verificar fórmula")
		}
		return
	}
	if estadoActual != "borrador" {
		responderError(w, http.StatusConflict, "la fórmula ya está finalizada")
		return
	}

	var tieneMedicamentos bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM formula_medicamento WHERE formula_id = $1)`, rowID,
	).Scan(&tieneMedicamentos)
	if !tieneMedicamentos {
		responderError(w, http.StatusBadRequest, "la fórmula debe tener al menos un medicamento para finalizar")
		return
	}

	if _, err := h.db.Exec(r.Context(),
		`UPDATE formula_medica SET estado = 'finalizado' WHERE id = $1`, rowID,
	); err != nil {
		log.Printf("finalizar formula %s: %v", formulaID, err)
		responderError(w, http.StatusInternalServerError, "error al finalizar fórmula")
		return
	}

	row := h.db.QueryRow(r.Context(), `SELECT `+columnasFormula+` FROM formula_medica WHERE id = $1`, rowID)
	f, err := escanearFormula(row)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al leer fórmula")
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

func insertarFormula(ctx context.Context, db formulaQuerier, formulaID, encuentroID string, input models.FormulaInput, creadoPor string) (models.Formula, error) {
	row := db.QueryRow(ctx, `
		INSERT INTO formula_medica (
			formula_id, numero_version, es_ultima_version, esta_activo, estado,
			encuentro_id, tipo, observaciones, creado_por
		) VALUES ($1, 1, TRUE, TRUE, 'borrador', $2, $3, $4, $5)
		RETURNING `+columnasFormula,
		formulaID, encuentroID, input.Tipo, input.Observaciones, creadoPor,
	)
	f, err := escanearFormula(row)
	if err != nil {
		return models.Formula{}, err
	}

	meds, err := insertarMedicamentos(ctx, db, f.ID, input.Medicamentos)
	if err != nil {
		return models.Formula{}, err
	}
	f.Medicamentos = meds
	return f, nil
}

// insertarMedicamentos descarta los medicamentos sin nombre (fila en blanco que el
// usuario aún no diligencia) — igual que encuentro_diagnostico con diagnósticos vacíos.
func insertarMedicamentos(ctx context.Context, db formulaQuerier, formulaRowID string, input []models.MedicamentoInput) ([]models.Medicamento, error) {
	meds := make([]models.Medicamento, 0, len(input))
	orden := 1
	for _, m := range input {
		if strings.TrimSpace(m.NombreMedicamento) == "" {
			continue
		}
		var med models.Medicamento
		err := db.QueryRow(ctx, `
			INSERT INTO formula_medicamento (
				formula_id, nombre_medicamento, concentracion, forma_farmaceutica,
				dosis, frecuencia, duracion_tratamiento, cantidad_dispensar,
				indicaciones, orden
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING id, formula_id, nombre_medicamento, concentracion, forma_farmaceutica,
			          dosis, frecuencia, duracion_tratamiento, cantidad_dispensar,
			          indicaciones, orden`,
			formulaRowID, strings.TrimSpace(m.NombreMedicamento), m.Concentracion, m.FormaFarmaceutica,
			m.Dosis, m.Frecuencia, m.DuracionTratamiento, m.CantidadDispensar,
			m.Indicaciones, orden,
		).Scan(
			&med.ID, &med.FormulaID, &med.NombreMedicamento, &med.Concentracion, &med.FormaFarmaceutica,
			&med.Dosis, &med.Frecuencia, &med.DuracionTratamiento, &med.CantidadDispensar,
			&med.Indicaciones, &med.Orden,
		)
		if err != nil {
			return nil, err
		}
		meds = append(meds, med)
		orden++
	}
	return meds, nil
}

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
