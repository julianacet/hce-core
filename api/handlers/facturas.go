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
	r.Route("/{facturaId}", func(r chi.Router) {
		r.Get("/", h.obtener)
		r.Put("/", h.actualizar)
		r.Patch("/anular", h.anular)
		r.Delete("/", h.eliminar)
	})
	return r
}

// GET /facturas?q=
func (h *FacturaHandler) listar(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")

	type FacturaResumen struct {
		models.Factura
		PacienteNombre string `json:"paciente_nombre"`
	}

	var rows interface{ Next() bool; Scan(...any) error; Close() }
	var err error

	if q != "" {
		param := "%" + q + "%"
		rows, err = h.db.Query(r.Context(), `
			SELECT f.id, f.factura_id, f.numero_version, f.paciente_documento,
			       f.estado, f.subtotal, f.total, f.fecha_creacion, f.creado_por,
			       CONCAT_WS(' ', p.nombre_primero, p.nombre_segundo, p.apellido_primero, p.apellido_segundo) AS paciente_nombre
			FROM factura f
			LEFT JOIN paciente p ON p.numero_documento = f.paciente_documento
			  AND p.es_ultima_version = TRUE AND p.esta_activo = TRUE
			WHERE f.es_ultima_version = TRUE AND f.esta_activo = TRUE
			  AND (p.numero_documento ILIKE $1
			       OR p.nombre_primero ILIKE $1 OR p.nombre_segundo ILIKE $1
			       OR p.apellido_primero ILIKE $1 OR p.apellido_segundo ILIKE $1)
			ORDER BY f.fecha_creacion DESC
			LIMIT 100`, param)
	} else {
		rows, err = h.db.Query(r.Context(), `
			SELECT f.id, f.factura_id, f.numero_version, f.paciente_documento,
			       f.estado, f.subtotal, f.total, f.fecha_creacion, f.creado_por,
			       CONCAT_WS(' ', p.nombre_primero, p.nombre_segundo, p.apellido_primero, p.apellido_segundo) AS paciente_nombre
			FROM factura f
			LEFT JOIN paciente p ON p.numero_documento = f.paciente_documento
			  AND p.es_ultima_version = TRUE AND p.esta_activo = TRUE
			WHERE f.es_ultima_version = TRUE AND f.esta_activo = TRUE
			ORDER BY f.fecha_creacion DESC
			LIMIT 100`)
	}
	if err != nil {
		log.Printf("listar facturas: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar facturas")
		return
	}
	defer rows.Close()

	facturas := make([]FacturaResumen, 0)
	for rows.Next() {
		var f FacturaResumen
		if err := rows.Scan(
			&f.ID, &f.FacturaID, &f.NumeroVersion, &f.PacienteDocumento,
			&f.Estado, &f.Subtotal, &f.Total, &f.FechaCreacion, &f.CreadoPor,
			&f.PacienteNombre,
		); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer factura")
			return
		}
		f.Items = []models.FacturaItem{}
		facturas = append(facturas, f)
	}

	responderJSON(w, http.StatusOK, facturas)
}

