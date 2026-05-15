package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"hce/api/models"
)

func UsuariosRouter(db *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	h := &usuariosHandler{db: db}

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Put("/{usuarioId}", h.actualizar)
	r.Patch("/{usuarioId}/toggle", h.toggle)
	r.Delete("/{usuarioId}", h.eliminar)

	return r
}

type usuariosHandler struct{ db *pgxpool.Pool }

func (h *usuariosHandler) listar(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT id, nombre_usuario, nombre_completo, rol, esta_activo, fecha_creacion
		FROM usuario
		ORDER BY nombre_completo ASC`)
	if err != nil {
		log.Printf("listar usuarios: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar usuarios")
		return
	}
	defer rows.Close()

	usuarios := []models.Usuario{}
	for rows.Next() {
		var u models.Usuario
		if err := rows.Scan(&u.ID, &u.NombreUsuario, &u.NombreCompleto, &u.Rol, &u.EstaActivo, &u.FechaCreacion); err != nil {
			log.Printf("escanear usuario: %v", err)
			responderError(w, http.StatusInternalServerError, "error al leer usuario")
			return
		}
		usuarios = append(usuarios, u)
	}

	responderJSON(w, http.StatusOK, usuarios)
}

func (h *usuariosHandler) crear(w http.ResponseWriter, r *http.Request) {
	var input models.UsuarioInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if strings.TrimSpace(input.NombreUsuario) == "" || strings.TrimSpace(input.NombreCompleto) == "" {
		responderError(w, http.StatusBadRequest, "nombre_usuario y nombre_completo son obligatorios")
		return
	}
	if input.Contrasena == "" {
		responderError(w, http.StatusBadRequest, "la contraseña es obligatoria al crear un usuario")
		return
	}
	if input.Rol != "admin" && input.Rol != "medico" && input.Rol != "auxiliar" {
		responderError(w, http.StatusBadRequest, "rol debe ser admin, medico o auxiliar")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Contrasena), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("bcrypt crear usuario: %v", err)
		responderError(w, http.StatusInternalServerError, "error al procesar contraseña")
		return
	}

	var u models.Usuario
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO usuario (nombre_usuario, nombre_completo, rol, hash_contrasena)
		VALUES ($1, $2, $3, $4)
		RETURNING id, nombre_usuario, nombre_completo, rol, esta_activo, fecha_creacion`,
		strings.TrimSpace(input.NombreUsuario), strings.TrimSpace(input.NombreCompleto),
		input.Rol, string(hash),
	).Scan(&u.ID, &u.NombreUsuario, &u.NombreCompleto, &u.Rol, &u.EstaActivo, &u.FechaCreacion)
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			responderError(w, http.StatusConflict, "ese nombre de usuario ya existe")
			return
		}
		log.Printf("crear usuario: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear usuario")
		return
	}

	responderJSON(w, http.StatusCreated, u)
}

func (h *usuariosHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	usuarioID := chi.URLParam(r, "usuarioId")

	var input models.UsuarioInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if input.Rol != "admin" && input.Rol != "medico" && input.Rol != "auxiliar" {
		responderError(w, http.StatusBadRequest, "rol debe ser admin, medico o auxiliar")
		return
	}

	var u models.Usuario

	if input.Contrasena != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(input.Contrasena), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("bcrypt actualizar usuario: %v", err)
			responderError(w, http.StatusInternalServerError, "error al procesar contraseña")
			return
		}
		err = h.db.QueryRow(r.Context(), `
			UPDATE usuario
			SET nombre_completo=$1, rol=$2, hash_contrasena=$3
			WHERE id=$4
			RETURNING id, nombre_usuario, nombre_completo, rol, esta_activo, fecha_creacion`,
			strings.TrimSpace(input.NombreCompleto), input.Rol, string(hash), usuarioID,
		).Scan(&u.ID, &u.NombreUsuario, &u.NombreCompleto, &u.Rol, &u.EstaActivo, &u.FechaCreacion)
		if err != nil {
			responderError(w, http.StatusNotFound, "usuario no encontrado")
			return
		}
	} else {
		err := h.db.QueryRow(r.Context(), `
			UPDATE usuario
			SET nombre_completo=$1, rol=$2
			WHERE id=$3
			RETURNING id, nombre_usuario, nombre_completo, rol, esta_activo, fecha_creacion`,
			strings.TrimSpace(input.NombreCompleto), input.Rol, usuarioID,
		).Scan(&u.ID, &u.NombreUsuario, &u.NombreCompleto, &u.Rol, &u.EstaActivo, &u.FechaCreacion)
		if err != nil {
			responderError(w, http.StatusNotFound, "usuario no encontrado")
			return
		}
	}

	responderJSON(w, http.StatusOK, u)
}

func (h *usuariosHandler) toggle(w http.ResponseWriter, r *http.Request) {
	usuarioID := chi.URLParam(r, "usuarioId")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE usuario SET esta_activo = NOT esta_activo WHERE id=$1 RETURNING esta_activo`, usuarioID,
	).Scan(&activo)
	if err != nil {
		responderError(w, http.StatusNotFound, "usuario no encontrado")
		return
	}
	responderJSON(w, http.StatusOK, map[string]bool{"esta_activo": activo})
}

func (h *usuariosHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	usuarioID := chi.URLParam(r, "usuarioId")

	var nombreUsuario string
	err := h.db.QueryRow(r.Context(),
		`SELECT nombre_usuario FROM usuario WHERE id=$1`, usuarioID,
	).Scan(&nombreUsuario)
	if err != nil {
		responderError(w, http.StatusNotFound, "usuario no encontrado")
		return
	}

	var total int
	err = h.db.QueryRow(r.Context(), `
		SELECT (
			SELECT COUNT(*) FROM encuentro_clinico WHERE creado_por=$1
		) + (
			SELECT COUNT(*) FROM factura        WHERE creado_por=$1
		) + (
			SELECT COUNT(*) FROM evento_adverso WHERE creado_por=$1
		) + (
			SELECT COUNT(*) FROM formula_medica WHERE creado_por=$1
		)`, nombreUsuario,
	).Scan(&total)
	if err != nil {
		log.Printf("verificar actividad usuario: %v", err)
		responderError(w, http.StatusInternalServerError, "error al verificar actividad del usuario")
		return
	}
	if total > 0 {
		responderJSON(w, http.StatusConflict, map[string]any{
			"error": "Este usuario tiene registros clínicos y no puede eliminarse. Desactívalo en su lugar.",
			"total": total,
		})
		return
	}

	tag, err := h.db.Exec(r.Context(), `DELETE FROM usuario WHERE id=$1`, usuarioID)
	if err != nil {
		log.Printf("eliminar usuario: %v", err)
		responderError(w, http.StatusInternalServerError, "error al eliminar usuario")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "usuario no encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
