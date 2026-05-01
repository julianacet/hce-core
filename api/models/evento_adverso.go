package models

import (
	"encoding/json"
	"time"
)

type TipoEventoAdverso struct {
	ID                    string    `json:"id"`
	Nombre                string    `json:"nombre"`
	Descripcion           *string   `json:"descripcion"`
	RequiereReporteINVIMA bool      `json:"requiere_reporte_invima"`
	EstaActivo            bool      `json:"esta_activo"`
	FechaCreacion         time.Time `json:"fecha_creacion"`
	CreadoPor             string    `json:"creado_por"`
}

type TipoEventoAdversoInput struct {
	Nombre                string  `json:"nombre"`
	Descripcion           *string `json:"descripcion"`
	RequiereReporteINVIMA bool    `json:"requiere_reporte_invima"`
}

type FactoresContribuyentes struct {
	Humano         bool   `json:"humano"`
	Entorno        bool   `json:"entorno"`
	Equipos        bool   `json:"equipos"`
	Organizacional bool   `json:"organizacional"`
	Paciente       bool   `json:"paciente"`
	Notas          string `json:"notas"`
}

type EventoAdverso struct {
	ID                     string                  `json:"id"`
	Numero                 int64                   `json:"numero"`
	TipoID                 *string                 `json:"tipo_id"`
	TipoNombre             *string                 `json:"tipo_nombre"`
	FechaEvento            time.Time               `json:"fecha_evento"`
	PacienteDocumento      *string                 `json:"paciente_documento"`
	DiagnosticoActivo      *string                 `json:"diagnostico_activo"`
	Clasificacion          string                  `json:"clasificacion"`
	CategoriaDanio         string                  `json:"categoria_danio"`
	SeInformoPaciente      *bool                   `json:"se_informo_paciente"`
	Descripcion            string                  `json:"descripcion"`
	ComoSeDetecto          *string                 `json:"como_se_detecto"`
	FactoresContribuyentes *FactoresContribuyentes `json:"factores_contribuyentes"`
	AccionesInmediatas     *string                 `json:"acciones_inmediatas"`
	RequiereCausaRaiz      bool                    `json:"requiere_causa_raiz"`
	AnalisisCausaRaiz      *string                 `json:"analisis_causa_raiz"`
	AccionesMejora         *string                 `json:"acciones_mejora"`
	ResponsableSeguimiento *string                 `json:"responsable_seguimiento"`
	FechaLimiteMejora      *string                 `json:"fecha_limite_mejora"`
	Estado                 string                  `json:"estado"`
	FechaCierre            *time.Time              `json:"fecha_cierre"`
	CerradoPor             *string                 `json:"cerrado_por"`
	CreadoPor              string                  `json:"creado_por"`
	FechaCreacion          time.Time               `json:"fecha_creacion"`
}

type EventoAdversoInput struct {
	TipoID                 *string                 `json:"tipo_id"`
	FechaEvento            string                  `json:"fecha_evento"`
	PacienteDocumento      *string                 `json:"paciente_documento"`
	DiagnosticoActivo      *string                 `json:"diagnostico_activo"`
	Clasificacion          string                  `json:"clasificacion"`
	CategoriaDanio         string                  `json:"categoria_danio"`
	SeInformoPaciente      *bool                   `json:"se_informo_paciente"`
	Descripcion            string                  `json:"descripcion"`
	ComoSeDetecto          *string                 `json:"como_se_detecto"`
	FactoresContribuyentes *FactoresContribuyentes `json:"factores_contribuyentes"`
	AccionesInmediatas     *string                 `json:"acciones_inmediatas"`
	RequiereCausaRaiz      bool                    `json:"requiere_causa_raiz"`
}

type SeguimientoInput struct {
	AnalisisCausaRaiz      *string `json:"analisis_causa_raiz"`
	AccionesMejora         *string `json:"acciones_mejora"`
	ResponsableSeguimiento *string `json:"responsable_seguimiento"`
	FechaLimiteMejora      *string `json:"fecha_limite_mejora"`
	Estado                 string  `json:"estado"`
}

// MarshalFactores serializa FactoresContribuyentes a JSON para almacenar en JSONB.
func MarshalFactores(f *FactoresContribuyentes) []byte {
	if f == nil {
		return nil
	}
	b, _ := json.Marshal(f)
	return b
}

// UnmarshalFactores deserializa desde JSONB.
func UnmarshalFactores(b []byte) *FactoresContribuyentes {
	if b == nil {
		return nil
	}
	var f FactoresContribuyentes
	if err := json.Unmarshal(b, &f); err != nil {
		return nil
	}
	return &f
}
