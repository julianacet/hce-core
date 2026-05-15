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

func EncuestasRouter(db *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	h := &encuestasHandler{db: db}

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Get("/resumen", h.resumen)

	return r
}

type encuestasHandler struct{ db *pgxpool.Pool }

func (h *encuestasHandler) listar(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT id, fecha_atencion, paciente_documento,
		       facilidad_cita, tiempo_espera, calidad_atencion,
		       comunicacion_medico, claridad_informacion, comodidad_instalaciones,
		       satisfaccion_general, recomendaria, comentarios,
		       fecha_registro, registrado_por
		FROM encuesta_satisfaccion
		ORDER BY fecha_atencion DESC, fecha_registro DESC
		LIMIT 100`)
	if err != nil {
		log.Printf("listar encuestas: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar encuestas")
		return
	}
	defer rows.Close()

	encuestas := []models.Encuesta{}
	for rows.Next() {
		var e models.Encuesta
		var fechaAtencion string
		if err := rows.Scan(
			&e.ID, &fechaAtencion, &e.PacienteDocumento,
			&e.FacilidadCita, &e.TiempoEspera, &e.CalidadAtencion,
			&e.ComunicacionMedico, &e.ClaridadInformacion, &e.ComodidadInstalaciones,
			&e.SatisfaccionGeneral, &e.Recomendaria, &e.Comentarios,
			&e.FechaRegistro, &e.RegistradoPor,
		); err != nil {
			log.Printf("escanear encuesta: %v", err)
			responderError(w, http.StatusInternalServerError, "error al leer encuesta")
			return
		}
		e.FechaAtencion = fechaAtencion
		encuestas = append(encuestas, e)
	}

	responderJSON(w, http.StatusOK, encuestas)
}

func (h *encuestasHandler) crear(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	usuarioID := ""
	if u != nil {
		usuarioID = u.Nombre
	}

	var input models.EncuestaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}

	dims := []int{
		input.FacilidadCita, input.TiempoEspera, input.CalidadAtencion,
		input.ComunicacionMedico, input.ClaridadInformacion,
		input.ComodidadInstalaciones, input.SatisfaccionGeneral,
	}
	for _, d := range dims {
		if d < 1 || d > 5 {
			responderError(w, http.StatusBadRequest, "todas las calificaciones deben estar entre 1 y 5")
			return
		}
	}

	var e models.Encuesta
	var fechaAtencion string
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO encuesta_satisfaccion (
			fecha_atencion, paciente_documento,
			facilidad_cita, tiempo_espera, calidad_atencion,
			comunicacion_medico, claridad_informacion, comodidad_instalaciones,
			satisfaccion_general, recomendaria, comentarios, registrado_por
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id, fecha_atencion, paciente_documento,
		          facilidad_cita, tiempo_espera, calidad_atencion,
		          comunicacion_medico, claridad_informacion, comodidad_instalaciones,
		          satisfaccion_general, recomendaria, comentarios,
		          fecha_registro, registrado_por`,
		input.FechaAtencion, input.PacienteDocumento,
		input.FacilidadCita, input.TiempoEspera, input.CalidadAtencion,
		input.ComunicacionMedico, input.ClaridadInformacion, input.ComodidadInstalaciones,
		input.SatisfaccionGeneral, input.Recomendaria, input.Comentarios, usuarioID,
	).Scan(
		&e.ID, &fechaAtencion, &e.PacienteDocumento,
		&e.FacilidadCita, &e.TiempoEspera, &e.CalidadAtencion,
		&e.ComunicacionMedico, &e.ClaridadInformacion, &e.ComodidadInstalaciones,
		&e.SatisfaccionGeneral, &e.Recomendaria, &e.Comentarios,
		&e.FechaRegistro, &e.RegistradoPor,
	)
	if err != nil {
		log.Printf("crear encuesta: %v", err)
		responderError(w, http.StatusInternalServerError, "error al guardar encuesta")
		return
	}
	e.FechaAtencion = fechaAtencion

	responderJSON(w, http.StatusCreated, e)
}

func (h *encuestasHandler) resumen(w http.ResponseWriter, r *http.Request) {
	var res models.EncuestaResumen
	var totalRecomiendan int

	err := h.db.QueryRow(r.Context(), `
		SELECT
			COUNT(*),
			COALESCE(AVG(facilidad_cita), 0),
			COALESCE(AVG(tiempo_espera), 0),
			COALESCE(AVG(calidad_atencion), 0),
			COALESCE(AVG(comunicacion_medico), 0),
			COALESCE(AVG(claridad_informacion), 0),
			COALESCE(AVG(comodidad_instalaciones), 0),
			COALESCE(AVG(satisfaccion_general), 0),
			COUNT(*) FILTER (WHERE recomendaria = TRUE)
		FROM encuesta_satisfaccion`,
	).Scan(
		&res.Total,
		&res.FacilidadCita,
		&res.TiempoEspera,
		&res.CalidadAtencion,
		&res.ComunicacionMedico,
		&res.ClaridadInformacion,
		&res.ComodidadInstalaciones,
		&res.SatisfaccionGeneral,
		&totalRecomiendan,
	)
	if err != nil {
		log.Printf("resumen encuestas: %v", err)
		responderError(w, http.StatusInternalServerError, "error al calcular resumen")
		return
	}

	if res.Total > 0 {
		res.PorcentajeNPS = float64(totalRecomiendan) / float64(res.Total) * 100
	}

	responderJSON(w, http.StatusOK, res)
}
