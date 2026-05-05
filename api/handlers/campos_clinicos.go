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

type CampoClinicoHandler struct {
	db *pgxpool.Pool
}

func CamposClinicosRouter(db *pgxpool.Pool) http.Handler {
	h := &CampoClinicoHandler{db: db}
	r := chi.NewRouter()
	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Put("/{id}", h.actualizar)
	r.Patch("/{id}/toggle", h.toggle)
	return r
}

func asJSONCampo(r json.RawMessage) interface{} {
	if len(r) == 0 || string(r) == "null" {
		return nil
	}
	return []byte(r)
}

func scanCampo(c *models.CampoClinico, row interface{ Scan(...any) error }) error {
	var opRaw []byte
	if err := row.Scan(
		&c.ID, &c.Seccion, &c.Nombre, &c.Tipo, &c.Unidad,
		&c.Clave, &c.Orden, &c.EstaActivo, &c.Descripcion, &opRaw,
	); err != nil {
		return err
	}
	c.Opciones = json.RawMessage(opRaw)
	return nil
}

const selectCampos = `SELECT id, seccion, nombre, tipo, unidad, clave, orden, esta_activo, descripcion, opciones FROM campo_clinico`

func (h *CampoClinicoHandler) listar(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(),
		selectCampos+` ORDER BY seccion, orden, nombre`,
	)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al consultar campos")
		return
	}
	defer rows.Close()

	campos := make([]models.CampoClinico, 0)
	for rows.Next() {
		var c models.CampoClinico
		var opRaw []byte
		if err := rows.Scan(&c.ID, &c.Seccion, &c.Nombre, &c.Tipo, &c.Unidad, &c.Clave, &c.Orden, &c.EstaActivo, &c.Descripcion, &opRaw); err != nil {
			continue
		}
		c.Opciones = json.RawMessage(opRaw)
		campos = append(campos, c)
	}
	responderJSON(w, http.StatusOK, campos)
}

func (h *CampoClinicoHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo administradores")
		return
	}

	var input models.CampoClinicoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if strings.TrimSpace(input.Nombre) == "" || strings.TrimSpace(input.Clave) == "" {
		responderError(w, http.StatusBadRequest, "nombre y clave son obligatorios")
		return
	}

	clave := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(input.Clave), " ", "_"))
	var c models.CampoClinico
	var opRaw []byte
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO campo_clinico (seccion, nombre, tipo, unidad, clave, orden, descripcion, opciones)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, seccion, nombre, tipo, unidad, clave, orden, esta_activo, descripcion, opciones`,
		input.Seccion, input.Nombre, input.Tipo, input.Unidad, clave, input.Orden,
		input.Descripcion, asJSONCampo(input.Opciones),
	).Scan(&c.ID, &c.Seccion, &c.Nombre, &c.Tipo, &c.Unidad, &c.Clave, &c.Orden, &c.EstaActivo, &c.Descripcion, &opRaw)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al crear campo — la clave debe ser única")
		return
	}
	c.Opciones = json.RawMessage(opRaw)
	responderJSON(w, http.StatusCreated, c)
}

func (h *CampoClinicoHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo administradores")
		return
	}

	id := chi.URLParam(r, "id")
	var input models.CampoClinicoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}

	var c models.CampoClinico
	var opRaw []byte
	err := h.db.QueryRow(r.Context(),
		`UPDATE campo_clinico
		 SET seccion=$1, nombre=$2, tipo=$3, unidad=$4, orden=$5, descripcion=$6, opciones=$7
		 WHERE id=$8
		 RETURNING id, seccion, nombre, tipo, unidad, clave, orden, esta_activo, descripcion, opciones`,
		input.Seccion, input.Nombre, input.Tipo, input.Unidad, input.Orden,
		input.Descripcion, asJSONCampo(input.Opciones), id,
	).Scan(&c.ID, &c.Seccion, &c.Nombre, &c.Tipo, &c.Unidad, &c.Clave, &c.Orden, &c.EstaActivo, &c.Descripcion, &opRaw)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al actualizar campo")
		return
	}
	c.Opciones = json.RawMessage(opRaw)
	responderJSON(w, http.StatusOK, c)
}

func (h *CampoClinicoHandler) toggle(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo administradores")
		return
	}

	id := chi.URLParam(r, "id")
	var c models.CampoClinico
	var opRaw []byte
	err := h.db.QueryRow(r.Context(),
		`UPDATE campo_clinico SET esta_activo = NOT esta_activo
		 WHERE id=$1
		 RETURNING id, seccion, nombre, tipo, unidad, clave, orden, esta_activo, descripcion, opciones`,
		id,
	).Scan(&c.ID, &c.Seccion, &c.Nombre, &c.Tipo, &c.Unidad, &c.Clave, &c.Orden, &c.EstaActivo, &c.Descripcion, &opRaw)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al actualizar campo")
		return
	}
	c.Opciones = json.RawMessage(opRaw)
	responderJSON(w, http.StatusOK, c)
}
