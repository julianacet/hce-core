package models

import "time"

type Proveedor struct {
	ID                  string    `json:"id"`
	RazonSocial         string    `json:"razon_social"`
	NIT                 *string   `json:"nit"`
	Tipo                string    `json:"tipo"`
	ContactoNombre      *string   `json:"contacto_nombre"`
	ContactoCargo       *string   `json:"contacto_cargo"`
	Telefono            *string   `json:"telefono"`
	TelefonoAlt         *string   `json:"telefono_alt"`
	Correo              *string   `json:"correo"`
	Direccion           *string   `json:"direccion"`
	Ciudad              *string   `json:"ciudad"`
	SitioWeb            *string   `json:"sitio_web"`
	DescripcionServicios *string  `json:"descripcion_servicios"`
	CondicionesPago     *string   `json:"condiciones_pago"`
	Notas               *string   `json:"notas"`
	EstaActivo          bool      `json:"esta_activo"`
	FechaCreacion       time.Time `json:"fecha_creacion"`
	CreadoPor           string    `json:"creado_por"`
}

type ProveedorInput struct {
	RazonSocial         string  `json:"razon_social"`
	NIT                 *string `json:"nit"`
	Tipo                string  `json:"tipo"`
	ContactoNombre      *string `json:"contacto_nombre"`
	ContactoCargo       *string `json:"contacto_cargo"`
	Telefono            *string `json:"telefono"`
	TelefonoAlt         *string `json:"telefono_alt"`
	Correo              *string `json:"correo"`
	Direccion           *string `json:"direccion"`
	Ciudad              *string `json:"ciudad"`
	SitioWeb            *string `json:"sitio_web"`
	DescripcionServicios *string `json:"descripcion_servicios"`
	CondicionesPago     *string `json:"condiciones_pago"`
	Notas               *string `json:"notas"`
}
