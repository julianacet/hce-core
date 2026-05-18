package models

import "time"

type OrdenExamenItem struct {
	ID          string  `json:"id"`
	OrdenID     string  `json:"orden_id"`
	CodigoCups  *string `json:"codigo_cups"`
	Descripcion string  `json:"descripcion"`
	Indicaciones *string `json:"indicaciones"`
	Posicion    int     `json:"posicion"`
}

type OrdenExamen struct {
	ID                    string           `json:"id"`
	EncuentroID           string           `json:"encuentro_id"`
	IndicacionesGenerales *string          `json:"indicaciones_generales"`
	FechaCreacion         time.Time        `json:"fecha_creacion"`
	CreadoPor             string           `json:"creado_por"`
	Items                 []OrdenExamenItem `json:"items"`
}

type OrdenExamenItemInput struct {
	CodigoCups  *string `json:"codigo_cups"`
	Descripcion string  `json:"descripcion"`
	Indicaciones *string `json:"indicaciones"`
}

type OrdenExamenInput struct {
	IndicacionesGenerales *string              `json:"indicaciones_generales"`
	Items                 []OrdenExamenItemInput `json:"items"`
}
