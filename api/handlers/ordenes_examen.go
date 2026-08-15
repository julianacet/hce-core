package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

func OrdenesExamenRouter(db *pgxpool.Pool) http.Handler {
	h := &ordenesExamenHandler{db: db}
	r := chi.NewRouter()

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Put("/{ordenId}", h.actualizar)
	r.Patch("/{ordenId}/finalizar", h.finalizar)
	r.Delete("/{ordenId}", h.eliminar)

	return r
}

type ordenesExamenHandler struct{ db *pgxpool.Pool }

// GET /pacientes/{documento}/encuentros/{encuentroId}/ordenes?estado=
func (h *ordenesExamenHandler) listar(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")
	estado := strings.TrimSpace(r.URL.Query().Get("estado"))
	if estado == "" {
		estado = "finalizado"
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT id, encuentro_id, estado, indicaciones_generales, fecha_creacion, creado_por
		FROM orden_examen
		WHERE encuentro_id = $1 AND estado = $2
		ORDER BY fecha_creacion ASC`, encuentroID, estado)
	if err != nil {
		log.Printf("listar ordenes examen: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar órdenes")
		return
	}
	defer rows.Close()

	ordenes := []models.OrdenExamen{}
	for rows.Next() {
		var o models.OrdenExamen
		if err := rows.Scan(&o.ID, &o.EncuentroID, &o.Estado, &o.IndicacionesGenerales, &o.FechaCreacion, &o.CreadoPor); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer orden")
			return
		}
		o.Items = []models.OrdenExamenItem{}
		ordenes = append(ordenes, o)
	}

	// Cargar items de todas las órdenes en una sola query
	if len(ordenes) > 0 {
		ids := make([]string, len(ordenes))
		idx := make(map[string]int)
		for i, o := range ordenes {
			ids[i] = o.ID
			idx[o.ID] = i
		}
		irows, err := h.db.Query(r.Context(), `
			SELECT id, orden_id, codigo_cups, descripcion, indicaciones, posicion
			FROM orden_examen_item
			WHERE orden_id = ANY($1)
			ORDER BY orden_id, posicion`, ids)
		if err == nil {
			defer irows.Close()
			for irows.Next() {
				var item models.OrdenExamenItem
				if err := irows.Scan(&item.ID, &item.OrdenID, &item.CodigoCups,
					&item.Descripcion, &item.Indicaciones, &item.Posicion); err == nil {
					i := idx[item.OrdenID]
					ordenes[i].Items = append(ordenes[i].Items, item)
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ordenes)
}

// POST /pacientes/{documento}/encuentros/{encuentroId}/ordenes  — crea borrador
func (h *ordenesExamenHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	encuentroID := chi.URLParam(r, "encuentroId")

	var input models.OrdenExamenInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al iniciar transacción")
		return
	}
	defer tx.Rollback(r.Context())

	var ordenID string
	err = tx.QueryRow(r.Context(), `
		INSERT INTO orden_examen (encuentro_id, estado, indicaciones_generales, creado_por)
		VALUES ($1, 'borrador', $2, $3) RETURNING id`,
		encuentroID, input.IndicacionesGenerales, u.Nombre,
	).Scan(&ordenID)
	if err != nil {
		log.Printf("crear orden examen: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear orden")
		return
	}

	items, err := insertarItemsOrden(r.Context(), tx, ordenID, input.Items)
	if err != nil {
		log.Printf("crear orden examen item: %v", err)
		responderError(w, http.StatusInternalServerError, "error al guardar examen")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		responderError(w, http.StatusInternalServerError, "error al confirmar transacción")
		return
	}

	// Leer fecha_creacion/estado del registro recién creado
	var orden models.OrdenExamen
	h.db.QueryRow(r.Context(), `
		SELECT id, encuentro_id, estado, indicaciones_generales, fecha_creacion, creado_por
		FROM orden_examen WHERE id = $1`, ordenID,
	).Scan(&orden.ID, &orden.EncuentroID, &orden.Estado, &orden.IndicacionesGenerales,
		&orden.FechaCreacion, &orden.CreadoPor)
	orden.Items = items

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(orden)
}

// PUT /pacientes/{documento}/encuentros/{encuentroId}/ordenes/{ordenId}  — actualiza borrador
func (h *ordenesExamenHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")
	ordenID := chi.URLParam(r, "ordenId")

	var input models.OrdenExamenInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}

	var estadoActual string
	err := h.db.QueryRow(r.Context(),
		`SELECT estado FROM orden_examen WHERE id = $1 AND encuentro_id = $2`,
		ordenID, encuentroID,
	).Scan(&estadoActual)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			responderError(w, http.StatusNotFound, "orden no encontrada")
		} else {
			responderError(w, http.StatusInternalServerError, "error al verificar orden")
		}
		return
	}
	if estadoActual != "borrador" {
		responderError(w, http.StatusConflict, "solo se pueden editar órdenes en borrador")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al iniciar transacción")
		return
	}
	defer tx.Rollback(r.Context())

	if _, err := tx.Exec(r.Context(),
		`UPDATE orden_examen SET indicaciones_generales = $1 WHERE id = $2`,
		input.IndicacionesGenerales, ordenID,
	); err != nil {
		responderError(w, http.StatusInternalServerError, "error al actualizar borrador")
		return
	}
	if _, err := tx.Exec(r.Context(), `DELETE FROM orden_examen_item WHERE orden_id = $1`, ordenID); err != nil {
		responderError(w, http.StatusInternalServerError, "error al actualizar borrador")
		return
	}
	items, err := insertarItemsOrden(r.Context(), tx, ordenID, input.Items)
	if err != nil {
		log.Printf("actualizar borrador orden %s: %v", ordenID, err)
		responderError(w, http.StatusInternalServerError, "error al actualizar borrador")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		responderError(w, http.StatusInternalServerError, "error al confirmar transacción")
		return
	}

	var orden models.OrdenExamen
	h.db.QueryRow(r.Context(), `
		SELECT id, encuentro_id, estado, indicaciones_generales, fecha_creacion, creado_por
		FROM orden_examen WHERE id = $1`, ordenID,
	).Scan(&orden.ID, &orden.EncuentroID, &orden.Estado, &orden.IndicacionesGenerales,
		&orden.FechaCreacion, &orden.CreadoPor)
	orden.Items = items

	responderJSON(w, http.StatusOK, orden)
}

// PATCH /pacientes/{documento}/encuentros/{encuentroId}/ordenes/{ordenId}/finalizar
func (h *ordenesExamenHandler) finalizar(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")
	ordenID := chi.URLParam(r, "ordenId")

	var estadoActual string
	err := h.db.QueryRow(r.Context(),
		`SELECT estado FROM orden_examen WHERE id = $1 AND encuentro_id = $2`,
		ordenID, encuentroID,
	).Scan(&estadoActual)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			responderError(w, http.StatusNotFound, "orden no encontrada")
		} else {
			responderError(w, http.StatusInternalServerError, "error al verificar orden")
		}
		return
	}
	if estadoActual != "borrador" {
		responderError(w, http.StatusConflict, "la orden ya está finalizada")
		return
	}

	var tieneItems bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM orden_examen_item WHERE orden_id = $1)`, ordenID,
	).Scan(&tieneItems)
	if !tieneItems {
		responderError(w, http.StatusBadRequest, "la orden debe tener al menos un examen para finalizar")
		return
	}

	if _, err := h.db.Exec(r.Context(),
		`UPDATE orden_examen SET estado = 'finalizado' WHERE id = $1`, ordenID,
	); err != nil {
		log.Printf("finalizar orden examen %s: %v", ordenID, err)
		responderError(w, http.StatusInternalServerError, "error al finalizar orden")
		return
	}

	var orden models.OrdenExamen
	h.db.QueryRow(r.Context(), `
		SELECT id, encuentro_id, estado, indicaciones_generales, fecha_creacion, creado_por
		FROM orden_examen WHERE id = $1`, ordenID,
	).Scan(&orden.ID, &orden.EncuentroID, &orden.Estado, &orden.IndicacionesGenerales,
		&orden.FechaCreacion, &orden.CreadoPor)

	irows, err := h.db.Query(r.Context(), `
		SELECT id, orden_id, codigo_cups, descripcion, indicaciones, posicion
		FROM orden_examen_item WHERE orden_id = $1 ORDER BY posicion`, ordenID)
	if err == nil {
		defer irows.Close()
		for irows.Next() {
			var item models.OrdenExamenItem
			if err := irows.Scan(&item.ID, &item.OrdenID, &item.CodigoCups,
				&item.Descripcion, &item.Indicaciones, &item.Posicion); err == nil {
				orden.Items = append(orden.Items, item)
			}
		}
	}

	responderJSON(w, http.StatusOK, orden)
}

