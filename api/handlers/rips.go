package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

type RipsHandler struct {
	db *pgxpool.Pool
}

func RipsRouter(db *pgxpool.Pool) http.Handler {
	h := &RipsHandler{db: db}
	r := chi.NewRouter()
	r.Post("/", h.generar)
	r.Get("/", h.obtener)
	return r
}

// POST /pacientes/{documento}/encuentros/{encuentroId}/facturas/{facturaId}/rips
func (h *RipsHandler) generar(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")
	encuentroID := chi.URLParam(r, "encuentroId")
	facturaID := chi.URLParam(r, "facturaId")

	var input models.RipsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if input.NIT == "" || input.CodPrestador == "" {
		responderError(w, http.StatusBadRequest, "nit y codPrestador son obligatorios")
		return
	}
	if input.TipoDiagnosticoPrincipal == "" {
		input.TipoDiagnosticoPrincipal = "01"
	}

	// 1. Cargar encuentro
	enc, err := escanearEncuentro(h.db.QueryRow(r.Context(),
		`SELECT`+columnasEncuentro+`
		 FROM encuentro_clinico
		 WHERE encuentro_id = $1 AND paciente_documento = $2
		   AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		encuentroID, documento,
	))
	if err != nil {
		responderError(w, http.StatusNotFound, "encuentro no encontrado")
		return
	}

	// 2. Cargar paciente (solo los campos necesarios para RIPS)
	var p models.Paciente
	err = h.db.QueryRow(r.Context(), `
		SELECT tipo_documento, numero_documento, fecha_nacimiento::text, genero,
		       codigo_pais_origen, codigo_municipio_residencia, zona_residencia, tipo_usuario
		FROM paciente
		WHERE numero_documento = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		documento,
	).Scan(
		&p.TipoDocumento, &p.NumeroDocumento, &p.FechaNacimiento, &p.Genero,
		&p.CodigoPaisOrigen, &p.CodigoMunicipioResidencia, &p.ZonaResidencia, &p.TipoUsuario,
	)
	if err != nil {
		log.Printf("rips paciente no encontrado doc=%s: %v", documento, err)
		responderError(w, http.StatusNotFound, "paciente no encontrado")
		return
	}

	// 3. Cargar factura con items
	var facturaRowID string
	var facturaEntityID string
	err = h.db.QueryRow(r.Context(), `
		SELECT id, factura_id FROM factura
		WHERE factura_id = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		facturaID,
	).Scan(&facturaRowID, &facturaEntityID)
	if err != nil {
		responderError(w, http.StatusNotFound, "factura no encontrada")
		return
	}

	items, err := obtenerItems(r.Context(), h.db, facturaRowID)
	if err != nil {
		log.Printf("rips obtener items: %v", err)
		responderError(w, http.StatusInternalServerError, "error al leer items de factura")
		return
	}
	if len(items) == 0 {
		responderError(w, http.StatusBadRequest, "la factura no tiene items")
		return
	}

	// 4. Clasificar items: CUPS 890xxx → consultas, resto → procedimientos
	fechaAtencion := enc.FechaAtencion.Format(time.RFC3339)[:19] // "2006-01-02T15:04:05"
	var consultas []models.RipsConsulta
	var procedimientos []models.RipsProcedimiento
	cntConsulta, cntProc := 0, 0

	for _, item := range items {
		if strings.HasPrefix(item.CodigoCups, "890") {
			cntConsulta++
			consultas = append(consultas, models.RipsConsulta{
				CodPrestador:               input.CodPrestador,
				FechaInicioAtencion:        fechaAtencion,
				NumAutorizacion:            nil,
				CodDiagnosticoPrincipal:    enc.CodigoDiagnosticoPrincipal,
				CodDiagnosticoPrincipalE:   nil,
				CodDiagnosticoRelacionado1: nil,
				CodDiagnosticoRelacionado2: nil,
				CodDiagnosticoRelacionado3: nil,
				TipoDiagnosticoPrincipal:   input.TipoDiagnosticoPrincipal,
				FinalidadTecnologiaSalud:   enc.FinalidadConsulta,
				CausaExternaMotivoAtencion: enc.CausaExterna,
				CodConsulta:                item.CodigoCups,
				VrServicio:                 item.Subtotal,
				ConceptoRecaudo:            "04", // particular
				ValorPagoModerador:         0,
				NumFEVPagoModerador:        nil,
				Consecutivo:                cntConsulta,
			})
		} else {
			cntProc++
			procedimientos = append(procedimientos, models.RipsProcedimiento{
				CodPrestador:              input.CodPrestador,
				FechaInicioAtencion:       fechaAtencion,
				FechaFinAtencion:          fechaAtencion,
				NumAutorizacion:           nil,
				IDMiPRES:                  nil,
				Ambito:                    "02", // ambulatorio
				Finalidad:                 "43", // diagnóstico y tratamiento
				PersonalAtiende:           "01", // médico
				CodDiagnosticoPrincipal:   enc.CodigoDiagnosticoPrincipal,
				CodDiagnosticoRelacionado: nil,
				CodComplicacion:           nil,
				CodProcedimiento:          item.CodigoCups,
				ViaIngreso:                enc.ViaIngreso,
				VrServicio:                item.Subtotal,
				TipoPagoModerador:         "04", // particular
				ValorPagoModerador:        0,
				Consecutivo:               cntProc,
			})
		}
	}

	// 5. Construir JSON RIPS
	rips := models.RipsTransaccion{
		NumDocumentoIdObligado: input.NIT,
		NumFactura:             &facturaEntityID,
		TipoNota:               nil,
		NumNota:                nil,
		Usuarios: []models.RipsUsuario{
			{
				TipoDocumentoIdentificacion:  p.TipoDocumento,
				NumDocumentoIdentificacion:   p.NumeroDocumento,
				TipoUsuario:                  p.TipoUsuario,
				FechaNacimiento:              p.FechaNacimiento,
				CodSexo:                      p.Genero,
				CodPaisResidencia:            p.CodigoPaisOrigen,
				CodMunicipioResidencia:       p.CodigoMunicipioResidencia,
				CodZonaTerritorialResidencia: p.ZonaResidencia,
				Incapacidad:                  "N",
				CodPaisOrigen:                p.CodigoPaisOrigen,
				Consecutivo:                  1,
				Servicios: models.RipsServicios{
					Consultas:      consultas,
					Procedimientos: procedimientos,
				},
			},
		},
	}

	// 6. Almacenar en rips_generado
	datosJSON, err := json.Marshal(rips)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al serializar RIPS")
		return
	}

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	var ripsID, fechaGen string
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO rips_generado (encuentro_id, factura_id, datos_json, estado, creado_por)
		VALUES ($1, $2, $3, 'pendiente', $4)
		RETURNING id, fecha_generacion::text`,
		enc.EncuentroID, facturaRowID, string(datosJSON), u.Nombre,
	).Scan(&ripsID, &fechaGen)
	if err != nil {
		log.Printf("insertar rips_generado: %v", err)
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

// GET /pacientes/{documento}/encuentros/{encuentroId}/facturas/{facturaId}/rips
func (h *RipsHandler) obtener(w http.ResponseWriter, r *http.Request) {
	facturaID := chi.URLParam(r, "facturaId")

	var ripsID, estado, creadoPor, fechaGen string
	var datosJSON []byte
	err := h.db.QueryRow(r.Context(), `
		SELECT rg.id, rg.datos_json, rg.estado, rg.creado_por, rg.fecha_generacion::text
		FROM rips_generado rg
		JOIN factura f ON f.id = rg.factura_id
		WHERE f.factura_id = $1
		ORDER BY rg.fecha_generacion DESC
		LIMIT 1`,
		facturaID,
	).Scan(&ripsID, &datosJSON, &estado, &creadoPor, &fechaGen)
	if err != nil {
		responderError(w, http.StatusNotFound, "no hay RIPS generado para esta factura")
		return
	}

	var rips models.RipsTransaccion
	if err := json.Unmarshal(datosJSON, &rips); err != nil {
		responderError(w, http.StatusInternalServerError, "error al leer RIPS almacenado")
		return
	}

	responderJSON(w, http.StatusOK, models.RipsGeneradoResponse{
		ID:              ripsID,
		DatosJSON:       rips,
		Estado:          estado,
		CreadoPor:       creadoPor,
		FechaGeneracion: fechaGen,
	})
}
