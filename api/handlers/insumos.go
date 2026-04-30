package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

func InsumosRouter(db *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	h := &insumosHandler{db: db}

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Route("/{insumoId}", func(r chi.Router) {
		r.Put("/", h.actualizar)
		r.Delete("/", h.desactivar)
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	insumos := []models.Insumo{}
	for rows.Next() {
		var i models.Insumo
		if err := rows.Scan(&i.ID, &i.Nombre, &i.Descripcion, &i.Unidad,
			&i.StockActual, &i.StockMinimo, &i.EstaActivo, &i.FechaCreacion, &i.CreadoPor,
		); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		insumos = append(insumos, i)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(insumos)
}

func (h *insumosHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())

	var input models.InsumoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(input.Nombre) == "" || strings.TrimSpace(input.Unidad) == "" {
		http.Error(w, "nombre y unidad son obligatorios", http.StatusBadRequest)
		return
	}

	var i models.Insumo
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO insumo (nombre, descripcion, unidad, stock_minimo, creado_por)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, nombre, descripcion, unidad, stock_actual, stock_minimo,
		          esta_activo, fecha_creacion, creado_por`,
		input.Nombre, input.Descripcion, input.Unidad, input.StockMinimo, u.Nombre,
	).Scan(&i.ID, &i.Nombre, &i.Descripcion, &i.Unidad,
		&i.StockActual, &i.StockMinimo, &i.EstaActivo, &i.FechaCreacion, &i.CreadoPor)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(i)
}

func (h *insumosHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	insumoID := chi.URLParam(r, "insumoId")

	var input models.InsumoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	var i models.Insumo
	err := h.db.QueryRow(r.Context(), `
		UPDATE insumo SET nombre=$1, descripcion=$2, unidad=$3, stock_minimo=$4
		WHERE id=$5 AND esta_activo=TRUE
		RETURNING id, nombre, descripcion, unidad, stock_actual, stock_minimo,
		          esta_activo, fecha_creacion, creado_por`,
		input.Nombre, input.Descripcion, input.Unidad, input.StockMinimo, insumoID,
	).Scan(&i.ID, &i.Nombre, &i.Descripcion, &i.Unidad,
		&i.StockActual, &i.StockMinimo, &i.EstaActivo, &i.FechaCreacion, &i.CreadoPor)
	if err != nil {
		http.Error(w, "insumo no encontrado", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(i)
}

func (h *insumosHandler) desactivar(w http.ResponseWriter, r *http.Request) {
	insumoID := chi.URLParam(r, "insumoId")

	ct, err := h.db.Exec(r.Context(),
		`UPDATE insumo SET esta_activo=FALSE WHERE id=$1 AND esta_activo=TRUE`, insumoID)
	if err != nil || ct.RowsAffected() == 0 {
		http.Error(w, "insumo no encontrado", http.StatusNotFound)
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	movimientos := []models.Movimiento{}
	for rows.Next() {
		var m models.Movimiento
		if err := rows.Scan(&m.ID, &m.InsumoID, &m.Tipo, &m.Cantidad,
			&m.StockResultante, &m.Notas, &m.FechaMovimiento, &m.CreadoPor,
		); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		movimientos = append(movimientos, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(movimientos)
}

func (h *insumosHandler) registrarMovimiento(w http.ResponseWriter, r *http.Request) {
	insumoID := chi.URLParam(r, "insumoId")
	u := appmiddleware.UsuarioDesdeContexto(r.Context())

	var input models.MovimientoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}
	if input.Tipo != "entrada" && input.Tipo != "salida" && input.Tipo != "ajuste" {
		http.Error(w, "tipo debe ser entrada, salida o ajuste", http.StatusBadRequest)
		return
	}
	if input.Cantidad <= 0 {
		http.Error(w, "la cantidad debe ser mayor a 0", http.StatusBadRequest)
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// Calcular nuevo stock según tipo
	var nuevoStock float64
	var stockActual float64
	if err := tx.QueryRow(r.Context(),
		`SELECT stock_actual FROM insumo WHERE id=$1 AND esta_activo=TRUE FOR UPDATE`,
		insumoID,
	).Scan(&stockActual); err != nil {
		http.Error(w, "insumo no encontrado", http.StatusNotFound)
		return
	}

	switch input.Tipo {
	case "entrada":
		nuevoStock = stockActual + input.Cantidad
	case "salida":
		nuevoStock = stockActual - input.Cantidad
		if nuevoStock < 0 {
			http.Error(w, "existencias insuficientes para registrar la salida", http.StatusBadRequest)
			return
		}
	case "ajuste":
		nuevoStock = input.Cantidad // ajuste establece el valor absoluto
	}

	// Actualizar stock en insumo
	if _, err := tx.Exec(r.Context(),
		`UPDATE insumo SET stock_actual=$1 WHERE id=$2`, nuevoStock, insumoID,
	); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Registrar movimiento
	var m models.Movimiento
	if err := tx.QueryRow(r.Context(), `
		INSERT INTO insumo_movimiento
			(insumo_id, tipo, cantidad, stock_resultante, referencia_tipo, notas, creado_por)
		VALUES ($1, $2, $3, $4, 'manual', $5, $6)
		RETURNING id, insumo_id, tipo, cantidad, stock_resultante, notas, fecha_movimiento, creado_por`,
		insumoID, input.Tipo, input.Cantidad, nuevoStock, input.Notas, u.Nombre,
	).Scan(&m.ID, &m.InsumoID, &m.Tipo, &m.Cantidad,
		&m.StockResultante, &m.Notas, &m.FechaMovimiento, &m.CreadoPor,
	); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(m)
}
