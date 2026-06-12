package models

import "time"

// ── Módulo de farmacia ────────────────────────────────────────────────────────

// Búsqueda de medicamentos con precio de tarifa (LEFT JOIN)
type FarmaciaMedicamentoConPrecio struct {
	ID                int      `json:"id"`
	Codigo            string   `json:"codigo"`
	Nombre            string   `json:"nombre"`
	Concentracion     string   `json:"concentracion"`
	FormaFarmaceutica string   `json:"forma_farmaceutica"`
	Tipo              string   `json:"tipo"`
	TarifaID          *string  `json:"tarifa_id"`
	Precio            *float64 `json:"precio"`
	TarifaNotas       *string  `json:"tarifa_notas"`
}

// CRUD de tarifas de medicamentos
type FarmaciaTarifaMedicamento struct {
	ID                string    `json:"id"`
	MedicamentoID     int       `json:"medicamento_id"`
	Nombre            string    `json:"nombre"`
	Codigo            string    `json:"codigo"`
	Concentracion     string    `json:"concentracion"`
	FormaFarmaceutica string    `json:"forma_farmaceutica"`
	Tipo              string    `json:"tipo"`
	Precio            float64   `json:"precio"`
	Notas             *string   `json:"notas"`
	EstaActivo        bool      `json:"esta_activo"`
	CreadoPor         string    `json:"creado_por"`
	FechaCreacion     time.Time `json:"fecha_creacion"`
}

type FarmaciaTarifaMedicamentoInput struct {
	MedicamentoID int     `json:"medicamento_id"`
	Precio        float64 `json:"precio"`
	Notas         *string `json:"notas"`
}

type FarmaciaTarifaMedicamentoUpdateInput struct {
	Precio float64  `json:"precio"`
	Notas  *string  `json:"notas"`
}

type FarmaciaFacturaItem struct {
	ID                string  `json:"id"`
	FacturaID         string  `json:"factura_id"`
	MedicamentoID     *int    `json:"medicamento_id"`
	NombreMedicamento string  `json:"nombre_medicamento"`
	Concentracion     string  `json:"concentracion"`
	FormaFarmaceutica string  `json:"forma_farmaceutica"`
	Cantidad          float64 `json:"cantidad"`
	PrecioUnitario    float64 `json:"precio_unitario"`
	Subtotal          float64 `json:"subtotal"`
}

type FarmaciaFactura struct {
	ID                string                `json:"id"`
	Numero            string                `json:"numero"`
	PacienteDocumento string                `json:"paciente_documento"`
	PacienteNombre    string                `json:"paciente_nombre"`
	Fecha             time.Time             `json:"fecha"`
	Total             float64               `json:"total"`
	Estado            string                `json:"estado"`
	Notas             *string               `json:"notas"`
	CreadoPor         string                `json:"creado_por"`
	FechaCreacion     time.Time             `json:"fecha_creacion"`
	Items             []FarmaciaFacturaItem `json:"items"`
}

type FarmaciaFacturaItemInput struct {
	MedicamentoID     *int    `json:"medicamento_id"`
	NombreMedicamento string  `json:"nombre_medicamento"`
	Concentracion     string  `json:"concentracion"`
	FormaFarmaceutica string  `json:"forma_farmaceutica"`
	Cantidad          float64 `json:"cantidad"`
	PrecioUnitario    float64 `json:"precio_unitario"`
}

type FarmaciaFacturaInput struct {
	PacienteDocumento string                    `json:"paciente_documento"`
	Notas             *string                   `json:"notas"`
	Items             []FarmaciaFacturaItemInput `json:"items"`
}
