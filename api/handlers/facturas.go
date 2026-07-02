package handlers

import (
	"context"
	"encoding/json"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
	"hce/api/repository"
)

type FacturaHandler struct {
	db *pgxpool.Pool
}

func FacturasRouter(db *pgxpool.Pool) http.Handler {
	h := &FacturaHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Get("/vinculacion-preview", h.vinculacionPreview)
	r.Route("/{facturaId}", func(r chi.Router) {
		r.Get("/", h.obtener)
		r.Put("/", h.actualizar)
		r.Patch("/anular", h.anular)
		r.Delete("/", h.eliminar)
		r.Post("/imprimir-termica", ImprimirTermicaFactura(db))
	})
	return r
}

// GET /facturas/vinculacion-preview?paciente=<doc>
// Devuelve el encuentro finalizado más antiguo sin factura del paciente que
// sería vinculado al crear una factura. Devuelve null si no hay ninguno.
func (h *FacturaHandler) vinculacionPreview(w http.ResponseWriter, r *http.Request) {
	paciente := r.URL.Query().Get("paciente")
	if paciente == "" {
		responderError(w, http.StatusBadRequest, "paciente es obligatorio")
		return
	}

	type resultado struct {
		EncuentroID    string `json:"encuentro_id"`
		FechaAtencion  string `json:"fecha_atencion"`
		MotivoConsulta string `json:"motivo_consulta"`
		FinalidadNombre string `json:"finalidad_nombre"`
	}

	var res resultado
	err := h.db.QueryRow(r.Context(), `
		SELECT
			ec.encuentro_id,
			ec.fecha_atencion::text,
			ec.motivo_consulta,
			CASE ec.finalidad_consulta
				WHEN '10' THEN 'Consulta de primera vez'
				WHEN '11' THEN 'Consulta de control o seguimiento'
				WHEN '12' THEN 'Urgencias'
				ELSE ec.finalidad_consulta
			END
		FROM encuentro_clinico ec
		WHERE ec.paciente_documento = $1
		  AND ec.es_ultima_version = TRUE AND ec.esta_activo = TRUE
		  AND ec.estado = 'finalizado'
		  AND NOT EXISTS (
		      SELECT 1 FROM factura f
		      WHERE f.encuentro_id = ec.id AND f.es_ultima_version = TRUE
		  )
		  AND NOT (
		      ec.finalidad_consulta = '11'
		      AND COALESCE(
		          (SELECT (medico->>'primer_control_gratis')::boolean
		           FROM configuracion_sistema WHERE id = 1),
		          TRUE
		      )
		      AND NOT EXISTS (
		          SELECT 1 FROM encuentro_clinico ec2
		          WHERE ec2.encuentro_padre_id = ec.encuentro_padre_id
		            AND ec2.finalidad_consulta = '11'
		            AND ec2.es_ultima_version = TRUE AND ec2.esta_activo = TRUE
		            AND ec2.id != ec.id
		      )
		  )
		ORDER BY ec.fecha_atencion ASC
		LIMIT 1`,
		paciente,
	).Scan(&res.EncuentroID, &res.FechaAtencion, &res.MotivoConsulta, &res.FinalidadNombre)

	if err != nil {
		// Sin resultados — devolver null explícito
		responderJSON(w, http.StatusOK, nil)
		return
	}

	responderJSON(w, http.StatusOK, res)
}

