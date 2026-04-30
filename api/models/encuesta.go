package models

import "time"

type EncuestaInput struct {
	FechaAtencion           string  `json:"fecha_atencion"` // YYYY-MM-DD, ingresada manualmente
	PacienteDocumento       *string `json:"paciente_documento"`
	FacilidadCita           int     `json:"facilidad_cita"`
	TiempoEspera            int     `json:"tiempo_espera"`
	CalidadAtencion         int     `json:"calidad_atencion"`
	ComunicacionMedico      int     `json:"comunicacion_medico"`
	ClaridadInformacion     int     `json:"claridad_informacion"`
	ComodidadInstalaciones  int     `json:"comodidad_instalaciones"`
	SatisfaccionGeneral     int     `json:"satisfaccion_general"`
	Recomendaria            bool    `json:"recomendaria"`
	Comentarios             *string `json:"comentarios"`
}

type Encuesta struct {
	ID                     string    `json:"id"`
	FechaAtencion          string    `json:"fecha_atencion"` // DATE → string YYYY-MM-DD
	PacienteDocumento      *string   `json:"paciente_documento"`
	FacilidadCita          int       `json:"facilidad_cita"`
	TiempoEspera           int       `json:"tiempo_espera"`
	CalidadAtencion        int       `json:"calidad_atencion"`
	ComunicacionMedico     int       `json:"comunicacion_medico"`
	ClaridadInformacion    int       `json:"claridad_informacion"`
	ComodidadInstalaciones int       `json:"comodidad_instalaciones"`
	SatisfaccionGeneral    int       `json:"satisfaccion_general"`
	Recomendaria           bool      `json:"recomendaria"`
	Comentarios            *string   `json:"comentarios"`
	FechaRegistro          time.Time `json:"fecha_registro"`
	RegistradoPor          string    `json:"registrado_por"`
}

type EncuestaResumen struct {
	Total                  int     `json:"total"`
	FacilidadCita          float64 `json:"facilidad_cita"`
	TiempoEspera           float64 `json:"tiempo_espera"`
	CalidadAtencion        float64 `json:"calidad_atencion"`
	ComunicacionMedico     float64 `json:"comunicacion_medico"`
	ClaridadInformacion    float64 `json:"claridad_informacion"`
	ComodidadInstalaciones float64 `json:"comodidad_instalaciones"`
	SatisfaccionGeneral    float64 `json:"satisfaccion_general"`
	PorcentajeNPS          float64 `json:"porcentaje_nps"` // % de "sí recomendaría"
}
