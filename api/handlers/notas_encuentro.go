package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

func NotasEncuentroRouter(db *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()
	r.Get("/", listarNotas(db))
	r.Post("/", crearNota(db))
	return r
}

func listarNotas(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		encuentroID := chi.URLParam(r, "encuentroId")

		rows, err := db.Query(r.Context(), `
			SELECT id, encuentro_id, texto, fecha_creacion, creado_por
			FROM encuentro_nota
			WHERE encuentro_id = $1
			ORDER BY fecha_creacion DESC`,
			encuentroID,
		)
		if err != nil {
			log.Printf("listar notas: %v", err)
			responderError(w, http.StatusInternalServerError, "error al consultar notas")
			return
		}
		defer rows.Close()

		notas := make([]models.NotaEncuentro, 0)
		for rows.Next() {
			var n models.NotaEncuentro
			if err := rows.Scan(&n.ID, &n.EncuentroID, &n.Texto, &n.FechaCreacion, &n.CreadoPor); err != nil {
				responderError(w, http.StatusInternalServerError, "error al leer nota")
				return
			}
			notas = append(notas, n)
		}

		responderJSON(w, http.StatusOK, notas)
	}
}

func crearNota(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		encuentroID := chi.URLParam(r, "encuentroId")

		var input models.NotaEncuentroInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			responderError(w, http.StatusBadRequest, "body inválido")
			return
		}

		if strings.TrimSpace(input.Texto) == "" {
			responderError(w, http.StatusBadRequest, "el texto de la nota no puede estar vacío")
			return
		}

		// Verificar que el encuentro existe
		var existe bool
		db.QueryRow(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM encuentro_clinico WHERE encuentro_id = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE)`,
			encuentroID,
		).Scan(&existe)
		if !existe {
			responderError(w, http.StatusNotFound, "encuentro no encontrado")
			return
		}

		u := appmiddleware.UsuarioDesdeContexto(r.Context())

		var n models.NotaEncuentro
		err := db.QueryRow(r.Context(), `
			INSERT INTO encuentro_nota (encuentro_id, texto, creado_por)
			VALUES ($1, $2, $3)
			RETURNING id, encuentro_id, texto, fecha_creacion, creado_por`,
			encuentroID, strings.TrimSpace(input.Texto), u.Nombre,
		).Scan(&n.ID, &n.EncuentroID, &n.Texto, &n.FechaCreacion, &n.CreadoPor)
		if err != nil {
			log.Printf("crear nota: %v", err)
			responderError(w, http.StatusInternalServerError, "error al guardar nota")
			return
		}

		responderJSON(w, http.StatusCreated, n)
	}
}