// GET /facturas/{facturaId}
func (h *FacturaHandler) obtener(w http.ResponseWriter, r *http.Request) {
	facturaID := chi.URLParam(r, "facturaId")

	var f models.Factura
	err := h.db.QueryRow(r.Context(), `
		SELECT id, factura_id, numero_version, paciente_documento,
		       estado, subtotal, total, fecha_creacion, creado_por
		FROM factura
		WHERE factura_id = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		facturaID,
	).Scan(
		&f.ID, &f.FacturaID, &f.NumeroVersion, &f.PacienteDocumento,
		&f.Estado, &f.Subtotal, &f.Total, &f.FechaCreacion, &f.CreadoPor,
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

// POST /facturas   body: { paciente_documento, items }
func (h *FacturaHandler) crear(w http.ResponseWriter, r *http.Request) {
	var input struct {
		PacienteDocumento string                 `json:"paciente_documento"`
		Items             []models.FacturaItemInput `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if input.PacienteDocumento == "" {
		responderError(w, http.StatusBadRequest, "paciente_documento es obligatorio")
		return
	}
	if len(input.Items) == 0 {
		responderError(w, http.StatusBadRequest, "la factura debe tener al menos un item")
		return
	}

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
		                     paciente_documento, estado, subtotal, total, creado_por)
		VALUES ($1, 1, TRUE, TRUE, $2, 'activa', $3, $3, $4)
		RETURNING id`,
		facturaEntityID, input.PacienteDocumento, subtotal, u.Nombre,
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

	var f models.Factura
	h.db.QueryRow(r.Context(), `
		SELECT id, factura_id, numero_version, paciente_documento,
		       estado, subtotal, total, fecha_creacion, creado_por
		FROM factura WHERE id = $1`, rowID,
	).Scan(
		&f.ID, &f.FacturaID, &f.NumeroVersion, &f.PacienteDocumento,
		&f.Estado, &f.Subtotal, &f.Total, &f.FechaCreacion, &f.CreadoPor,
	)
	items, _ := obtenerItems(r.Context(), h.db, rowID)
	f.Items = items

	responderJSON(w, http.StatusCreated, f)
}

// PUT /facturas/{facturaId}  — reemplaza los ítems de una factura activa
func (h *FacturaHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	facturaID := chi.URLParam(r, "facturaId")

	var estadoActual string
	var rowID string
	err := h.db.QueryRow(r.Context(),
		`SELECT id, estado FROM factura WHERE factura_id=$1 AND es_ultima_version=TRUE AND esta_activo=TRUE`,
		facturaID,
	).Scan(&rowID, &estadoActual)
	if err != nil {
		responderError(w, http.StatusNotFound, "factura no encontrada")
		return
	}
	if estadoActual != "activa" {
		responderError(w, http.StatusUnprocessableEntity, "solo se puede editar una factura activa")
		return
	}

	var input struct {
		Items []models.FacturaItemInput `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if len(input.Items) == 0 {
		responderError(w, http.StatusBadRequest, "la factura debe tener al menos un item")
		return
	}

	var subtotal float64
	for _, item := range input.Items {
		if item.Cantidad <= 0 || item.ValorUnitario < 0 {
			responderError(w, http.StatusBadRequest, "cantidad y valor_unitario deben ser positivos")
			return
		}
		subtotal += float64(item.Cantidad) * item.ValorUnitario
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al iniciar transacción")
		return
	}
	defer tx.Rollback(r.Context())

	if _, err = tx.Exec(r.Context(), `DELETE FROM factura_item WHERE factura_id=$1`, rowID); err != nil {
		log.Printf("eliminar items factura: %v", err)
		responderError(w, http.StatusInternalServerError, "error al actualizar items")
		return
	}

	for i, item := range input.Items {
		itemSubtotal := float64(item.Cantidad) * item.ValorUnitario
		if _, err = tx.Exec(r.Context(),
			`INSERT INTO factura_item (factura_id, codigo_cups, descripcion, valor_unitario, cantidad, subtotal, orden)
			 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			rowID, item.CodigoCups, item.Descripcion, item.ValorUnitario, item.Cantidad, itemSubtotal, i+1,
		); err != nil {
			log.Printf("insertar item factura: %v", err)
			responderError(w, http.StatusInternalServerError, "error al guardar item")
			return
		}
	}

	if _, err = tx.Exec(r.Context(),
		`UPDATE factura SET subtotal=$1, total=$1 WHERE id=$2`,
		subtotal, rowID,
	); err != nil {
		responderError(w, http.StatusInternalServerError, "error al actualizar totales")
		return
	}

	if err = tx.Commit(r.Context()); err != nil {
		responderError(w, http.StatusInternalServerError, "error al confirmar transacción")
		return
	}

	var f models.Factura
	h.db.QueryRow(r.Context(), `
		SELECT id, factura_id, numero_version, paciente_documento,
		       estado, subtotal, total, fecha_creacion, creado_por
		FROM factura WHERE id=$1`, rowID,
	).Scan(&f.ID, &f.FacturaID, &f.NumeroVersion, &f.PacienteDocumento,
		&f.Estado, &f.Subtotal, &f.Total, &f.FechaCreacion, &f.CreadoPor)
	items, _ := obtenerItems(r.Context(), h.db, rowID)
	f.Items = items

	responderJSON(w, http.StatusOK, f)
}

// PATCH /facturas/{facturaId}/anular
func (h *FacturaHandler) anular(w http.ResponseWriter, r *http.Request) {
	facturaID := chi.URLParam(r, "facturaId")

	var estadoActual string
	err := h.db.QueryRow(r.Context(),
		`SELECT estado FROM factura WHERE factura_id = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		facturaID,
	).Scan(&estadoActual)
	if err != nil {
		responderError(w, http.StatusNotFound, "factura no encontrada")
		return
	}
	if estadoActual == "anulada" {
		responderError(w, http.StatusUnprocessableEntity, "la factura ya está anulada")
		return
	}

	_, err = h.db.Exec(r.Context(),
		`UPDATE factura SET estado = 'anulada' WHERE factura_id = $1 AND es_ultima_version = TRUE`,
		facturaID,
	)
	if err != nil {
		log.Printf("anular factura: %v", err)
		responderError(w, http.StatusInternalServerError, "error al anular factura")
		return
	}

	var f models.Factura
	h.db.QueryRow(r.Context(), `
		SELECT id, factura_id, numero_version, paciente_documento,
		       estado, subtotal, total, fecha_creacion, creado_por
		FROM factura WHERE factura_id = $1 AND es_ultima_version = TRUE`, facturaID,
	).Scan(
		&f.ID, &f.FacturaID, &f.NumeroVersion, &f.PacienteDocumento,
		&f.Estado, &f.Subtotal, &f.Total, &f.FechaCreacion, &f.CreadoPor,
	)
	items, _ := obtenerItems(r.Context(), h.db, f.ID)
	f.Items = items

	responderJSON(w, http.StatusOK, f)
}

// DELETE /facturas/{facturaId} — elimina todas las versiones de la factura
func (h *FacturaHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar facturas")
		return
	}
	facturaID := chi.URLParam(r, "facturaId")
	tag, err := h.db.Exec(r.Context(),
		`DELETE FROM factura WHERE factura_id=$1`, facturaID)
	if err != nil {
		log.Printf("eliminar factura: %v", err)
		responderError(w, http.StatusInternalServerError, "error al eliminar factura")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "factura no encontrada")
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
