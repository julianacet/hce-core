package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

type RipsHandler struct {
	db *pgxpool.Pool
}

func RipsMensualRouter(db *pgxpool.Pool) http.Handler {
	h := &RipsHandler{db: db}
	r := chi.NewRouter()
	r.Get("/resumen", h.resumen)
	r.Get("/historial", h.historial)
	r.Post("/", h.generarMensual)
	return r
}

// GET /rips/resumen?anio=2026&mes=4
func (h *RipsHandler) resumen(w http.ResponseWriter, r *http.Request) {
	anio := r.URL.Query().Get("anio")
	mes := r.URL.Query().Get("mes")
	if anio == "" || mes == "" {
		responderError(w, http.StatusBadRequest, "anio y mes son obligatorios")
		return
	}

	var res models.RipsMensualResumen
	err := h.db.QueryRow(r.Context(), `
		SELECT
			COUNT(DISTINCT ec.paciente_documento)::int,
			COUNT(*)::int
		FROM encuentro_clinico ec
		WHERE ec.es_ultima_version = TRUE AND ec.esta_activo = TRUE
		  AND EXTRACT(YEAR  FROM ec.fecha_atencion) = $1
		  AND EXTRACT(MONTH FROM ec.fecha_atencion) = $2`,
		anio, mes,
	).Scan(&res.Pacientes, &res.Encuentros)
	if err != nil {
		log.Printf("rips resumen: %v", err)
		responderError(w, http.StatusInternalServerError, "error al calcular resumen")
		return
	}

	responderJSON(w, http.StatusOK, res)
}

