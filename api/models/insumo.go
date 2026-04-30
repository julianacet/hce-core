package models

import "time"

type Insumo struct {
	ID            string    `json:"id"`
	Nombre        string    `json:"nombre"`
	Descripcion   *string   `json:"descripcion"`
	Unidad        string    `json:"unidad"`
	StockActual   float64   `json:"stock_actual"`
	StockMinimo   float64   `json:"stock_minimo"`
	EstaActivo    bool      `json:"esta_activo"`
	FechaCreacion time.Time `json:"fecha_creacion"`
	CreadoPor     string    `json:"creado_por"`
}

type InsumoInput struct {
	Nombre      string  `json:"nombre"`
	Descripcion *string `json:"descripcion"`
	Unidad      string  `json:"unidad"`
	StockMinimo float64 `json:"stock_minimo"`
}

type MovimientoInput struct {
	Tipo     string   `json:"tipo"` // entrada | salida | ajuste
	Cantidad float64  `json:"cantidad"`
	Notas    *string  `json:"notas"`
}

type Movimiento struct {
	ID              string    `json:"id"`
	InsumoID        string    `json:"insumo_id"`
	Tipo            string    `json:"tipo"`
	Cantidad        float64   `json:"cantidad"`
	StockResultante float64   `json:"stock_resultante"`
	Notas           *string   `json:"notas"`
	FechaMovimiento time.Time `json:"fecha_movimiento"`
	CreadoPor       string    `json:"creado_por"`
}