// GET /facturas?q=  (legacy — retorna array, límite 100)
// GET /facturas?page=1&limit=25&q=&estado=&desde=&hasta=  (paginado, retorna {facturas, total})
func (h *FacturaHandler) listar(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("page") != "" {
		h.listarPaginado(w, r)
		return
	}

	type FacturaResumen struct {
		models.Factura
		PacienteNombre string `json:"paciente_nombre"`
	}

	q := r.URL.Query().Get("q")
	var param string
	whereExtra := ""
	if q != "" {
		param = "%" + q + "%"
		whereExtra = ` AND (f.paciente_documento ILIKE $1
			       OR p.nombre_primero ILIKE $1 OR p.nombre_segundo ILIKE $1
			       OR p.apellido_primero ILIKE $1 OR p.apellido_segundo ILIKE $1)`
	}

	baseSQL := `
		SELECT f.id, f.factura_id, f.numero_version, f.paciente_documento,
		       f.estado, f.subtotal, f.total, f.fecha_creacion, f.creado_por,
		       CONCAT_WS(' ', p.nombre_primero, p.nombre_segundo, p.apellido_primero, p.apellido_segundo) AS paciente_nombre
		FROM factura f
		LEFT JOIN paciente p ON p.numero_documento = f.paciente_documento
		  AND p.es_ultima_version = TRUE AND p.esta_activo = TRUE
		WHERE f.es_ultima_version = TRUE AND f.esta_activo = TRUE` +
		whereExtra + ` ORDER BY f.fecha_creacion DESC LIMIT 100`

	var rows pgx.Rows
	var err error
	if q != "" {
		rows, err = h.db.Query(r.Context(), baseSQL, param)
	} else {
		rows, err = h.db.Query(r.Context(), baseSQL)
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

func (h *FacturaHandler) listarPaginado(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	estado := strings.TrimSpace(r.URL.Query().Get("estado"))
	desde := strings.TrimSpace(r.URL.Query().Get("desde"))
	hasta := strings.TrimSpace(r.URL.Query().Get("hasta"))
	exportar := r.URL.Query().Get("export") == "1"

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit

	const joinSQL = `
		FROM factura f
		LEFT JOIN paciente p ON p.numero_documento = f.paciente_documento
		  AND p.es_ultima_version = TRUE AND p.esta_activo = TRUE`

	var args argList
	where := "WHERE f.es_ultima_version = TRUE AND f.esta_activo = TRUE"

	if q != "" {
		like := "%" + strings.ToLower(q) + "%"
		ph := args.Add(like)
		where += ` AND (f.paciente_documento ILIKE ` + ph +
			` OR LOWER(CONCAT_WS(' ', p.nombre_primero, p.nombre_segundo, p.apellido_primero, p.apellido_segundo)) LIKE ` + ph + `)`
	}
	if estado != "" {
		where += ` AND f.estado = ` + args.Add(estado)
	}
	if desde != "" {
		where += ` AND f.fecha_creacion::date >= ` + args.Add(desde) + `::date`
	}
	if hasta != "" {
		where += ` AND f.fecha_creacion::date <= ` + args.Add(hasta) + `::date`
	}

	var total int
	if err := h.db.QueryRow(r.Context(),
		`SELECT COUNT(*) `+joinSQL+` `+where, args.Slice()...,
	).Scan(&total); err != nil {
		log.Printf("listarPaginado facturas count: %v", err)
		responderError(w, http.StatusInternalServerError, "error al contar facturas")
		return
	}

	orderDir := "DESC"
	if strings.ToLower(strings.TrimSpace(r.URL.Query().Get("dir"))) == "asc" {
		orderDir = "ASC"
	}
	var orderByClause string
	switch strings.TrimSpace(r.URL.Query().Get("orden")) {
	case "paciente":
		orderByClause = "p.nombre_primero " + orderDir + ", p.apellido_primero " + orderDir
	case "total":
		orderByClause = "f.total " + orderDir
	case "estado":
		orderByClause = "f.estado " + orderDir
	default:
		orderByClause = "f.fecha_creacion " + orderDir
	}

	selectSQL := `
		SELECT f.id, f.factura_id, f.numero_version, f.paciente_documento,
		       f.estado, f.subtotal, f.total, f.fecha_creacion, f.creado_por,
		       CONCAT_WS(' ', p.nombre_primero, p.nombre_segundo, p.apellido_primero, p.apellido_segundo) AS paciente_nombre` +
		joinSQL + ` ` + where + ` ORDER BY ` + orderByClause

	var queryArgs []any
	if exportar {
		queryArgs = args.Slice()
	} else {
		selectSQL += ` LIMIT ` + args.Add(limit) + ` OFFSET ` + args.Add(offset)
		queryArgs = args.Slice()
	}

	rows, err := h.db.Query(r.Context(), selectSQL, queryArgs...)
	if err != nil {
		log.Printf("listarPaginado facturas query: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar facturas")
		return
	}
	defer rows.Close()

	type FacturaResumen struct {
		models.Factura
		PacienteNombre string `json:"paciente_nombre"`
	}

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

	responderJSON(w, http.StatusOK, map[string]any{
		"facturas": facturas,
		"total":    total,
	})
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
		PacienteDocumento string                   `json:"paciente_documento"`
		FechaCreacion     string                   `json:"fecha_creacion"`
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

	var subtotalCentavos int64
	for i := range input.Items {
		input.Items[i].Descripcion = strings.TrimSpace(input.Items[i].Descripcion)
		input.Items[i].CodigoCups = strings.TrimSpace(input.Items[i].CodigoCups)
		item := input.Items[i]
		if item.Descripcion == "" {
			responderError(w, http.StatusBadRequest, "cada item debe tener una descripción")
			return
		}
		if item.Cantidad <= 0 || item.ValorUnitario < 0 {
			responderError(w, http.StatusBadRequest, "cantidad y valor_unitario deben ser positivos")
			return
		}
		subtotalCentavos += int64(item.Cantidad) * int64(math.Round(item.ValorUnitario*100))
	}
	subtotal := float64(subtotalCentavos) / 100

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	facturaEntityID := uuid.New().String()
	var rowID string

	fechaCreacion := input.FechaCreacion
	if fechaCreacion == "" {
		fechaCreacion = time.Now().Format("2006-01-02")
	}

	if err := repository.ExecTx(r.Context(), h.db, func(tx pgx.Tx) error {
		if err := tx.QueryRow(r.Context(), `
			INSERT INTO factura (factura_id, numero_version, es_ultima_version, esta_activo,
			                     paciente_documento, estado, subtotal, total, creado_por, fecha_creacion)
			VALUES ($1, 1, TRUE, TRUE, $2, 'activa', $3, $3, $4, $5::date)
			RETURNING id`,
			facturaEntityID, input.PacienteDocumento, subtotal, u.Nombre, fechaCreacion,
		).Scan(&rowID); err != nil {
			return err
		}
		for i, item := range input.Items {
			itemSubtotal := float64(int64(item.Cantidad)*int64(math.Round(item.ValorUnitario*100))) / 100
			if _, err := tx.Exec(r.Context(), `
				INSERT INTO factura_item (factura_id, codigo_cups, descripcion, valor_unitario, cantidad, subtotal, orden)
				VALUES ($1, NULLIF($2, ''), $3, $4, $5, $6, $7)`,
				rowID, item.CodigoCups, item.Descripcion, item.ValorUnitario, item.Cantidad, itemSubtotal, i+1,
			); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		log.Printf("crear factura: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear factura")
		return
	}

	vincularFacturaConEncuentro(r.Context(), h.db, input.PacienteDocumento, rowID)

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

	var subtotalCentavos int64
	for i := range input.Items {
		input.Items[i].Descripcion = strings.TrimSpace(input.Items[i].Descripcion)
		input.Items[i].CodigoCups = strings.TrimSpace(input.Items[i].CodigoCups)
		item := input.Items[i]
		if item.Descripcion == "" {
			responderError(w, http.StatusBadRequest, "cada item debe tener una descripción")
			return
		}
		if item.Cantidad <= 0 || item.ValorUnitario < 0 {
			responderError(w, http.StatusBadRequest, "cantidad y valor_unitario deben ser positivos")
			return
		}
		subtotalCentavos += int64(item.Cantidad) * int64(math.Round(item.ValorUnitario*100))
	}
	subtotal := float64(subtotalCentavos) / 100

	if err := repository.ExecTx(r.Context(), h.db, func(tx pgx.Tx) error {
		if _, err := tx.Exec(r.Context(), `DELETE FROM factura_item WHERE factura_id=$1`, rowID); err != nil {
			return err
		}
		for i, item := range input.Items {
			itemSubtotal := float64(int64(item.Cantidad)*int64(math.Round(item.ValorUnitario*100))) / 100
			if _, err := tx.Exec(r.Context(),
				`INSERT INTO factura_item (factura_id, codigo_cups, descripcion, valor_unitario, cantidad, subtotal, orden)
				 VALUES ($1,NULLIF($2, ''),$3,$4,$5,$6,$7)`,
				rowID, item.CodigoCups, item.Descripcion, item.ValorUnitario, item.Cantidad, itemSubtotal, i+1,
			); err != nil {
				return err
			}
		}
		_, err := tx.Exec(r.Context(),
			`UPDATE factura SET subtotal=$1, total=$1 WHERE id=$2`,
			subtotal, rowID,
		)
		return err
	}); err != nil {
		log.Printf("actualizar factura: %v", err)
		responderError(w, http.StatusInternalServerError, "error al actualizar factura")
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
	if u.Rol != "admin" && u.Rol != "medico" {
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
		SELECT id, COALESCE(codigo_cups, ''), descripcion, valor_unitario, cantidad, subtotal, orden
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
