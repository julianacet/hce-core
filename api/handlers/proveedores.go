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

func ProveedoresRouter(db *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	h := &proveedoresHandler{db: db}

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Get("/{id}", h.obtener)
	r.Put("/{id}", h.actualizar)
	r.Patch("/{id}/toggle", h.toggle)
	r.Delete("/{id}", h.eliminar)

	return r
}

type proveedoresHandler struct{ db *pgxpool.Pool }

const colsProveedor = `
	id, razon_social, nit, tipo,
	contacto_nombre, contacto_cargo, telefono, telefono_alt,
	correo, direccion, ciudad, sitio_web,
	descripcion_servicios, condiciones_pago, notas,
	esta_activo, fecha_creacion, creado_por`

func escanearProveedor(row interface{ Scan(...any) error }) (models.Proveedor, error) {
	var p models.Proveedor
	err := row.Scan(
		&p.ID, &p.RazonSocial, &p.NIT, &p.Tipo,
		&p.ContactoNombre, &p.ContactoCargo, &p.Telefono, &p.TelefonoAlt,
		&p.Correo, &p.Direccion, &p.Ciudad, &p.SitioWeb,
		&p.DescripcionServicios, &p.CondicionesPago, &p.Notas,
		&p.EstaActivo, &p.FechaCreacion, &p.CreadoPor,
	)
	return p, err
}

func (h *proveedoresHandler) listar(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	tipo := r.URL.Query().Get("tipo")
	inactivos := r.URL.Query().Get("inactivos") == "1"

	query := `SELECT ` + colsProveedor + ` FROM proveedor WHERE 1=1`
	args := []any{}
	n := 1

	if !inactivos {
		query += ` AND esta_activo = TRUE`
	}
	if q != "" {
		args = append(args, "%"+strings.ToLower(q)+"%")
		query += ` AND (LOWER(razon_social) LIKE $` + strconv.Itoa(n) +
			` OR LOWER(COALESCE(nit,'')) LIKE $` + strconv.Itoa(n) + `)`
		n++
	}
	if tipo != "" {
		args = append(args, tipo)
		query += ` AND tipo = $` + strconv.Itoa(n)
	}
	query += ` ORDER BY razon_social ASC`

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		log.Printf("listar proveedores: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar proveedores")
		return
	}
	defer rows.Close()

	proveedores := []models.Proveedor{}
	for rows.Next() {
		p, err := escanearProveedor(rows)
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer proveedor")
			return
		}
		proveedores = append(proveedores, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(proveedores)
}

func (h *proveedoresHandler) obtener(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	row := h.db.QueryRow(r.Context(),
		`SELECT `+colsProveedor+` FROM proveedor WHERE id = $1`, id)
	p, err := escanearProveedor(row)
	if err != nil {
		responderError(w, http.StatusNotFound, "proveedor no encontrado")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func validarProveedorInput(input models.ProveedorInput) string {
	if strings.TrimSpace(input.RazonSocial) == "" {
		return "la razón social es obligatoria"
	}
	validos := map[string]bool{
		"insumos_medicos": true, "medicamentos": true, "equipos_medicos": true,
		"laboratorio": true, "mantenimiento": true, "servicios_generales": true, "otro": true,
	}
	if !validos[input.Tipo] {
		return "tipo de proveedor inválido"
	}
	return ""
}

func (h *proveedoresHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())

	var input models.ProveedorInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if msg := validarProveedorInput(input); msg != "" {
		responderError(w, http.StatusBadRequest, msg)
		return
	}

	var id string
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO proveedor (
			razon_social, nit, tipo,
			contacto_nombre, contacto_cargo, telefono, telefono_alt,
			correo, direccion, ciudad, sitio_web,
			descripcion_servicios, condiciones_pago, notas, creado_por
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		RETURNING id`,
		strings.TrimSpace(input.RazonSocial), input.NIT, input.Tipo,
		input.ContactoNombre, input.ContactoCargo, input.Telefono, input.TelefonoAlt,
		input.Correo, input.Direccion, input.Ciudad, input.SitioWeb,
		input.DescripcionServicios, input.CondicionesPago, input.Notas, u.Nombre,
	).Scan(&id)
	if err != nil {
		log.Printf("crear proveedor: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear proveedor")
		return
	}

	row := h.db.QueryRow(r.Context(),
		`SELECT `+colsProveedor+` FROM proveedor WHERE id = $1`, id)
	p, _ := escanearProveedor(row)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p)
}

func (h *proveedoresHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var input models.ProveedorInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "cuerpo inválido")
		return
	}
	if msg := validarProveedorInput(input); msg != "" {
		responderError(w, http.StatusBadRequest, msg)
		return
	}

	row := h.db.QueryRow(r.Context(),
		`UPDATE proveedor SET
			razon_social = $1, nit = $2, tipo = $3,
			contacto_nombre = $4, contacto_cargo = $5, telefono = $6, telefono_alt = $7,
			correo = $8, direccion = $9, ciudad = $10, sitio_web = $11,
			descripcion_servicios = $12, condiciones_pago = $13, notas = $14
		WHERE id = $15
		RETURNING `+colsProveedor,
		strings.TrimSpace(input.RazonSocial), input.NIT, input.Tipo,
		input.ContactoNombre, input.ContactoCargo, input.Telefono, input.TelefonoAlt,
		input.Correo, input.Direccion, input.Ciudad, input.SitioWeb,
		input.DescripcionServicios, input.CondicionesPago, input.Notas, id,
	)
	p, err := escanearProveedor(row)
	if err != nil {
		log.Printf("actualizar proveedor: %v", err)
		responderError(w, http.StatusInternalServerError, "error al actualizar proveedor")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (h *proveedoresHandler) toggle(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE proveedor SET esta_activo = NOT esta_activo WHERE id = $1 RETURNING esta_activo`, id,
	).Scan(&activo)
	if err != nil {
		responderError(w, http.StatusNotFound, "proveedor no encontrado")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"esta_activo": activo})
}

func (h *proveedoresHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" && u.Rol != "medico" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar proveedores")
		return
	}
	id := chi.URLParam(r, "id")
	tag, err := h.db.Exec(r.Context(), `DELETE FROM proveedor WHERE id = $1`, id)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al eliminar proveedor")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "proveedor no encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
