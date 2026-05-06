package models

import "time"

type NotaEncuentro struct {
	ID            string    `json:"id"`
	EncuentroID   string    `json:"encuentro_id"`
	Texto         string    `json:"texto"`
	FechaCreacion time.Time `json:"fecha_creacion"`
	CreadoPor     string    `json:"creado_por"`
}

type NotaEncuentroInput struct {
	Texto string `json:"texto"`
}
