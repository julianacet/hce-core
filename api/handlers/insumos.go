package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"errors"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
	"hce/api/repository"
)

func InsumosRouter(db *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	h := &insumosHandler{db: db}

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Route("/{insumoId}", func(r chi.Router) {
		r.Put("/", h.actualizar)
		r.Patch("/toggle", h.toggle)
		r.Delete("/", h.eliminar)
		r.Get("/movimientos", h.listarMovimientos)
		r.Post("/movimientos", h.registrarMovimiento)
	})

	return r
}

type insumosHandler struct{ db *pgxpool.Pool }

func (h *insumosHandler) listar(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))

	query := `
		SELECT id, nombre, descripcion, unidad, stock_actual, stock_minimo,
		       lote, registro_invima, fecha_compra, fecha_vencimiento,
		       esta_activo, fecha_creacion, creado_por
		FROM insumo
		WHERE esta_activo = TRUE`
	args := []any{}

	if q != "" {
		args = append(args, "%"+strings.ToLower(q)+"%")
		query += ` AND LOWER(nombre) LIKE $1`
	}
	query += ` ORDER BY nombre ASC`

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		log.Printf("listar insumos: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar insumos")
		return
	}
	defer rows.Close()

	insumos := []models.Insumo{}
	for rows.Next() {
		var i models.Insumo
		if err := rows.Scan(&i.ID, &i.Nombre, &i.Descripcion, &i.Unidad,
			&i.StockActual, &i.StockMinimo,
			&i.Lote, &i.RegistroInvima, &i.FechaCompra, &i.FechaVencimiento,
			&i.EstaActivo, &i.FechaCreacion, &i.CreadoPor,
		); err != nil {
			log.Printf("escanear insumo: %v", err)
			responderError(w, http.StatusInternalServerError, "error al leer insumo")
			return
		}
		insumos = append(insumos, i)
	}

	responderJSON(w, http.StatusOK, insumos)
}

func (h *insumosHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())

	var input models.InsumoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if strings.TrimSpace(input.Nombre) == "" || strings.TrimSpace(input.Unidad) == "" {
		responderError(w, http.StatusBadRequest, "nombre y unidad son obligatorios")
		return
	}

	var i models.Insumo
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO insumo (nombre, descripcion, unidad, stock_minimo,
		                    lote, registro_invima, fecha_compra, fecha_vencimiento, creado_por)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, nombre, descripcion, unidad, stock_actual, stock_minimo,
		          lote, registro_invima, fecha_compra, fecha_vencimiento,
		          esta_activo, fecha_creacion, creado_por`,
		input.Nombre, input.Descripcion, input.Unidad, input.StockMinimo,
		input.Lote, input.RegistroInvima, input.FechaCompra, input.FechaVencimiento, u.Nombre,
	).Scan(&i.ID, &i.Nombre, &i.Descripcion, &i.Unidad,
		&i.StockActual, &i.StockMinimo,
		&i.Lote, &i.RegistroInvima, &i.FechaCompra, &i.FechaVencimiento,
		&i.EstaActivo, &i.FechaCreacion, &i.CreadoPor)
	if err != nil {
		log.Printf("crear insumo: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear insumo")
		return
	}

	responderJSON(w, http.StatusCreated, i)
}

func (h *insumosHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	insumoID := chi.URLParam(r, "insumoId")

	var input models.InsumoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}

	var i models.Insumo
	err := h.db.QueryRow(r.Context(), `
		UPDATE insumo SET nombre=$1, descripcion=$2, unidad=$3, stock_minimo=$4,
		    lote=$5, registro_invima=$6, fecha_compra=$7, fecha_vencimiento=$8
		WHERE id=$9 AND esta_activo=TRUE
		RETURNING id, nombre, descripcion, unidad, stock_actual, stock_minimo,
		          lote, registro_invima, fecha_compra, fecha_vencimiento,
		          esta_activo, fecha_creacion, creado_por`,
		input.Nombre, input.Descripcion, input.Unidad, input.StockMinimo,
		input.Lote, input.RegistroInvima, input.FechaCompra, input.FechaVencimiento, insumoID,
	).Scan(&i.ID, &i.Nombre, &i.Descripcion, &i.Unidad,
		&i.StockActual, &i.StockMinimo,
		&i.Lote, &i.RegistroInvima, &i.FechaCompra, &i.FechaVencimiento,
		&i.EstaActivo, &i.FechaCreacion, &i.CreadoPor)
	if err != nil {
		responderError(w, http.StatusNotFound, "insumo no encontrado")
		return
	}

	responderJSON(w, http.StatusOK, i)
}

func (h *insumosHandler) toggle(w http.ResponseWriter, r *http.Request) {
	insumoID := chi.URLParam(r, "insumoId")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE insumo SET esta_activo = NOT esta_activo WHERE id=$1 RETURNING esta_activo`, insumoID,
	).Scan(&activo)
	if err != nil {
		responderError(w, http.StatusNotFound, "insumo no encontrado")
		return
	}
	responderJSON(w, http.StatusOK, map[string]bool{"esta_activo": activo})
}

