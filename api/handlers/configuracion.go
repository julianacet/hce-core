package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
)

// GetConfiguracion — público, sin auth requerida.
// Devuelve { "tema": {...}, "medico": {...} }
func GetConfiguracion(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var temaBytes, medicoBytes []byte
		err := db.QueryRow(r.Context(),
			`SELECT tema, medico FROM configuracion_sistema WHERE id = 1`,
		).Scan(&temaBytes, &medicoBytes)

		w.Header().Set("Content-Type", "application/json")
		if err != nil {
			w.Write([]byte(`{"tema":{},"medico":{}}`))
			return
		}
		fmt.Fprintf(w, `{"tema":%s,"medico":%s}`, temaBytes, medicoBytes)
	}
}

// PutConfiguracionTema — protegido. Actualiza solo el tema visual.
func PutConfiguracionTema(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil || !json.Valid(body) {
			responderError(w, http.StatusBadRequest, "JSON inválido")
			return
		}
		u := appmiddleware.UsuarioDesdeContexto(r.Context())

		var temaBytes []byte
		err = db.QueryRow(r.Context(),
			`INSERT INTO configuracion_sistema (id, tema, actualizado_por, fecha_actualizacion)
			 VALUES (1, $1, $2, now())
			 ON CONFLICT (id) DO UPDATE
			   SET tema = $1, actualizado_por = $2, fecha_actualizacion = now()
			 RETURNING tema`,
			body, u.Nombre,
		).Scan(&temaBytes)
		if err != nil {
			log.Printf("guardar tema: %v", err)
			responderError(w, http.StatusInternalServerError, "error al guardar tema")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"tema":%s}`, temaBytes)
	}
}

// PutConfiguracionMedico — protegido. Actualiza solo los datos del médico.
func PutConfiguracionMedico(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil || !json.Valid(body) {
			responderError(w, http.StatusBadRequest, "JSON inválido")
			return
		}
		u := appmiddleware.UsuarioDesdeContexto(r.Context())

		var medicoBytes []byte
		err = db.QueryRow(r.Context(),
			`INSERT INTO configuracion_sistema (id, medico, actualizado_por, fecha_actualizacion)
			 VALUES (1, $1, $2, now())
			 ON CONFLICT (id) DO UPDATE
			   SET medico = $1, actualizado_por = $2, fecha_actualizacion = now()
			 RETURNING medico`,
			body, u.Nombre,
		).Scan(&medicoBytes)
		if err != nil {
			log.Printf("guardar medico: %v", err)
			responderError(w, http.StatusInternalServerError, "error al guardar datos del médico")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"medico":%s}`, medicoBytes)
	}
}
