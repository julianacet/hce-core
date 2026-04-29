package models

import "time"

type Formula struct {
	ID               string        `json:"id"`
	FormulaID        string        `json:"formula_id"`
	NumeroVersion    int           `json:"numero_version"`
	EsUltimaVersion  bool          `json:"es_ultima_version"`
	EstaActivo       bool          `json:"esta_activo"`
	EncuentroID      string        `json:"encuentro_id"`
	Tipo             string        `json:"tipo"` // pos | no_pos
	Observaciones    *string       `json:"observaciones"`
	FechaCreacion    time.Time     `json:"fecha_creacion"`
	CreadoPor        string        `json:"creado_por"`
	Medicamentos     []Medicamento `json:"medicamentos"`
}

type Medicamento struct {
	ID                  string  `json:"id"`
	FormulaID           string  `json:"formula_id"`
	NombreMedicamento   string  `json:"nombre_medicamento"`
	Concentracion       *string `json:"concentracion"`
	FormaFarmaceutica   *string `json:"forma_farmaceutica"`
	Dosis               string  `json:"dosis"`
	Frecuencia          string  `json:"frecuencia"`
	DuracionTratamiento string  `json:"duracion_tratamiento"`
	CantidadDispensar   *int    `json:"cantidad_dispensar"`
	Indicaciones        *string `json:"indicaciones"`
	Orden               int     `json:"orden"`
}

type FormulaInput struct {
	Tipo          string             `json:"tipo"` // pos | no_pos
	Observaciones *string            `json:"observaciones"`
	Medicamentos  []MedicamentoInput `json:"medicamentos"`
}

type MedicamentoInput struct {
	NombreMedicamento   string  `json:"nombre_medicamento"`
	Concentracion       *string `json:"concentracion"`
	FormaFarmaceutica   *string `json:"forma_farmaceutica"`
	Dosis               string  `json:"dosis"`
	Frecuencia          string  `json:"frecuencia"`
	DuracionTratamiento string  `json:"duracion_tratamiento"`
	CantidadDispensar   *int    `json:"cantidad_dispensar"`
	Indicaciones        *string `json:"indicaciones"`
}
