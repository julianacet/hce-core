package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

type farmaciaTarifasHandler struct{ db *pgxpool.Pool }

func FarmaciaTarifasMedicamentoRouter(db *pgxpool.Pool) http.Handler {
	h := &farmaciaTarifasHandler{db: db}
	r := chi.NewRouter()

	r.Get("/", h.buscar)
	r.With(appmiddleware.RequiereRol("admin")).Post("/", h.crear)
	r.With(appmiddleware.RequiereRol("admin")).Put("/{id}", h.actualizar)
	r.With(appmiddleware.RequiereRol("admin")).Delete("/{id}", h.eliminar)

	return r
}

const selectMedConPrecio = `
	SELECT m.id, COALESCE(m.codigo,''), m.nombre,
	       COALESCE(m.concentracion,''), COALESCE(m.forma_farmaceutica,''), m.tipo,
	       t.id, t.precio, t.notas
	FROM medicamento_predefinido m
	LEFT JOIN farmacia.tarifa_medicamento t
	       ON t.medicamento_id = m.id AND t.esta_activo = TRUE
	WHERE m.esta_activo = TRUE`

const farmaciaMedLimit = 20

// GET /api/farmacia/tarifas-medicamento?q=texto&tipo=pos|no_pos&page=
func (h *farmaciaTarifasHandler) buscar(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	tipo := r.URL.Query().Get("tipo")

	page := 1
	if p, err := strconv.Atoi(r.URL.Query().Get("page")); err == nil && p > 0 {
		page = p
	}
	offset := (page - 1) * farmaciaMedLimit

	query := `
		SELECT COUNT(*) OVER() AS total,
		       m.id, COALESCE(m.codigo,''), m.nombre,
		       COALESCE(m.concentracion,''), COALESCE(m.forma_farmaceutica,''), m.tipo,
		       t.id, t.precio, t.notas
		FROM medicamento_predefinido m
		LEFT JOIN farmacia.tarifa_medicamento t
		       ON t.medicamento_id = m.id AND t.esta_activo = TRUE
		WHERE m.esta_activo = TRUE`
	args := []any{}
	n := 1

	if q != "" {
		args = append(args, prepBusquedaMed(q))
		query += fmt.Sprintf(` AND (
			unaccent(m.nombre) ILIKE unaccent($%d)
			OR unaccent(COALESCE(m.concentracion,'')) ILIKE unaccent($%d)
			OR unaccent(COALESCE(m.forma_farmaceutica,'')) ILIKE unaccent($%d)
			OR COALESCE(m.codigo,'') ILIKE $%d
		)`, n, n, n, n)
		n++
	}
	if tipo == "pos" || tipo == "no_pos" {
		args = append(args, tipo)
		query += fmt.Sprintf(` AND m.tipo = $%d`, n)
		n++
	}

	args = append(args, farmaciaMedLimit, offset)
	query += fmt.Sprintf(` ORDER BY m.nombre LIMIT $%d OFFSET $%d`, n, n+1)

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		log.Printf("farmacia buscar medicamentos con precio: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar medicamentos")
		return
	}
	defer rows.Close()

	lista := []models.FarmaciaMedicamentoConPrecio{}
	total := 0
	for rows.Next() {
		var m models.FarmaciaMedicamentoConPrecio
		if err := rows.Scan(
			&total,
			&m.ID, &m.Codigo, &m.Nombre,
			&m.Concentracion, &m.FormaFarmaceutica, &m.Tipo,
			&m.TarifaID, &m.Precio, &m.TarifaNotas,
		); err != nil {
			log.Printf("farmacia escanear medicamento con precio: %v", err)
			responderError(w, http.StatusInternalServerError, "error al leer medicamento")
			return
		}
		lista = append(lista, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"medicamentos": lista, "total": total})
}

// POST /api/farmacia/tarifas-medicamento — solo admin
func (h *farmaciaTarifasHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())

	var input models.FarmaciaTarifaMedicamentoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if input.MedicamentoID == 0 {
		responderError(w, http.StatusBadRequest, "medicamento_id es obligatorio")
		return
	}
	if input.Precio < 0 {
		responderError(w, http.StatusBadRequest, "el precio no puede ser negativo")
		return
	}

	var id string
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO farmacia.tarifa_medicamento (medicamento_id, precio, notas, creado_por)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (medicamento_id) DO UPDATE
		     SET precio = EXCLUDED.precio,
		         notas = EXCLUDED.notas,
		         esta_activo = TRUE
		 RETURNING id`,
		input.MedicamentoID, input.Precio, input.Notas, u.Nombre,
	).Scan(&id)
	if err != nil {
		log.Printf("farmacia crear tarifa medicamento: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear tarifa")
		return
	}

	t, err := h.cargarTarifa(r, id)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "tarifa creada pero no se pudo recuperar")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

// PUT /api/farmacia/tarifas-medicamento/:id — solo admin
func (h *farmaciaTarifasHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var input models.FarmaciaTarifaMedicamentoUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if input.Precio < 0 {
		responderError(w, http.StatusBadRequest, "el precio no puede ser negativo")
		return
	}

	tag, err := h.db.Exec(r.Context(),
		`UPDATE farmacia.tarifa_medicamento SET precio = $1, notas = $2 WHERE id = $3`,
		input.Precio, input.Notas, id,
	)
	if err != nil {
		log.Printf("farmacia actualizar tarifa: %v", err)
		responderError(w, http.StatusInternalServerError, "error al actualizar tarifa")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "tarifa no encontrada")
		return
	}

	t, err := h.cargarTarifa(r, id)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al recuperar tarifa")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

// DELETE /api/farmacia/tarifas-medicamento/:id — solo admin
func (h *farmaciaTarifasHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tag, err := h.db.Exec(r.Context(),
		`DELETE FROM farmacia.tarifa_medicamento WHERE id = $1`, id)
	if err != nil {
		log.Printf("farmacia eliminar tarifa: %v", err)
		responderError(w, http.StatusInternalServerError, "error al eliminar tarifa")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "tarifa no encontrada")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *farmaciaTarifasHandler) cargarTarifa(r *http.Request, id string) (models.FarmaciaTarifaMedicamento, error) {
	var t models.FarmaciaTarifaMedicamento
	err := h.db.QueryRow(r.Context(), `
		SELECT t.id, t.medicamento_id,
		       m.nombre, COALESCE(m.codigo,''),
		       COALESCE(m.concentracion,''), COALESCE(m.forma_farmaceutica,''), m.tipo,
		       t.precio, t.notas, t.esta_activo, t.creado_por, t.fecha_creacion
		FROM farmacia.tarifa_medicamento t
		JOIN medicamento_predefinido m ON m.id = t.medicamento_id
		WHERE t.id = $1`, id,
	).Scan(
		&t.ID, &t.MedicamentoID,
		&t.Nombre, &t.Codigo,
		&t.Concentracion, &t.FormaFarmaceutica, &t.Tipo,
		&t.Precio, &t.Notas, &t.EstaActivo, &t.CreadoPor, &t.FechaCreacion,
	)
	return t, err
}
