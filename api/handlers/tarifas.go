package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

func TarifasRouter(db *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	h := &tarifasHandler{db: db}

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Get("/por-cups/{codigo}", h.porCups)
	r.Put("/{id}", h.actualizar)
	r.Patch("/{id}/toggle", h.toggle)
	r.Delete("/{id}", h.eliminar)

	return r
}

type tarifasHandler struct{ db *pgxpool.Pool }

const selectTarifa = `
	SELECT t.id, t.codigo_cups, c.descripcion AS descripcion_cups,
	       t.descripcion, t.valor, t.notas,
	       t.esta_activo, t.fecha_creacion, t.creado_por
	FROM tarifa t
	JOIN cups_codigo c ON c.codigo = t.codigo_cups`

func escanearTarifa(row interface{ Scan(...any) error }) (models.Tarifa, error) {
	var t models.Tarifa
	err := row.Scan(
		&t.ID, &t.CodigoCups, &t.DescripcionCups,
		&t.Descripcion, &t.Valor, &t.Notas,
		&t.EstaActivo, &t.FechaCreacion, &t.CreadoPor,
	)
	return t, err
}

func (h *tarifasHandler) listar(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	inactivos := r.URL.Query().Get("inactivos") == "1"

	query := selectTarifa + ` WHERE 1=1`
	args := []any{}
	n := 1

	if !inactivos {
		query += ` AND t.esta_activo = TRUE`
	}
	if q != "" {
		args = append(args, "%"+strings.ToLower(q)+"%")
		idx := strconv.Itoa(n)
		query += ` AND (LOWER(t.codigo_cups) LIKE $` + idx +
			` OR LOWER(c.descripcion) LIKE $` + idx +
			` OR LOWER(COALESCE(t.descripcion,'')) LIKE $` + idx + `)`
	}
	query += ` ORDER BY t.codigo_cups ASC`

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		log.Printf("listar tarifas: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar tarifas")
		return
	}
	defer rows.Close()

	tarifas := []models.Tarifa{}
	for rows.Next() {
		t, err := escanearTarifa(rows)
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer tarifa")
			return
		}
		tarifas = append(tarifas, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tarifas)
}

func (h *tarifasHandler) porCups(w http.ResponseWriter, r *http.Request) {
	codigo := chi.URLParam(r, "codigo")
	row := h.db.QueryRow(r.Context(),
		selectTarifa+` WHERE t.codigo_cups = $1 AND t.esta_activo = TRUE`,
		strings.ToUpper(codigo),
	)
	t, err := escanearTarifa(row)
	if err != nil {
		responderError(w, http.StatusNotFound, "tarifa no encontrada")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func (h *tarifasHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())

	var input models.TarifaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	codigo := strings.ToUpper(strings.TrimSpace(input.CodigoCups))
	if codigo == "" {
		responderError(w, http.StatusBadRequest, "el código CUPS es obligatorio")
		return
	}
	if input.Valor < 0 {
		responderError(w, http.StatusBadRequest, "el valor no puede ser negativo")
		return
	}

	var id string
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO tarifa (codigo_cups, descripcion, valor, notas, creado_por)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		codigo, input.Descripcion, input.Valor, input.Notas, u.Nombre,
	).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			responderError(w, http.StatusConflict, "ya existe una tarifa para ese código CUPS")
			return
		}
		if strings.Contains(err.Error(), "foreign key") || strings.Contains(err.Error(), "violates") {
			responderError(w, http.StatusBadRequest, "el código CUPS no existe en el catálogo")
			return
		}
		log.Printf("crear tarifa: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear tarifa")
		return
	}

	row := h.db.QueryRow(r.Context(), selectTarifa+` WHERE t.id = $1`, id)
	t, _ := escanearTarifa(row)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

func (h *tarifasHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var input models.TarifaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if input.Valor < 0 {
		responderError(w, http.StatusBadRequest, "el valor no puede ser negativo")
		return
	}

	tag, err := h.db.Exec(r.Context(),
		`UPDATE tarifa SET descripcion = $1, valor = $2, notas = $3 WHERE id = $4`,
		input.Descripcion, input.Valor, input.Notas, id,
	)
	if err != nil {
		log.Printf("actualizar tarifa: %v", err)
		responderError(w, http.StatusInternalServerError, "error al actualizar tarifa")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "tarifa no encontrada")
		return
	}

	row := h.db.QueryRow(r.Context(), selectTarifa+` WHERE t.id = $1`, id)
	t, _ := escanearTarifa(row)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func (h *tarifasHandler) toggle(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE tarifa SET esta_activo = NOT esta_activo WHERE id = $1 RETURNING esta_activo`, id,
	).Scan(&activo)
	if err != nil {
		responderError(w, http.StatusNotFound, "tarifa no encontrada")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"esta_activo": activo})
}

func (h *tarifasHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar tarifas")
		return
	}
	id := chi.URLParam(r, "id")
	tag, err := h.db.Exec(r.Context(), `DELETE FROM tarifa WHERE id = $1`, id)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al eliminar tarifa")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "tarifa no encontrada")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