func (h *insumosHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar insumos")
		return
	}
	insumoID := chi.URLParam(r, "insumoId")
	tag, err := h.db.Exec(r.Context(), `DELETE FROM insumo WHERE id=$1`, insumoID)
	if err != nil {
		log.Printf("eliminar insumo: %v", err)
		responderError(w, http.StatusInternalServerError, "error al eliminar insumo")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "insumo no encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *insumosHandler) listarMovimientos(w http.ResponseWriter, r *http.Request) {
	insumoID := chi.URLParam(r, "insumoId")

	rows, err := h.db.Query(r.Context(), `
		SELECT id, insumo_id, tipo, cantidad, stock_resultante, notas, fecha_movimiento, creado_por
		FROM insumo_movimiento
		WHERE insumo_id = $1
		ORDER BY fecha_movimiento DESC
		LIMIT 50`, insumoID)
	if err != nil {
		log.Printf("listar movimientos: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar movimientos")
		return
	}
	defer rows.Close()

	movimientos := []models.Movimiento{}
	for rows.Next() {
		var m models.Movimiento
		if err := rows.Scan(&m.ID, &m.InsumoID, &m.Tipo, &m.Cantidad,
			&m.StockResultante, &m.Notas, &m.FechaMovimiento, &m.CreadoPor,
		); err != nil {
			log.Printf("escanear movimiento: %v", err)
			responderError(w, http.StatusInternalServerError, "error al leer movimiento")
			return
		}
		movimientos = append(movimientos, m)
	}

	responderJSON(w, http.StatusOK, movimientos)
}

func (h *insumosHandler) registrarMovimiento(w http.ResponseWriter, r *http.Request) {
	insumoID := chi.URLParam(r, "insumoId")
	u := appmiddleware.UsuarioDesdeContexto(r.Context())

	var input models.MovimientoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if input.Tipo != "entrada" && input.Tipo != "salida" && input.Tipo != "ajuste" {
		responderError(w, http.StatusBadRequest, "tipo debe ser entrada, salida o ajuste")
		return
	}
	if input.Cantidad <= 0 {
		responderError(w, http.StatusBadRequest, "la cantidad debe ser mayor a 0")
		return
	}

	var (
		insumoNotFound      bool
		stockInsuficiente   bool
		m                   models.Movimiento
		errInsumo           = errors.New("insumo no encontrado")
		errStockInsuficiente = errors.New("stock insuficiente")
	)

	if err := repository.ExecTx(r.Context(), h.db, func(tx pgx.Tx) error {
		var stockActual float64
		if err := tx.QueryRow(r.Context(),
			`SELECT stock_actual FROM insumo WHERE id=$1 AND esta_activo=TRUE FOR UPDATE`,
			insumoID,
		).Scan(&stockActual); err != nil {
			insumoNotFound = true
			return errInsumo
		}

		var nuevoStock float64
		switch input.Tipo {
		case "entrada":
			nuevoStock = stockActual + input.Cantidad
		case "salida":
			nuevoStock = stockActual - input.Cantidad
			if nuevoStock < 0 {
				stockInsuficiente = true
				return errStockInsuficiente
			}
		case "ajuste":
			nuevoStock = input.Cantidad
		}

		if _, err := tx.Exec(r.Context(),
			`UPDATE insumo SET stock_actual=$1 WHERE id=$2`, nuevoStock, insumoID,
		); err != nil {
			return err
		}

		return tx.QueryRow(r.Context(), `
			INSERT INTO insumo_movimiento
				(insumo_id, tipo, cantidad, stock_resultante, referencia_tipo, notas, creado_por)
			VALUES ($1, $2, $3, $4, 'manual', $5, $6)
			RETURNING id, insumo_id, tipo, cantidad, stock_resultante, notas, fecha_movimiento, creado_por`,
			insumoID, input.Tipo, input.Cantidad, nuevoStock, input.Notas, u.Nombre,
		).Scan(&m.ID, &m.InsumoID, &m.Tipo, &m.Cantidad,
			&m.StockResultante, &m.Notas, &m.FechaMovimiento, &m.CreadoPor,
		)
	}); err != nil {
		switch {
		case insumoNotFound:
			responderError(w, http.StatusNotFound, "insumo no encontrado")
		case stockInsuficiente:
			responderError(w, http.StatusBadRequest, "existencias insuficientes para registrar la salida")
		default:
			log.Printf("registrar movimiento: %v", err)
			responderError(w, http.StatusInternalServerError, "error al procesar movimiento")
		}
		return
	}

	responderJSON(w, http.StatusCreated, m)
}
