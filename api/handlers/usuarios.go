package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	usuarios := []models.Usuario{}
	for rows.Next() {
		var u models.Usuario
		if err := rows.Scan(&u.ID, &u.NombreUsuario, &u.NombreCompleto, &u.Rol, &u.EstaActivo, &u.FechaCreacion); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		usuarios = append(usuarios, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(usuarios)
}

func (h *usuariosHandler) crear(w http.ResponseWriter, r *http.Request) {
	var input models.UsuarioInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(input.NombreUsuario) == "" || strings.TrimSpace(input.NombreCompleto) == "" {
		http.Error(w, "nombre_usuario y nombre_completo son obligatorios", http.StatusBadRequest)
		return
	}
	if input.Contrasena == "" {
		http.Error(w, "la contraseña es obligatoria al crear un usuario", http.StatusBadRequest)
		return
	}
	if input.Rol != "admin" && input.Rol != "medico" && input.Rol != "auxiliar" {
		http.Error(w, "rol debe ser admin, medico o auxiliar", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Contrasena), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "error al procesar contraseña", http.StatusInternalServerError)
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
			http.Error(w, "ese nombre de usuario ya existe", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(u)
}

func (h *usuariosHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	usuarioID := chi.URLParam(r, "usuarioId")

	var input models.UsuarioInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}
	if input.Rol != "admin" && input.Rol != "medico" && input.Rol != "auxiliar" {
		http.Error(w, "rol debe ser admin, medico o auxiliar", http.StatusBadRequest)
		return
	}

	var u models.Usuario

	if input.Contrasena != "" {
		// Cambiar también la contraseña
		hash, err := bcrypt.GenerateFromPassword([]byte(input.Contrasena), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "error al procesar contraseña", http.StatusInternalServerError)
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
			http.Error(w, "usuario no encontrado", http.StatusNotFound)
			return
		}
	} else {
		// Solo actualizar datos, sin tocar contraseña
		err := h.db.QueryRow(r.Context(), `
			UPDATE usuario
			SET nombre_completo=$1, rol=$2
			WHERE id=$3
			RETURNING id, nombre_usuario, nombre_completo, rol, esta_activo, fecha_creacion`,
			strings.TrimSpace(input.NombreCompleto), input.Rol, usuarioID,
		).Scan(&u.ID, &u.NombreUsuario, &u.NombreCompleto, &u.Rol, &u.EstaActivo, &u.FechaCreacion)
		if err != nil {
			http.Error(w, "usuario no encontrado", http.StatusNotFound)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(u)
}

func (h *usuariosHandler) toggle(w http.ResponseWriter, r *http.Request) {
	usuarioID := chi.URLParam(r, "usuarioId")
	var activo bool
	err := h.db.QueryRow(r.Context(),
		`UPDATE usuario SET esta_activo = NOT esta_activo WHERE id=$1 RETURNING esta_activo`, usuarioID,
	).Scan(&activo)
	if err != nil {
		http.Error(w, "usuario no encontrado", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"esta_activo": activo})
}

func (h *usuariosHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	usuarioID := chi.URLParam(r, "usuarioId")
	tag, err := h.db.Exec(r.Context(), `DELETE FROM usuario WHERE id=$1`, usuarioID)
	if err != nil {
		http.Error(w, "error al eliminar usuario", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "usuario no encontrado", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Asegurar que el modelo tenga FechaCreacion como time.Time
var _ = time.Now
