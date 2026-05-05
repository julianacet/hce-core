package models

type DiagnosticoCIE10 struct {
	Codigo string `json:"codigo"`
	Nombre string `json:"nombre"`
}

type DiagnosticoInput struct {
	Tipo        string  `json:"tipo"`   // "principal", "secundario", "nota"
	Codigo      *string `json:"codigo"` // nil cuando tipo == "nota"
	Descripcion string  `json:"descripcion"`
}

type EncuentroDiagnostico struct {
	ID          string  `json:"id"`
	Tipo        string  `json:"tipo"`
	Codigo      *string `json:"codigo,omitempty"`
	Descripcion string  `json:"descripcion"`
	Orden       int     `json:"orden"`
}
