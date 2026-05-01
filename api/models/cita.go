package models

import "time"

type Cita struct {
	ID                string    `json:"id"`
	Fecha             string    `json:"fecha"`
	HoraInicio        string    `json:"hora_inicio"`
	DuracionMinutos   int       `json:"duracion_minutos"`
	PacienteDocumento *string   `json:"paciente_documento"`
	PacienteNombre    string    `json:"paciente_nombre"`
	PacienteTelefono  *string   `json:"paciente_telefono"`
	Motivo            *string   `json:"motivo"`
	Estado            string    `json:"estado"`
	Notas             *string   `json:"notas"`
	CreadoPor         string    `json:"creado_por"`
	FechaCreacion     time.Time `json:"fecha_creacion"`
}

type CitaInput struct {
	Fecha             string  `json:"fecha"`
	HoraInicio        string  `json:"hora_inicio"`
	DuracionMinutos   int     `json:"duracion_minutos"`
	PacienteDocumento *string `json:"paciente_documento"`
	PacienteNombre    string  `json:"paciente_nombre"`
	PacienteTelefono  *string `json:"paciente_telefono"`
	Motivo            *string `json:"motivo"`
	Notas             *string `json:"notas"`
}

type CitaEstadoInput struct {
	Estado string `json:"estado"`
}
