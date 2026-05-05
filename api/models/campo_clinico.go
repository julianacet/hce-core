package models

type CampoClinico struct {
	ID         string  `json:"id"`
	Seccion    string  `json:"seccion"`
	Nombre     string  `json:"nombre"`
	Tipo       string  `json:"tipo"`
	Unidad     *string `json:"unidad"`
	Clave      string  `json:"clave"`
	Orden      int     `json:"orden"`
	EstaActivo bool    `json:"esta_activo"`
}

type CampoClinicoInput struct {
	Seccion string  `json:"seccion"`
	Nombre  string  `json:"nombre"`
	Tipo    string  `json:"tipo"`
	Unidad  *string `json:"unidad"`
	Clave   string  `json:"clave"`
	Orden   int     `json:"orden"`
}