func (h *ordenesExamenHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" && u.Rol != "medico" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar órdenes")
		return
	}
	ordenID := chi.URLParam(r, "ordenId")
	tag, err := h.db.Exec(r.Context(), `DELETE FROM orden_examen WHERE id = $1`, ordenID)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al eliminar orden")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "orden no encontrada")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── helpers ──────────────────────────────────────────────────────────────────

// insertarItemsOrden descarta los ítems sin descripción (fila en blanco que el
// usuario aún no diligencia) — igual que encuentro_diagnostico con diagnósticos vacíos.
func insertarItemsOrden(ctx context.Context, tx pgx.Tx, ordenID string, input []models.OrdenExamenItemInput) ([]models.OrdenExamenItem, error) {
	items := make([]models.OrdenExamenItem, 0, len(input))
	posicion := 1
	for _, item := range input {
		descripcion := strings.TrimSpace(item.Descripcion)
		if descripcion == "" {
			continue
		}
		var itemID string
		err := tx.QueryRow(ctx, `
			INSERT INTO orden_examen_item (orden_id, codigo_cups, descripcion, indicaciones, posicion)
			VALUES ($1, $2, $3, $4, $5) RETURNING id`,
			ordenID, item.CodigoCups, descripcion, item.Indicaciones, posicion,
		).Scan(&itemID)
		if err != nil {
			return nil, err
		}
		items = append(items, models.OrdenExamenItem{
			ID: itemID, OrdenID: ordenID,
			CodigoCups: item.CodigoCups, Descripcion: descripcion,
			Indicaciones: item.Indicaciones, Posicion: posicion,
		})
		posicion++
	}
	return items, nil
}
