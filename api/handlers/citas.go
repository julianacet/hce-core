package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

const colsCita = `id, fecha::text, hora_inicio::text, duracion_minutos,
	paciente_documento, paciente_nombre, paciente_telefono,
	motivo, estado, notas, creado_por, fecha_creacion`

func escanearCita(row interface{ Scan(...any) error }) (*models.Cita, error) {
	var c models.Cita
	err := row.Scan(
		&c.ID, &c.Fecha, &c.HoraInicio, &c.DuracionMinutos,
		&c.PacienteDocumento, &c.PacienteNombre, &c.PacienteTelefono,
		&c.Motivo, &c.Estado, &c.Notas, &c.CreadoPor, &c.FechaCreacion,
	)
	return &c, err
}

var estadosValidos = map[string]bool{
	"programada": true, "cancelada": true,
}

func CitasRouter(db *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()

	// GET /citas?fecha=2026-05-01  — día específico
	// GET /citas?desde=2026-05-01&hasta=2026-05-31  — rango (mini calendario)
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		fecha := r.URL.Query().Get("fecha")
		desde := r.URL.Query().Get("desde")
		hasta := r.URL.Query().Get("hasta")

		var q string
		var args []any

		switch {
		case desde != "" && hasta != "":
			q = `SELECT ` + colsCita + ` FROM cita WHERE fecha BETWEEN $1 AND $2 ORDER BY fecha, hora_inicio`
			args = []any{desde, hasta}
		case fecha != "":
			q = `SELECT ` + colsCita + ` FROM cita WHERE fecha = $1 ORDER BY hora_inicio`
			args = []any{fecha}
		default:
			q = `SELECT ` + colsCita + ` FROM cita WHERE fecha = current_date ORDER BY hora_inicio`
			args = []any{}
		}

		rows, err := db.Query(r.Context(), q, args...)
		if err != nil {
			log.Printf("listar citas: %v", err)
			responderError(w, http.StatusInternalServerError, "error al consultar citas")
			return
		}
		defer rows.Close()

		citas := []models.Cita{}
		for rows.Next() {
			c, err := escanearCita(rows)
			if err != nil {
				log.Printf("escanear cita: %v", err)
				responderError(w, http.StatusInternalServerError, "error al leer cita")
				return
			}
			citas = append(citas, *c)
		}
		responderJSON(w, http.StatusOK, citas)
	})

	r.Post("/", func(w http.ResponseWriter, r *http.Request) {
		u := appmiddleware.UsuarioDesdeContexto(r.Context())
		var inp models.CitaInput
		if err := json.NewDecoder(r.Body).Decode(&inp); err != nil {
			responderError(w, http.StatusBadRequest, "body inválido")
			return
		}
		if inp.PacienteNombre == "" || inp.Fecha == "" || inp.HoraInicio == "" {
			responderError(w, http.StatusBadRequest, "nombre, fecha y hora son requeridos")
			return
		}
		if inp.DuracionMinutos <= 0 {
			inp.DuracionMinutos = 30
		}

		row := db.QueryRow(r.Context(),
			`INSERT INTO cita
			   (fecha, hora_inicio, duracion_minutos, paciente_documento,
			    paciente_nombre, paciente_telefono, motivo, notas, creado_por)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			 RETURNING `+colsCita,
			inp.Fecha, inp.HoraInicio, inp.DuracionMinutos, inp.PacienteDocumento,
			inp.PacienteNombre, inp.PacienteTelefono, inp.Motivo, inp.Notas, u.Nombre,
		)
		c, err := escanearCita(row)
		if err != nil {
			log.Printf("crear cita: %v", err)
			responderError(w, http.StatusInternalServerError, "error al crear cita")
			return
		}
		responderJSON(w, http.StatusCreated, c)
	})

	r.Put("/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var inp models.CitaInput
		if err := json.NewDecoder(r.Body).Decode(&inp); err != nil {
			responderError(w, http.StatusBadRequest, "body inválido")
			return
		}
		if inp.DuracionMinutos <= 0 {
			inp.DuracionMinutos = 30
		}

		row := db.QueryRow(r.Context(),
			`UPDATE cita SET
			   fecha=$1, hora_inicio=$2, duracion_minutos=$3, paciente_documento=$4,
			   paciente_nombre=$5, paciente_telefono=$6, motivo=$7, notas=$8
			 WHERE id=$9
			 RETURNING `+colsCita,
			inp.Fecha, inp.HoraInicio, inp.DuracionMinutos, inp.PacienteDocumento,
			inp.PacienteNombre, inp.PacienteTelefono, inp.Motivo, inp.Notas, id,
		)
		c, err := escanearCita(row)
		if err != nil {
			responderError(w, http.StatusNotFound, "cita no encontrada")
			return
		}
		responderJSON(w, http.StatusOK, c)
	})

	r.Patch("/{id}/estado", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var inp models.CitaEstadoInput
		if err := json.NewDecoder(r.Body).Decode(&inp); err != nil {
			responderError(w, http.StatusBadRequest, "body inválido")
			return
		}
		if !estadosValidos[inp.Estado] {
			responderError(w, http.StatusBadRequest, "estado inválido")
			return
		}

		row := db.QueryRow(r.Context(),
			`UPDATE cita SET estado=$1 WHERE id=$2 RETURNING `+colsCita,
			inp.Estado, id,
		)
		c, err := escanearCita(row)
		if err != nil {
			responderError(w, http.StatusNotFound, "cita no encontrada")
			return
		}
		responderJSON(w, http.StatusOK, c)
	})

	r.Delete("/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		tag, err := db.Exec(r.Context(), `DELETE FROM cita WHERE id=$1`, id)
		if err != nil {
			log.Printf("eliminar cita: %v", err)
			responderError(w, http.StatusInternalServerError, "error al eliminar cita")
			return
		}
		if tag.RowsAffected() == 0 {
			responderError(w, http.StatusNotFound, "cita no encontrada")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	return r
}
