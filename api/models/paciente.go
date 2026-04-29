package models

import "time"

type Paciente struct {
	ID                        string     `json:"id"`
	NumeroVersion             int        `json:"numero_version"`
	EsUltimaVersion           bool       `json:"es_ultima_version"`
	EstaActivo                bool       `json:"esta_activo"`
	TipoDocumento             string     `json:"tipo_documento"`
	NumeroDocumento           string     `json:"numero_documento"`
	NombrePrimero             string     `json:"nombre_primero"`
	NombreSegundo             *string    `json:"nombre_segundo"`
	ApellidoPrimero           string     `json:"apellido_primero"`
	ApellidoSegundo           *string    `json:"apellido_segundo"`
	FechaNacimiento           string     `json:"fecha_nacimiento"`
	Genero                    string     `json:"genero"`
	EstadoCivil               *string    `json:"estado_civil"`
	Ocupacion                 *string    `json:"ocupacion"`
	Direccion                 *string    `json:"direccion"`
	NombreResponsable         *string    `json:"nombre_responsable"`
	TelefonoResponsable       *string    `json:"telefono_responsable"`
	ParentescoResponsable     *string    `json:"parentesco_responsable"`
	CodigoPaisOrigen          string     `json:"codigo_pais_origen"`
	CodigoMunicipioResidencia string     `json:"codigo_municipio_residencia"`
	ZonaResidencia            string     `json:"zona_residencia"`
	TipoUsuario               string     `json:"tipo_usuario"`
	CodigoEtnia               string     `json:"codigo_etnia"`
	CodigoDiscapacidad        string     `json:"codigo_discapacidad"`
	CodigoEps                 *string    `json:"codigo_eps"`
	Telefono                  *string    `json:"telefono"`
	CorreoElectronico         *string    `json:"correo_electronico"`
	PoliticaDatosAceptada     bool       `json:"politica_datos_aceptada"`
	FechaCreacion             time.Time  `json:"fecha_creacion"`
	CreadoPor                 string     `json:"creado_por"`
}

// PacienteInput es lo que llega en el body al crear o actualizar un paciente.
// No incluye los campos que genera el sistema (id, versión, fechas).
type PacienteInput struct {
	TipoDocumento             string  `json:"tipo_documento"`
	NumeroDocumento           string  `json:"numero_documento"`
	NombrePrimero             string  `json:"nombre_primero"`
	NombreSegundo             *string `json:"nombre_segundo"`
	ApellidoPrimero           string  `json:"apellido_primero"`
	ApellidoSegundo           *string `json:"apellido_segundo"`
	FechaNacimiento           string  `json:"fecha_nacimiento"`
	Genero                    string  `json:"genero"`
	EstadoCivil               *string `json:"estado_civil"`
	Ocupacion                 *string `json:"ocupacion"`
	Direccion                 *string `json:"direccion"`
	NombreResponsable         *string `json:"nombre_responsable"`
	TelefonoResponsable       *string `json:"telefono_responsable"`
	ParentescoResponsable     *string `json:"parentesco_responsable"`
	CodigoPaisOrigen          string  `json:"codigo_pais_origen"`
	CodigoMunicipioResidencia string  `json:"codigo_municipio_residencia"`
	ZonaResidencia            string  `json:"zona_residencia"`
	TipoUsuario               string  `json:"tipo_usuario"`
	CodigoEtnia               string  `json:"codigo_etnia"`
	CodigoDiscapacidad        string  `json:"codigo_discapacidad"`
	CodigoEps                 *string `json:"codigo_eps"`
	Telefono                  *string `json:"telefono"`
	CorreoElectronico         *string `json:"correo_electronico"`
	PoliticaDatosAceptada     bool    `json:"politica_datos_aceptada"`
}
