package models

import "time"

type DashboardResumen struct {
	EncuentrosHoy         int                   `json:"encuentros_hoy"`
	PacientesMes          int                   `json:"pacientes_mes"`
	FacturadoMes          float64               `json:"facturado_mes"`
	SatisfaccionPromedio  *float64              `json:"satisfaccion_promedio"`
	CitasHoy              []CitaHoy             `json:"citas_hoy"`
	ConsultasPorDia       []ConsultaPorDia      `json:"consultas_por_dia"`
	TopDiagnosticos       []TopDiagnostico      `json:"top_diagnosticos"`
	InsumosStockBajo      []InsumoAlerta        `json:"insumos_stock_bajo"`
	InsumosProximosVencer []InsumoProximoVencer `json:"insumos_proximos_vencer"`
	UltimosPacientes      []UltimoPaciente      `json:"ultimos_pacientes"`
	Advertencias          []string              `json:"advertencias,omitempty"`
}

type InsumoAlerta struct {
	ID          string  `json:"id"`
	Nombre      string  `json:"nombre"`
	StockActual float64 `json:"stock_actual"`
	StockMinimo float64 `json:"stock_minimo"`
	Unidad      string  `json:"unidad"`
}

type InsumoProximoVencer struct {
	ID               string `json:"id"`
	Nombre           string `json:"nombre"`
	FechaVencimiento string `json:"fecha_vencimiento"`
	DiasRestantes    int    `json:"dias_restantes"`
}

type UltimoPaciente struct {
	EncuentroID                string    `json:"encuentro_id"`
	PacienteDocumento          string    `json:"paciente_documento"`
	NombrePaciente             string    `json:"nombre_paciente"`
	FechaAtencion              time.Time `json:"fecha_atencion"`
	CodigoDiagnosticoPrincipal string    `json:"codigo_diagnostico_principal"`
	DescripcionDiagnostico     *string   `json:"descripcion_diagnostico"`
}

type CitaHoy struct {
	ID             string  `json:"id"`
	HoraInicio     string  `json:"hora_inicio"`
	PacienteNombre string  `json:"paciente_nombre"`
	PacienteDoc    *string `json:"paciente_documento"`
	Estado         string  `json:"estado"`
	Motivo         *string `json:"motivo"`
}

type ConsultaPorDia struct {
	Fecha string `json:"fecha"`
	Total int    `json:"total"`
}

type TopDiagnostico struct {
	Codigo      string `json:"codigo"`
	Descripcion string `json:"descripcion"`
	Total       int    `json:"total"`
}
