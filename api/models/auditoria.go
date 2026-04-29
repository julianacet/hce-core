package models

import "time"

type LogAuditoria struct {
	ID              int64      `json:"id"`
	NombreTabla     string     `json:"nombre_tabla"`
	RegistroID      string     `json:"registro_id"`
	Accion          string     `json:"accion"`
	DatosAnteriores *string    `json:"datos_anteriores"`
	DatosNuevos     *string    `json:"datos_nuevos"`
	UsuarioID       *string    `json:"usuario_id"`
	FechaCambio     time.Time  `json:"fecha_cambio"`
}
