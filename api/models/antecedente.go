package models

import "encoding/json"

type AntecedentePregunta struct {
	ID                 string          `json:"id"`
	Categoria          string          `json:"categoria"`
	Texto              string          `json:"texto"`
	TipoRespuesta      string          `json:"tipo_respuesta"`
	Opciones           json.RawMessage `json:"opciones"`
	TieneDetalle       bool            `json:"tiene_detalle"`
	PlaceholderDetalle *string         `json:"placeholder_detalle"`
	SoloGenero         *string         `json:"solo_genero"`
	Orden              int             `json:"orden"`
	EstaActivo         bool            `json:"esta_activo"`
}

type AntecedentePreguntaInput struct {
	Categoria          string          `json:"categoria"`
	Texto              string          `json:"texto"`
	TipoRespuesta      string          `json:"tipo_respuesta"`
	Opciones           json.RawMessage `json:"opciones"`
	TieneDetalle       bool            `json:"tiene_detalle"`
	PlaceholderDetalle *string         `json:"placeholder_detalle"`
	SoloGenero         *string         `json:"solo_genero"`
	Orden              int             `json:"orden"`
}

// PreguntaConRespuesta embeds the question and adds the patient's current answer.
type PreguntaConRespuesta struct {
	AntecedentePregunta
	Valor   *string `json:"valor"`
	Detalle *string `json:"detalle"`
}

// RespuestaInput is used in the batch PUT endpoint.
type RespuestaInput struct {
	PreguntaID string  `json:"pregunta_id"`
	Valor      string  `json:"valor"`
	Detalle    *string `json:"detalle"`
}
