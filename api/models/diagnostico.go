package models

type DiagnosticoCIE10 struct {
	Codigo string `json:"codigo"`
	Nombre string `json:"nombre"`
}

type DiagnosticoInput struct {
	Tipo        string  `json:"tipo"`
	TipoClinico *string `json:"tipo_clinico,omitempty"`
	Codigo      *string `json:"codigo"`
	Descripcion string  `json:"descripcion"`
}

type EncuentroDiagnostico struct {
	ID          string  `json:"id"`
	Tipo        string  `json:"tipo"`
	TipoClinico *string `json:"tipo_clinico,omitempty"`
	Codigo      *string `json:"codigo,omitempty"`
	Descripcion string  `json:"descripcion"`
	Orden       int     `json:"orden"`
}
