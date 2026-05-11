package models

import "time"

type CupsCodigo struct {
	Codigo      string `json:"codigo"`
	Descripcion string `json:"descripcion"`
}

type FacturaItemInput struct {
	CodigoCups    string  `json:"codigo_cups"`
	Descripcion   string  `json:"descripcion"`
	ValorUnitario float64 `json:"valor_unitario"`
	Cantidad      int     `json:"cantidad"`
}

type FacturaInput struct {
	Items []FacturaItemInput `json:"items"`
}

type FacturaItem struct {
	ID            string  `json:"id"`
	CodigoCups    string  `json:"codigo_cups"`
	Descripcion   string  `json:"descripcion"`
	ValorUnitario float64 `json:"valor_unitario"`
	Cantidad      int     `json:"cantidad"`
	Subtotal      float64 `json:"subtotal"`
	Orden         int     `json:"orden"`
}

type Factura struct {
	ID                string        `json:"id"`
	FacturaID         string        `json:"factura_id"`
	NumeroVersion     int           `json:"numero_version"`
	PacienteDocumento string        `json:"paciente_documento"`
	Estado            string        `json:"estado"` // activa | anulada
	Subtotal          float64       `json:"subtotal"`
	Total             float64       `json:"total"`
	FechaCreacion     time.Time     `json:"fecha_creacion"`
	CreadoPor         string        `json:"creado_por"`
	Items             []FacturaItem `json:"items"`
}
