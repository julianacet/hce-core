package models

import "time"

type Encuentro struct {
	ID                         string     `json:"id"`
	EncuentroID                string     `json:"encuentro_id"`
	NumeroVersion              int        `json:"numero_version"`
	EsUltimaVersion            bool       `json:"es_ultima_version"`
	EstaActivo                 bool       `json:"esta_activo"`
	PacienteDocumento          string     `json:"paciente_documento"`
	EncuentroPadreID           *string    `json:"encuentro_padre_id"`
	FechaAtencion              time.Time  `json:"fecha_atencion"`
	CausaExterna               string     `json:"causa_externa"`
	FinalidadConsulta          string     `json:"finalidad_consulta"`
	ViaIngreso                 string     `json:"via_ingreso"`
	MotivoConsulta             string     `json:"motivo_consulta"`
	TASistolica                *int16     `json:"ta_sistolica"`
	TADiastolica               *int16     `json:"ta_diastolica"`
	FrecuenciaCardiaca         *int16     `json:"frecuencia_cardiaca"`
	FrecuenciaRespiratoria     *int16     `json:"frecuencia_respiratoria"`
	Temperatura                *float64   `json:"temperatura"`
	SaturacionO2               *int16     `json:"saturacion_o2"`
	Peso                       *float64   `json:"peso"`
	Talla                      *float64   `json:"talla"`
	ExamenFisico               *string    `json:"examen_fisico"`
	CodigoDiagnosticoPrincipal string     `json:"codigo_diagnostico_principal"`
	DescripcionDiagnostico     *string    `json:"descripcion_diagnostico"`
	PlanManejo                 *string    `json:"plan_manejo"`
	HashIntegridad             *string    `json:"hash_integridad"`
	FechaCreacion              time.Time  `json:"fecha_creacion"`
	CreadoPor                  string     `json:"creado_por"`
	IDSistemaAnterior          *string    `json:"id_sistema_anterior"`
}

type EncuentroInput struct {
	EncuentroPadreID           *string `json:"encuentro_padre_id"`
	FechaAtencion              *string `json:"fecha_atencion"` // si es nil usa la hora actual
	CausaExterna               string  `json:"causa_externa"`
	FinalidadConsulta          string  `json:"finalidad_consulta"`
	ViaIngreso                 string  `json:"via_ingreso"`
	MotivoConsulta             string   `json:"motivo_consulta"`
	TASistolica                *int16   `json:"ta_sistolica"`
	TADiastolica               *int16   `json:"ta_diastolica"`
	FrecuenciaCardiaca         *int16   `json:"frecuencia_cardiaca"`
	FrecuenciaRespiratoria     *int16   `json:"frecuencia_respiratoria"`
	Temperatura                *float64 `json:"temperatura"`
	SaturacionO2               *int16   `json:"saturacion_o2"`
	Peso                       *float64 `json:"peso"`
	Talla                      *float64 `json:"talla"`
	ExamenFisico               *string  `json:"examen_fisico"`
	CodigoDiagnosticoPrincipal string   `json:"codigo_diagnostico_principal"`
	DescripcionDiagnostico     *string `json:"descripcion_diagnostico"`
	PlanManejo                 *string `json:"plan_manejo"`
}
