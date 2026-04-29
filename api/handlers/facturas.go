package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

type FacturaHandler struct {
	db *pgxpool.Pool
}

func FacturasRouter(db *pgxpool.Pool) http.Handler {
	h := &FacturaHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Get("/{facturaId}", h.obtener)
	return r
}

// GET /pacientes/{doc}/encuentros/{encId}/facturas
func (h *FacturaHandler) listar(w http.ResponseWriter, r *http.Request) {
	encuentroID := chi.URLParam(r, "encuentroId")

	rows, err := h.db.Query(r.Context(), `
		SELECT id, factura_id, numero_version, encuentro_id, paciente_documento,
		       estado, fecha_emision, subtotal, total, fecha_creacion, creado_por
		FROM factura
		WHERE encuentro_id = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE
		ORDER BY fecha_creacion DESC`,
		encuentroID,
	)
	if err != nil {
		log.Printf("listar facturas: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar facturas")
		return
	}
	defer rows.Close()

	facturas := make([]models.Factura, 0)
	for rows.Next() {
		var f models.Factura
		if err := rows.Scan(
			&f.ID, &f.FacturaID, &f.NumeroVersion, &f.EncuentroID, &f.PacienteDocumento,
			&f.Estado, &f.FechaEmision, &f.Subtotal, &f.Total, &f.FechaCreacion, &f.CreadoPor,
		); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer factura")
			return
		}
		f.Items = []models.FacturaItem{}
		facturas = append(facturas, f)
	}

	responderJSON(w, http.StatusOK, facturas)
}

// GET /pacientes/{doc}/encuentros/{encId}/facturas/{facturaId}
func (h *FacturaHandler) obtener(w http.ResponseWriter, r *http.Request) {
	facturaID := chi.URLParam(r, "facturaId")

	var f models.Factura
	err := h.db.QueryRow(r.Context(), `
		SELECT id, factura_id, numero_version, encuentro_id, paciente_documento,
		       estado, fecha_emision, subtotal, total, fecha_creacion, creado_por
		FROM factura
		WHERE factura_id = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		facturaID,
	).Scan(
		&f.ID, &f.FacturaID, &f.NumeroVersion, &f.EncuentroID, &f.PacienteDocumento,
		&f.Estado, &f.FechaEmision, &f.Subtotal, &f.Total, &f.FechaCreacion, &f.CreadoPor,
	)
	if err != nil {
		responderError(w, http.StatusNotFound, "factura no encontrada")
		return
	}

	items, err := obtenerItems(r.Context(), h.db, f.ID)
	if err != nil {
		log.Printf("obtener items factura: %v", err)
		responderError(w, http.StatusInternalServerError, "error al leer items")
		return
	}
	f.Items = items

	responderJSON(w, http.StatusOK, f)
}


// POST /pacientes/{doc}/encuentros/{encId}/facturas
func (h *FacturaHandler) crear(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")
	encuentroID := chi.URLParam(r, "encuentroId")

	var input models.FacturaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if len(input.Items) == 0 {
		responderError(w, http.StatusBadRequest, "la factura debe tener al menos un item")
		return
	}

	// Calcular totales
	var subtotal float64
	for _, item := range input.Items {
		if item.Cantidad <= 0 || item.ValorUnitario < 0 {
			responderError(w, http.StatusBadRequest, "cantidad y valor_unitario deben ser positivos")
			return
		}
		subtotal += float64(item.Cantidad) * item.ValorUnitario
	}

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	facturaEntityID := uuid.New().String()

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al iniciar transacción")
		return
	}
	defer tx.Rollback(r.Context())

	var rowID string
	err = tx.QueryRow(r.Context(), `
		INSERT INTO factura (factura_id, numero_version, es_ultima_version, esta_activo,
		                     encuentro_id, paciente_documento, estado, subtotal, total, creado_por)
		VALUES ($1, 1, TRUE, TRUE, $2, $3, 'borrador', $4, $4, $5)
		RETURNING id`,
		facturaEntityID, encuentroID, documento, subtotal, u.Nombre,
	).Scan(&rowID)
	if err != nil {
		log.Printf("crear factura: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear factura")
		return
	}

	for i, item := range input.Items {
		itemSubtotal := float64(item.Cantidad) * item.ValorUnitario
		_, err = tx.Exec(r.Context(), `
			INSERT INTO factura_item (factura_id, codigo_cups, descripcion, valor_unitario, cantidad, subtotal, orden)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			rowID, item.CodigoCups, item.Descripcion, item.ValorUnitario, item.Cantidad, itemSubtotal, i+1,
		)
		if err != nil {
			log.Printf("crear factura_item: %v", err)
			responderError(w, http.StatusInternalServerError, "error al guardar item de factura")
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		responderError(w, http.StatusInternalServerError, "error al confirmar transacción")
		return
	}

	// Devolver la factura completa
	var f models.Factura
	h.db.QueryRow(r.Context(), `
		SELECT id, factura_id, numero_version, encuentro_id, paciente_documento,
		       estado, fecha_emision, subtotal, total, fecha_creacion, creado_por
		FROM factura WHERE id = $1`, rowID,
	).Scan(
		&f.ID, &f.FacturaID, &f.NumeroVersion, &f.EncuentroID, &f.PacienteDocumento,
		&f.Estado, &f.FechaEmision, &f.Subtotal, &f.Total, &f.FechaCreacion, &f.CreadoPor,
	)
	items, _ := obtenerItems(r.Context(), h.db, rowID)
	f.Items = items

	responderJSON(w, http.StatusCreated, f)
}

func obtenerItems(ctx context.Context, db *pgxpool.Pool, facturaRowID string) ([]models.FacturaItem, error) {
	rows, err := db.Query(ctx, `
		SELECT id, codigo_cups, descripcion, valor_unitario, cantidad, subtotal, orden
		FROM factura_item WHERE factura_id = $1 ORDER BY orden`,
		facturaRowID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.FacturaItem, 0)
	for rows.Next() {
		var item models.FacturaItem
		if err := rows.Scan(&item.ID, &item.CodigoCups, &item.Descripcion,
			&item.ValorUnitario, &item.Cantidad, &item.Subtotal, &item.Orden); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
