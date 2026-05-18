package models

import "time"

type PlantillaConsentimiento struct {
	ID            string    `json:"id"`
	Nombre        string    `json:"nombre"`
	Contenido     string    `json:"contenido"`
	EstaActivo    bool      `json:"esta_activo"`
	FechaCreacion time.Time `json:"fecha_creacion"`
	CreadoPor     string    `json:"creado_por"`
}

type PlantillaInput struct {
	Nombre    string `json:"nombre"`
	Contenido string `json:"contenido"`
}

type ConsentimientoInput struct {
	PlantillaID          string `json:"plantilla_id"`
	ContenidoRenderizado string `json:"contenido_renderizado"`
}

// ConsentimientoStandaloneInput — para consentimientos independientes (no ligados a encuentro)
type ConsentimientoStandaloneInput struct {
	PlantillaID          string `json:"plantilla_id"`
	PacienteDocumento    string `json:"paciente_documento"`
	PacienteNombre       string `json:"paciente_nombre"`
	TipoDocumento        string `json:"tipo_documento"`
	ContenidoRenderizado string `json:"contenido_renderizado"`
}

type ConsentimientoGenerado struct {
	ID                   string     `json:"id"`
	EncuentroID          *string    `json:"encuentro_id"`
	PlantillaID          *string    `json:"plantilla_id"`
	PlantillaNombre      *string    `json:"plantilla_nombre"`
	PacienteDocumento    string     `json:"paciente_documento"`
	PacienteNombre       string     `json:"paciente_nombre"`
	TipoDocumento        string     `json:"tipo_documento"`
	ContenidoRenderizado string     `json:"contenido_renderizado"`
	Firmado              bool       `json:"firmado"`
	FechaFirma           *time.Time `json:"fecha_firma"`
	FirmadoPor           *string    `json:"firmado_por"`
	FechaGeneracion      time.Time  `json:"fecha_generacion"`
	CreadoPor            string     `json:"creado_por"`
}
