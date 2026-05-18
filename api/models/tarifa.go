package models

import "time"

type Tarifa struct {
	ID              string    `json:"id"`
	CodigoCups      string    `json:"codigo_cups"`
	DescripcionCups string    `json:"descripcion_cups"`
	Descripcion     *string   `json:"descripcion"`
	Valor           float64   `json:"valor"`
	Notas           *string   `json:"notas"`
	EstaActivo      bool      `json:"esta_activo"`
	FechaCreacion   time.Time `json:"fecha_creacion"`
	CreadoPor       string    `json:"creado_por"`
}

type TarifaInput struct {
	CodigoCups  string  `json:"codigo_cups"`
	Descripcion *string `json:"descripcion"`
	Valor       float64 `json:"valor"`
	Notas       *string `json:"notas"`
}
