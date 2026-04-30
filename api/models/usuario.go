package models

import "time"

type Usuario struct {
	ID             string    `json:"id"`
	NombreUsuario  string    `json:"nombre_usuario"`
	NombreCompleto string    `json:"nombre_completo"`
	Rol            string    `json:"rol"`
	EstaActivo     bool      `json:"esta_activo"`
	FechaCreacion  time.Time `json:"fecha_creacion"`
}

type UsuarioInput struct {
	NombreUsuario  string `json:"nombre_usuario"`
	NombreCompleto string `json:"nombre_completo"`
	Rol            string `json:"rol"`
	Contrasena     string `json:"contrasena"` // vacío = no cambiar
}
