package models

import "time"

type DashboardResumen struct {
	EncuentrosHoy        int              `json:"encuentros_hoy"`
	PacientesMes         int              `json:"pacientes_mes"`
	FacturadoMes         float64          `json:"facturado_mes"`
	SatisfaccionPromedio *float64         `json:"satisfaccion_promedio"`
	InsumosStockBajo     []InsumoAlerta   `json:"insumos_stock_bajo"`
	UltimosPacientes     []UltimoPaciente `json:"ultimos_pacientes"`
	// Advertencias lista las métricas que no pudieron cargarse por error de BD.
	// Nil o vacío significa que todos los datos son completos.
	Advertencias []string `json:"advertencias,omitempty"`
}

type InsumoAlerta struct {
	ID          string  `json:"id"`
	Nombre      string  `json:"nombre"`
	StockActual float64 `json:"stock_actual"`
	StockMinimo float64 `json:"stock_minimo"`
	Unidad      string  `json:"unidad"`
}

type UltimoPaciente struct {
	EncuentroID                string    `json:"encuentro_id"`
	PacienteDocumento          string    `json:"paciente_documento"`
	NombrePaciente             string    `json:"nombre_paciente"`
	FechaAtencion              time.Time `json:"fecha_atencion"`
	CodigoDiagnosticoPrincipal string    `json:"codigo_diagnostico_principal"`
	DescripcionDiagnostico     *string   `json:"descripcion_diagnostico"`
}
