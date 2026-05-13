package models

import (
	"encoding/json"
	"time"
)

type Encuentro struct {
	ID                         string          `json:"id"`
	EncuentroID                string          `json:"encuentro_id"`
	NumeroVersion              int             `json:"numero_version"`
	EsUltimaVersion            bool            `json:"es_ultima_version"`
	EstaActivo                 bool            `json:"esta_activo"`
	Estado                     string          `json:"estado"`
	PacienteDocumento          string          `json:"paciente_documento"`
	EncuentroPadreID           *string         `json:"encuentro_padre_id"`
	FechaAtencion              time.Time       `json:"fecha_atencion"`
	CausaExterna               string          `json:"causa_externa"`
	FinalidadConsulta          string          `json:"finalidad_consulta"`
	ViaIngreso                 string          `json:"via_ingreso"`
	MotivoConsulta             string          `json:"motivo_consulta"`
	DescripcionIngreso         *string         `json:"descripcion_ingreso"`
	SignosVitales              json.RawMessage `json:"signos_vitales"`
	ExamenFisico               json.RawMessage `json:"examen_fisico"`
	RevisionSistemas           json.RawMessage `json:"revision_sistemas"`
	// Kept for RIPS compatibility and list-view display.
	CodigoDiagnosticoPrincipal string          `json:"codigo_diagnostico_principal"`
	DescripcionDiagnostico     *string         `json:"descripcion_diagnostico"`
	PlanManejo                 *string         `json:"plan_manejo"`
	HashIntegridad             *string         `json:"hash_integridad"`
	FechaCreacion              time.Time       `json:"fecha_creacion"`
	CreadoPor                  string          `json:"creado_por"`
	IDSistemaAnterior          *string         `json:"id_sistema_anterior"`
	// Computed labels
	FinalidadConsultaNombre string `json:"finalidad_consulta_nombre"`
	CausaExternaNombre      string `json:"causa_externa_nombre"`
	ViaIngresoNombre        string `json:"via_ingreso_nombre"`
	// Full diagnosis list — populated on detail view.
	Diagnosticos []EncuentroDiagnostico `json:"diagnosticos,omitempty"`
	// true si es el primer control para el encuentro padre (config primer_control_gratis).
	EsPrimerControl *bool `json:"es_primer_control,omitempty"`
}

type EncuentroInput struct {
	EncuentroPadreID  *string            `json:"encuentro_padre_id"`
	FechaAtencion     *string            `json:"fecha_atencion"` // nil → hora actual
	CausaExterna      string             `json:"causa_externa"`
	FinalidadConsulta string             `json:"finalidad_consulta"`
	ViaIngreso        string             `json:"via_ingreso"`
	MotivoConsulta    string             `json:"motivo_consulta"`
	DescripcionIngreso *string           `json:"descripcion_ingreso"`
	SignosVitales     json.RawMessage    `json:"signos_vitales"`
	RevisionSistemas  json.RawMessage    `json:"revision_sistemas"`
	ExamenFisico      json.RawMessage    `json:"examen_fisico"`
	Diagnosticos      []DiagnosticoInput `json:"diagnosticos"`
	PlanManejo        *string            `json:"plan_manejo"`
}