// GET /rips/historial
func (h *RipsHandler) historial(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT id, periodo, estado, creado_por, fecha_generacion::text
		FROM rips_generado
		WHERE periodo IS NOT NULL
		ORDER BY fecha_generacion DESC
		LIMIT 50`)
	if err != nil {
		log.Printf("rips historial: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar historial")
		return
	}
	defer rows.Close()

	lotes := make([]models.RipsLoteItem, 0)
	for rows.Next() {
		var item models.RipsLoteItem
		if err := rows.Scan(&item.ID, &item.Periodo, &item.Estado, &item.CreadoPor, &item.FechaGeneracion); err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer historial")
			return
		}
		lotes = append(lotes, item)
	}

	responderJSON(w, http.StatusOK, lotes)
}

// POST /rips
// Body: { anio, mes, nit, codPrestador, tipoDiagnosticoPrincipal }
func (h *RipsHandler) generarMensual(w http.ResponseWriter, r *http.Request) {
	var input models.RipsMensualInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if input.NIT == "" || input.CodPrestador == "" {
		responderError(w, http.StatusBadRequest, "nit y codPrestador son obligatorios")
		return
	}
	if input.Anio < 2020 || input.Mes < 1 || input.Mes > 12 {
		responderError(w, http.StatusBadRequest, "anio y mes inválidos")
		return
	}
	if input.TipoDiagnosticoPrincipal == "" {
		input.TipoDiagnosticoPrincipal = "01"
	}

	// 1. Cargar todos los encuentros del período con datos del paciente
	type encData struct {
		EncuentroID       string
		FechaAtencion     time.Time
		CausaExterna      string
		FinalidadConsulta string
		ViaIngreso        string
		CodigoDiagnostico string
		TipoDoc           string
		NumDoc            string
		FechaNac          string
		Genero            string
		PaisOrigen        string
		MunicipioRes      string
		ZonaRes           string
		TipoUsuario       string
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT
			ec.encuentro_id, ec.fecha_atencion,
			ec.causa_externa, ec.finalidad_consulta, ec.via_ingreso,
			ec.codigo_diagnostico_principal,
			p.tipo_documento, p.numero_documento, p.fecha_nacimiento::text,
			p.genero, p.codigo_pais_origen,
			p.codigo_municipio_residencia, p.zona_residencia, p.tipo_usuario
		FROM encuentro_clinico ec
		JOIN paciente p
		  ON p.numero_documento = ec.paciente_documento
		 AND p.es_ultima_version = TRUE AND p.esta_activo = TRUE
		WHERE ec.es_ultima_version = TRUE AND ec.esta_activo = TRUE
		  AND EXTRACT(YEAR  FROM ec.fecha_atencion) = $1
		  AND EXTRACT(MONTH FROM ec.fecha_atencion) = $2
		ORDER BY ec.paciente_documento, ec.fecha_atencion`,
		input.Anio, input.Mes,
	)
	if err != nil {
		log.Printf("rips mensual query encuentros: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar encuentros")
		return
	}
	defer rows.Close()

	// Agrupar por paciente manteniendo orden de aparición
	type pacienteKey = string
	patientOrder := []pacienteKey{}
	patientMeta := map[pacienteKey]encData{}
	patientEncs := map[pacienteKey][]encData{}
	encounterIDs := []string{}

	for rows.Next() {
		var enc encData
		if err := rows.Scan(
			&enc.EncuentroID, &enc.FechaAtencion,
			&enc.CausaExterna, &enc.FinalidadConsulta, &enc.ViaIngreso,
			&enc.CodigoDiagnostico,
			&enc.TipoDoc, &enc.NumDoc, &enc.FechaNac,
			&enc.Genero, &enc.PaisOrigen,
			&enc.MunicipioRes, &enc.ZonaRes, &enc.TipoUsuario,
		); err != nil {
			log.Printf("rips mensual scan enc: %v", err)
			responderError(w, http.StatusInternalServerError, "error al leer encuentros")
			return
		}
		if _, exists := patientMeta[enc.NumDoc]; !exists {
			patientOrder = append(patientOrder, enc.NumDoc)
			patientMeta[enc.NumDoc] = enc
		}
		patientEncs[enc.NumDoc] = append(patientEncs[enc.NumDoc], enc)
		encounterIDs = append(encounterIDs, enc.EncuentroID)
	}
	rows.Close()

	if len(encounterIDs) == 0 {
		responderError(w, http.StatusUnprocessableEntity, "no hay encuentros en el período seleccionado")
		return
	}

	// CUPS por defecto según finalidad
	cupsDefault := map[string]string{
		"10": "890101",
		"11": "890201",
		"12": "890301",
	}

	// 3. Construir el JSON RIPS
	usuarios := make([]models.RipsUsuario, 0, len(patientOrder))
	for idx, doc := range patientOrder {
		meta := patientMeta[doc]
		encs := patientEncs[doc]

		var consultas []models.RipsConsulta
		var procedimientos []models.RipsProcedimiento
		cntC := 0

		for _, enc := range encs {
			fechaStr := enc.FechaAtencion.Format("2006-01-02T15:04:05")
			cups := cupsDefault[enc.FinalidadConsulta]
			if cups == "" {
				cups = "890101"
			}
			cntC++
			consultas = append(consultas, models.RipsConsulta{
				CodPrestador:               input.CodPrestador,
				FechaInicioAtencion:        fechaStr,
				NumAutorizacion:            nil,
				CodDiagnosticoPrincipal:    enc.CodigoDiagnostico,
				CodDiagnosticoPrincipalE:   nil,
				CodDiagnosticoRelacionado1: nil,
				CodDiagnosticoRelacionado2: nil,
				CodDiagnosticoRelacionado3: nil,
				TipoDiagnosticoPrincipal:   input.TipoDiagnosticoPrincipal,
				FinalidadTecnologiaSalud:   enc.FinalidadConsulta,
				CausaExternaMotivoAtencion: enc.CausaExterna,
				CodConsulta:                cups,
				VrServicio:                 0,
				ConceptoRecaudo:            "04",
				ValorPagoModerador:         0,
				NumFEVPagoModerador:        nil,
				Consecutivo:                cntC,
			})
		}

		usuarios = append(usuarios, models.RipsUsuario{
			TipoDocumentoIdentificacion:  meta.TipoDoc,
			NumDocumentoIdentificacion:   meta.NumDoc,
			TipoUsuario:                  meta.TipoUsuario,
			FechaNacimiento:              meta.FechaNac,
			CodSexo:                      meta.Genero,
			CodPaisResidencia:            meta.PaisOrigen,
			CodMunicipioResidencia:       meta.MunicipioRes,
			CodZonaTerritorialResidencia: meta.ZonaRes,
			Incapacidad:                  "N",
			CodPaisOrigen:                meta.PaisOrigen,
			Consecutivo:                  idx + 1,
			Servicios: models.RipsServicios{
				Consultas:      consultas,
				Procedimientos: procedimientos,
			},
		})
	}

	periodo := fmt.Sprintf("%04d-%02d", input.Anio, input.Mes)
	rips := models.RipsTransaccion{
		NumDocumentoIdObligado: input.NIT,
		NumFactura:             nil, // lote sin FEV
		TipoNota:               nil,
		NumNota:                nil,
		Usuarios:               usuarios,
	}

	// 4. Almacenar
	datosJSON, err := json.Marshal(rips)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al serializar RIPS")
		return
	}

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	var ripsID, fechaGen string
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO rips_generado (periodo, datos_json, estado, creado_por)
		VALUES ($1, $2, 'pendiente', $3)
		RETURNING id, fecha_generacion::text`,
		periodo, string(datosJSON), u.Nombre,
	).Scan(&ripsID, &fechaGen)
	if err != nil {
		log.Printf("insertar rips_generado mensual: %v", err)
		responderError(w, http.StatusInternalServerError, "error al guardar RIPS")
		return
	}

	responderJSON(w, http.StatusCreated, models.RipsGeneradoResponse{
		ID:              ripsID,
		DatosJSON:       rips,
		Estado:          "pendiente",
		CreadoPor:       u.Nombre,
		FechaGeneracion: fechaGen,
	})
}

