package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

func OrdenesExamenRouter(db *pgxpool.Pool) http.Handler {
	h := &ordenesExamenHandler{db: db}
	r := chi.NewRouter()

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Delete("/{ordenId}", h.eliminar)

	return r
}

type ordenesExamenHandler struct{ db *pgxpool.Pool }

func (h *ordenesExamenHandler) listar(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")

	rows, err := h.db.Query(r.Context(), `
		SELECT id, encuentro_id, indicaciones_generales, fecha_creacion, creado_por
		FROM orden_examen
		WHERE encuentro_id = $1
		ORDER BY fecha_creacion ASC`, encuentroID)
	if err != nil {
		log.Printf("listar ordenes examen: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar órdenes")
		return
	}
	defer rows.Close()

	ordenes := []models.OrdenExamen{}
	for rows.Next() {
		var o models.OrdenExamen
		if err := rows.Scan(&o.ID, &o.EncuentroID, &o.IndicacionesGenerales, &o.FechaCreacion, &o.CreadoPor); err != nil {
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

func (h *ordenesExamenHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	encuentroID := chi.URLParam(r, "encuentroId")

	var input models.OrdenExamenInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if len(input.Items) == 0 {
		responderError(w, http.StatusBadRequest, "la orden debe tener al menos un examen")
		return
	}
	for _, item := range input.Items {
		if strings.TrimSpace(item.Descripcion) == "" {
			responderError(w, http.StatusBadRequest, "cada examen debe tener descripción")
			return
		}
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al iniciar transacción")
		return
	}
	defer tx.Rollback(r.Context())

	var ordenID string
	err = tx.QueryRow(r.Context(), `
		INSERT INTO orden_examen (encuentro_id, indicaciones_generales, creado_por)
		VALUES ($1, $2, $3) RETURNING id`,
		encuentroID, input.IndicacionesGenerales, u.Nombre,
	).Scan(&ordenID)
	if err != nil {
		log.Printf("crear orden examen: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear orden")
		return
	}

	items := make([]models.OrdenExamenItem, 0, len(input.Items))
	for i, item := range input.Items {
		var itemID string
		err = tx.QueryRow(r.Context(), `
			INSERT INTO orden_examen_item (orden_id, codigo_cups, descripcion, indicaciones, posicion)
			VALUES ($1, $2, $3, $4, $5) RETURNING id`,
			ordenID, item.CodigoCups,
			strings.TrimSpace(item.Descripcion), item.Indicaciones, i+1,
		).Scan(&itemID)
		if err != nil {
			log.Printf("crear orden examen item: %v", err)
			responderError(w, http.StatusInternalServerError, "error al guardar examen")
			return
		}
		items = append(items, models.OrdenExamenItem{
			ID: itemID, OrdenID: ordenID,
			CodigoCups: item.CodigoCups, Descripcion: strings.TrimSpace(item.Descripcion),
			Indicaciones: item.Indicaciones, Posicion: i + 1,
		})
	}

	if err := tx.Commit(r.Context()); err != nil {
		responderError(w, http.StatusInternalServerError, "error al confirmar transacción")
		return
	}

	// Leer fecha_creacion del registro recién creado
	var orden models.OrdenExamen
	h.db.QueryRow(r.Context(), `
		SELECT id, encuentro_id, indicaciones_generales, fecha_creacion, creado_por
		FROM orden_examen WHERE id = $1`, ordenID,
	).Scan(&orden.ID, &orden.EncuentroID, &orden.IndicacionesGenerales,
		&orden.FechaCreacion, &orden.CreadoPor)
	orden.Items = items

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(orden)
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
