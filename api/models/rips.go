package models

// RipsInput es el body del POST para generar el RIPS.
type RipsInput struct {
	NIT                      string `json:"nit"`
	CodPrestador             string `json:"codPrestador"`
	TipoDiagnosticoPrincipal string `json:"tipoDiagnosticoPrincipal"` // "01" impresión, "02" confirmado clínicamente
}

// RipsTransaccion es la estructura raíz del JSON según Res. 2275/2023.
type RipsTransaccion struct {
	NumDocumentoIdObligado string        `json:"numDocumentoIdObligado"`
	NumFactura             *string       `json:"numFactura"` // null para lotes sin FEV
	TipoNota               *string       `json:"tipoNota"`
	NumNota                *string       `json:"numNota"`
	Usuarios               []RipsUsuario `json:"usuarios"`
}

type RipsUsuario struct {
	TipoDocumentoIdentificacion  string        `json:"tipoDocumentoIdentificacion"`
	NumDocumentoIdentificacion   string        `json:"numDocumentoIdentificacion"`
	TipoUsuario                  string        `json:"tipoUsuario"`
	FechaNacimiento              string        `json:"fechaNacimiento"`
	CodSexo                      string        `json:"codSexo"`
	CodPaisResidencia            string        `json:"codPaisResidencia"`
	CodMunicipioResidencia       string        `json:"codMunicipioResidencia"`
	CodZonaTerritorialResidencia string        `json:"codZonaTerritorialResidencia"`
	Incapacidad                  string        `json:"incapacidad"`
	CodPaisOrigen                string        `json:"codPaisOrigen"`
	Consecutivo                  int           `json:"consecutivo"`
	Servicios                    RipsServicios `json:"servicios"`
}

type RipsServicios struct {
	Consultas    []RipsConsulta    `json:"consultas,omitempty"`
	Procedimientos []RipsProcedimiento `json:"procedimientos,omitempty"`
}

// RipsConsulta representa una consulta médica (CUPS 890xxx) en el RIPS.
type RipsConsulta struct {
	CodPrestador               string  `json:"codPrestador"`
	FechaInicioAtencion        string  `json:"fechaInicioAtencion"`
	NumAutorizacion            *string `json:"numAutorizacion"`
	CodDiagnosticoPrincipal    string  `json:"codDiagnosticoPrincipal"`
	CodDiagnosticoPrincipalE   *string `json:"codDiagnosticoPrincipalE"`
	CodDiagnosticoRelacionado1 *string `json:"codDiagnosticoRelacionado1"`
	CodDiagnosticoRelacionado2 *string `json:"codDiagnosticoRelacionado2"`
	CodDiagnosticoRelacionado3 *string `json:"codDiagnosticoRelacionado3"`
	TipoDiagnosticoPrincipal   string  `json:"tipoDiagnosticoPrincipal"`
	FinalidadTecnologiaSalud   string  `json:"finalidadTecnologiaSalud"`
	CausaExternaMotivoAtencion string  `json:"causaExternaMotivoAtencion"`
	CodConsulta                string  `json:"codConsulta"`
	VrServicio                 float64 `json:"vrServicio"`
	ConceptoRecaudo            string  `json:"conceptoRecaudo"`
	ValorPagoModerador         float64 `json:"valorPagoModerador"`
	NumFEVPagoModerador        *string `json:"numFEVPagoModerador"`
	Consecutivo                int     `json:"consecutivo"`
}

// RipsProcedimiento representa un procedimiento (CUPS distinto de 890xxx) en el RIPS.
type RipsProcedimiento struct {
	CodPrestador              string  `json:"codPrestador"`
	FechaInicioAtencion       string  `json:"fechaInicioAtencion"`
	FechaFinAtencion          string  `json:"fechaFinAtencion"`
	NumAutorizacion           *string `json:"numAutorizacion"`
	IDMiPRES                  *string `json:"idMIPRES"`
	Ambito                    string  `json:"ambito"`               // "02" ambulatorio
	Finalidad                 string  `json:"finalidad"`             // "43" diagnóstico y tratamiento
	PersonalAtiende           string  `json:"personalAtiende"`       // "01" médico
	CodDiagnosticoPrincipal   string  `json:"codDiagnosticoPrincipal"`
	CodDiagnosticoRelacionado *string `json:"codDiagnosticoRelacionado"`
	CodComplicacion           *string `json:"codComplicacion"`
	CodProcedimiento          string  `json:"codProcedimiento"`
	ViaIngreso                string  `json:"viaIngresoServicioSalud"` // "02" consulta externa
	VrServicio                float64 `json:"vrServicio"`
	TipoPagoModerador         string  `json:"tipoPagoModerador"` // "04" particular
	ValorPagoModerador        float64 `json:"valorPagoModerador"`
	Consecutivo               int     `json:"consecutivo"`
}

// RipsGeneradoResponse es la respuesta del endpoint de generación/consulta.
type RipsGeneradoResponse struct {
	ID              string          `json:"id"`
	DatosJSON       RipsTransaccion `json:"datos_json"`
	Estado          string          `json:"estado"`
	CreadoPor       string          `json:"creado_por"`
	FechaGeneracion string          `json:"fecha_generacion"`
}

// RipsMensualInput es el body del POST para generar el lote mensual.
type RipsMensualInput struct {
	Anio                     int    `json:"anio"`
	Mes                      int    `json:"mes"`
	NIT                      string `json:"nit"`
	CodPrestador             string `json:"codPrestador"`
	TipoDiagnosticoPrincipal string `json:"tipoDiagnosticoPrincipal"`
}

// RipsMensualResumen es la vista previa de lo que contiene un período.
type RipsMensualResumen struct {
	Pacientes   int `json:"pacientes"`
	Encuentros  int `json:"encuentros"`
	ConFactura  int `json:"con_factura"`
	SinFactura  int `json:"sin_factura"`
}

// RipsLoteItem es una entrada del historial de lotes generados.
type RipsLoteItem struct {
	ID              string `json:"id"`
	Periodo         string `json:"periodo"`
	Estado          string `json:"estado"`
	CreadoPor       string `json:"creado_por"`
	FechaGeneracion string `json:"fecha_generacion"`
}
