package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmiddleware "hce/api/middleware"
	"hce/api/models"
)

// extraColumnasPaciente appends CASE WHEN labels after the main column list.
// Must be preceded by a comma (last column before it should end without one).
const subqUltimaAtencion = `,
	(SELECT MAX(ec.fecha_atencion) FROM encuentro_clinico ec
	 WHERE ec.paciente_documento = numero_documento
	   AND ec.estado = 'finalizado'
	   AND ec.es_ultima_version = TRUE) AS ultima_atencion`

const nullUltimaAtencion = `,
	NULL::timestamptz AS ultima_atencion`

const extraColumnasPaciente = `,
	CASE genero WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Femenino' WHEN 'X' THEN 'Otro / Intersexual' ELSE genero END AS genero_nombre,
	CASE estado_civil WHEN '01' THEN 'Soltero/a' WHEN '02' THEN 'Casado/a' WHEN '03' THEN 'Unión libre' WHEN '04' THEN 'Separado/a' WHEN '05' THEN 'Divorciado/a' WHEN '06' THEN 'Viudo/a' ELSE estado_civil END AS estado_civil_nombre,
	CASE tipo_usuario WHEN '01' THEN 'Contributivo' WHEN '02' THEN 'Subsidiado' WHEN '03' THEN 'Vinculado' WHEN '04' THEN 'Particular' WHEN '05' THEN 'Indígena' WHEN '06' THEN 'No asegurado' ELSE tipo_usuario END AS tipo_usuario_nombre,
	CASE zona_residencia WHEN 'U' THEN 'Urbana' WHEN 'R' THEN 'Rural' ELSE zona_residencia END AS zona_residencia_nombre,
	CASE codigo_etnia WHEN '00' THEN 'Sin pertenencia étnica' WHEN '01' THEN 'Indígena' WHEN '02' THEN 'ROM (gitano)' WHEN '03' THEN 'Raizal del Archipiélago' WHEN '04' THEN 'Palenquero de San Basilio' WHEN '05' THEN 'Afrocolombiano / afrodescendiente' WHEN '06' THEN 'Otro' ELSE codigo_etnia END AS etnia_nombre,
	CASE codigo_discapacidad WHEN '00' THEN 'Sin discapacidad' WHEN '01' THEN 'Física' WHEN '02' THEN 'Cognitiva' WHEN '03' THEN 'Mental' WHEN '04' THEN 'Visual' WHEN '05' THEN 'Auditiva' WHEN '06' THEN 'Múltiple' ELSE codigo_discapacidad END AS discapacidad_nombre`

type PacienteHandler struct {
	db *pgxpool.Pool
}

func PacientesRouter(db *pgxpool.Pool) http.Handler {
	h := &PacienteHandler{db: db}
	r := chi.NewRouter()

	r.Get("/", h.listar)
	r.Post("/", h.crear)
	r.Route("/{documento}", func(r chi.Router) {
		r.Get("/", h.obtener)
		r.Put("/", h.actualizar)
		r.Delete("/", h.eliminar)
		r.Mount("/encuentros", EncuentrosRouter(db))
		r.Mount("/antecedentes", AntecedentesRouter(db))
	})

	return r
}

// queryRower es satisfecho tanto por *pgxpool.Pool como por pgx.Tx,
// lo que permite reutilizar insertarPaciente dentro y fuera de transacciones.
type queryRower interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// GET /pacientes?q=texto  (legacy — búsqueda/autocompletado, retorna array)
// GET /pacientes?page=1&limit=25&orden=nombre&dir=asc&q=&tipo_usuario=  (paginado, retorna {pacientes, total})
func (h *PacienteHandler) listar(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("page") != "" {
		h.listarPaginado(w, r)
		return
	}
	q := strings.TrimSpace(r.URL.Query().Get("q"))

	base := `
		SELECT id, numero_version, es_ultima_version, esta_activo,
		       tipo_documento, numero_documento, nombre_primero, nombre_segundo,
		       apellido_primero, apellido_segundo, fecha_nacimiento, genero,
		       estado_civil, ocupacion, direccion,
		       nombre_responsable, telefono_responsable, parentesco_responsable,
		       codigo_pais_origen, codigo_municipio_residencia, zona_residencia,
		       tipo_usuario, codigo_etnia, codigo_discapacidad, codigo_eps,
		       telefono, correo_electronico, politica_datos_aceptada,
		       fecha_creacion, creado_por,
		       EXTRACT(YEAR FROM AGE(NOW(), fecha_nacimiento))::int AS edad` +
		extraColumnasPaciente + nullUltimaAtencion + `
		FROM paciente
		WHERE es_ultima_version = TRUE AND esta_activo = TRUE`

	var (
		rows pgx.Rows
		err  error
	)

	if q == "" {
		rows, err = h.db.Query(r.Context(), base+
			` ORDER BY fecha_creacion DESC LIMIT 100`)
	} else {
		like := "%" + strings.ToLower(q) + "%"
		rows, err = h.db.Query(r.Context(), base+`
			AND (
				numero_documento ILIKE $1 OR
				LOWER(nombre_primero)   LIKE $1 OR
				LOWER(nombre_segundo)   LIKE $1 OR
				LOWER(apellido_primero) LIKE $1 OR
				LOWER(apellido_segundo) LIKE $1 OR
				telefono                LIKE $1 OR
				LOWER(correo_electronico) LIKE $1 OR
				LOWER(nombre_primero || ' ' || apellido_primero) LIKE $1 OR
				LOWER(nombre_primero || ' ' || COALESCE(nombre_segundo,'') || ' ' || apellido_primero) LIKE $1 OR
				LOWER(apellido_primero || ' ' || nombre_primero) LIKE $1 OR
				LOWER(apellido_primero || ' ' || apellido_segundo) LIKE $1
			)
			ORDER BY apellido_primero, nombre_primero
			LIMIT 50`, like)
	}
	if err != nil {
		log.Printf("listar pacientes: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar pacientes")
		return
	}
	defer rows.Close()

	pacientes := make([]models.Paciente, 0)
	for rows.Next() {
		p, err := escanearPaciente(rows)
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer paciente")
			return
		}
		pacientes = append(pacientes, p)
	}
	if rows.Err() != nil {
		responderError(w, http.StatusInternalServerError, "error al iterar pacientes")
		return
	}

	responderJSON(w, http.StatusOK, pacientes)
}

// GET /pacientes/{documento}
func (h *PacienteHandler) obtener(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")

	row := h.db.QueryRow(r.Context(), `
		SELECT id, numero_version, es_ultima_version, esta_activo,
		       tipo_documento, numero_documento, nombre_primero, nombre_segundo,
		       apellido_primero, apellido_segundo, fecha_nacimiento, genero,
		       estado_civil, ocupacion, direccion,
		       nombre_responsable, telefono_responsable, parentesco_responsable,
		       codigo_pais_origen, codigo_municipio_residencia, zona_residencia,
		       tipo_usuario, codigo_etnia, codigo_discapacidad, codigo_eps,
		       telefono, correo_electronico, politica_datos_aceptada,
		       fecha_creacion, creado_por,
		       EXTRACT(YEAR FROM AGE(NOW(), fecha_nacimiento))::int AS edad`+
		extraColumnasPaciente+subqUltimaAtencion+`
		FROM paciente
		WHERE numero_documento = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		documento,
	)

	p, err := escanearPaciente(row)
	if err != nil {
		responderError(w, http.StatusNotFound, "paciente no encontrado")
		return
	}

	responderJSON(w, http.StatusOK, p)
}

// POST /pacientes
func (h *PacienteHandler) crear(w http.ResponseWriter, r *http.Request) {
	var input models.PacienteInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}

	if input.NumeroDocumento == "" || input.NombrePrimero == "" || input.ApellidoPrimero == "" {
		responderError(w, http.StatusBadRequest, "numero_documento, nombre_primero y apellido_primero son obligatorios")
		return
	}

	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	p, err := insertarPaciente(r.Context(), h.db, input, 1, u.Nombre)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			responderError(w, http.StatusConflict, "ya existe un paciente con ese documento")
			return
		}
		log.Printf("crear paciente: %v", err)
		responderError(w, http.StatusInternalServerError, "error al crear paciente")
		return
	}

	responderJSON(w, http.StatusCreated, p)
}

// PUT /pacientes/{documento}
// Crea una nueva versión (SCD2) sin sobreescribir la anterior.
func (h *PacienteHandler) actualizar(w http.ResponseWriter, r *http.Request) {
	documento := chi.URLParam(r, "documento")

	var input models.PacienteInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responderError(w, http.StatusBadRequest, "body inválido")
		return
	}

	var versionActual int
	err := h.db.QueryRow(r.Context(),
		`SELECT numero_version FROM paciente WHERE numero_documento = $1 AND es_ultima_version = TRUE AND esta_activo = TRUE`,
		documento,
	).Scan(&versionActual)
	if err != nil {
		responderError(w, http.StatusNotFound, "paciente no encontrado")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al iniciar transacción")
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(),
		`UPDATE paciente SET es_ultima_version = FALSE WHERE numero_documento = $1 AND es_ultima_version = TRUE`,
		documento,
	)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al versionar paciente")
		return
	}

	input.NumeroDocumento = documento
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	p, err := insertarPaciente(r.Context(), tx, input, versionActual+1, u.Nombre)
	if err != nil {
		responderError(w, http.StatusInternalServerError, "error al guardar nueva versión")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		responderError(w, http.StatusInternalServerError, "error al confirmar transacción")
		return
	}

	responderJSON(w, http.StatusOK, p)
}

// DELETE /pacientes/{documento} — elimina todas las versiones del paciente
func (h *PacienteHandler) eliminar(w http.ResponseWriter, r *http.Request) {
	u := appmiddleware.UsuarioDesdeContexto(r.Context())
	if u.Rol != "admin" {
		responderError(w, http.StatusForbidden, "solo el administrador puede eliminar pacientes")
		return
	}
	documento := chi.URLParam(r, "documento")
	tag, err := h.db.Exec(r.Context(),
		`DELETE FROM paciente WHERE numero_documento=$1`, documento)
	if err != nil {
		log.Printf("eliminar paciente: %v", err)
		responderError(w, http.StatusInternalServerError, "error al eliminar paciente")
		return
	}
	if tag.RowsAffected() == 0 {
		responderError(w, http.StatusNotFound, "paciente no encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *PacienteHandler) listarPaginado(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	tipoUsuario := strings.TrimSpace(r.URL.Query().Get("tipo_usuario"))
	genero := strings.TrimSpace(r.URL.Query().Get("genero"))
	zonaResidencia := strings.TrimSpace(r.URL.Query().Get("zona_residencia"))
	eps := strings.TrimSpace(r.URL.Query().Get("eps"))
	telefono := strings.TrimSpace(r.URL.Query().Get("telefono"))
	minAtencion := strings.TrimSpace(r.URL.Query().Get("min_atencion"))
	maxAtencion := strings.TrimSpace(r.URL.Query().Get("max_atencion"))

	exportar := r.URL.Query().Get("export") == "1"

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit

	orden := r.URL.Query().Get("orden")
	dir := r.URL.Query().Get("dir")
	if dir != "asc" && dir != "desc" {
		dir = "asc"
	}
	DIR := strings.ToUpper(dir)

	var ordenSQL string
	switch orden {
	case "nombre":
		ordenSQL = "apellido_primero " + DIR + ", nombre_primero " + DIR
	case "documento":
		ordenSQL = "numero_documento " + DIR
	case "edad":
		edadDir := "DESC"
		if dir == "desc" {
			edadDir = "ASC"
		}
		ordenSQL = "fecha_nacimiento " + edadDir
	case "tipoUsuario":
		ordenSQL = "tipo_usuario " + DIR
	case "ultima_atencion":
		nullsDir := "NULLS LAST"
		if dir == "desc" {
			nullsDir = "NULLS FIRST"
		}
		ordenSQL = "(SELECT MAX(ec.fecha_atencion) FROM encuentro_clinico ec WHERE ec.paciente_documento = numero_documento AND ec.estado = 'finalizado' AND ec.es_ultima_version = TRUE) " + DIR + " " + nullsDir
	case "fecha":
		ordenSQL = "fecha_creacion " + DIR
	default:
		ordenSQL = "apellido_primero ASC, nombre_primero ASC"
	}

	where := "WHERE es_ultima_version = TRUE AND esta_activo = TRUE"
	args := []any{}
	idx := 1

	if q != "" {
		like := "%" + strings.ToLower(q) + "%"
		where += fmt.Sprintf(` AND (
			numero_documento ILIKE $%[1]d OR
			LOWER(nombre_primero) LIKE $%[1]d OR
			LOWER(nombre_segundo) LIKE $%[1]d OR
			LOWER(apellido_primero) LIKE $%[1]d OR
			LOWER(apellido_segundo) LIKE $%[1]d OR
			telefono LIKE $%[1]d OR
			LOWER(correo_electronico) LIKE $%[1]d OR
			LOWER(nombre_primero || ' ' || apellido_primero) LIKE $%[1]d OR
			LOWER(apellido_primero || ' ' || nombre_primero) LIKE $%[1]d
		)`, idx)
		args = append(args, like)
		idx++
	}
	if tipoUsuario != "" {
		where += fmt.Sprintf(` AND tipo_usuario = $%d`, idx)
		args = append(args, tipoUsuario)
		idx++
	}
	if genero != "" {
		where += fmt.Sprintf(` AND genero = $%d`, idx)
		args = append(args, genero)
		idx++
	}
	if zonaResidencia != "" {
		where += fmt.Sprintf(` AND zona_residencia = $%d`, idx)
		args = append(args, zonaResidencia)
		idx++
	}
	if eps != "" {
		where += fmt.Sprintf(` AND codigo_eps ILIKE $%d`, idx)
		args = append(args, "%"+eps+"%")
		idx++
	}
	if telefono != "" {
		where += fmt.Sprintf(` AND telefono ILIKE $%d`, idx)
		args = append(args, "%"+telefono+"%")
		idx++
	}
	const subqFechaAtencion = `(SELECT MAX(ec.fecha_atencion) FROM encuentro_clinico ec WHERE ec.paciente_documento = numero_documento AND ec.estado = 'finalizado' AND ec.es_ultima_version = TRUE)::date`
	if minAtencion != "" {
		where += fmt.Sprintf(` AND `+subqFechaAtencion+` >= $%d::date`, idx)
		args = append(args, minAtencion)
		idx++
	}
	if maxAtencion != "" {
		where += fmt.Sprintf(` AND `+subqFechaAtencion+` <= $%d::date`, idx)
		args = append(args, maxAtencion)
		idx++
	}

	var total int
	if err := h.db.QueryRow(r.Context(), "SELECT COUNT(*) FROM paciente "+where, args...).Scan(&total); err != nil {
		log.Printf("listarPaginado count: %v", err)
		responderError(w, http.StatusInternalServerError, "error al contar pacientes")
		return
	}

	baseSQL := `
		SELECT id, numero_version, es_ultima_version, esta_activo,
		       tipo_documento, numero_documento, nombre_primero, nombre_segundo,
		       apellido_primero, apellido_segundo, fecha_nacimiento, genero,
		       estado_civil, ocupacion, direccion,
		       nombre_responsable, telefono_responsable, parentesco_responsable,
		       codigo_pais_origen, codigo_municipio_residencia, zona_residencia,
		       tipo_usuario, codigo_etnia, codigo_discapacidad, codigo_eps,
		       telefono, correo_electronico, politica_datos_aceptada,
		       fecha_creacion, creado_por,
		       EXTRACT(YEAR FROM AGE(NOW(), fecha_nacimiento))::int AS edad` +
		extraColumnasPaciente + subqUltimaAtencion + `
		FROM paciente ` + where +
		` ORDER BY ` + ordenSQL

	var dataSQL string
	var queryArgs []any
	if exportar {
		dataSQL = baseSQL
		queryArgs = args
	} else {
		dataSQL = baseSQL + fmt.Sprintf(` LIMIT $%d OFFSET $%d`, idx, idx+1)
		queryArgs = append(args, limit, offset)
	}

	rows, err := h.db.Query(r.Context(), dataSQL, queryArgs...)
	if err != nil {
		log.Printf("listarPaginado query: %v", err)
		responderError(w, http.StatusInternalServerError, "error al consultar pacientes")
		return
	}
	defer rows.Close()

	pacientes := make([]models.Paciente, 0)
	for rows.Next() {
		p, err := escanearPaciente(rows)
		if err != nil {
			responderError(w, http.StatusInternalServerError, "error al leer paciente")
			return
		}
		pacientes = append(pacientes, p)
	}
	if rows.Err() != nil {
		responderError(w, http.StatusInternalServerError, "error al iterar pacientes")
		return
	}

	responderJSON(w, http.StatusOK, map[string]any{
		"pacientes": pacientes,
		"total":     total,
	})
}

// ── helpers ──────────────────────────────────────────────────────────────────

// escanearPaciente lee una fila (de Query o QueryRow) en una struct Paciente.
type scanner interface {
	Scan(dest ...any) error
}

func escanearPaciente(row scanner) (models.Paciente, error) {
	var p models.Paciente
	var fechaNac time.Time
	err := row.Scan(
		&p.ID, &p.NumeroVersion, &p.EsUltimaVersion, &p.EstaActivo,
		&p.TipoDocumento, &p.NumeroDocumento, &p.NombrePrimero, &p.NombreSegundo,
		&p.ApellidoPrimero, &p.ApellidoSegundo, &fechaNac, &p.Genero,
		&p.EstadoCivil, &p.Ocupacion, &p.Direccion,
		&p.NombreResponsable, &p.TelefonoResponsable, &p.ParentescoResponsable,
		&p.CodigoPaisOrigen, &p.CodigoMunicipioResidencia, &p.ZonaResidencia,
		&p.TipoUsuario, &p.CodigoEtnia, &p.CodigoDiscapacidad, &p.CodigoEps,
		&p.Telefono, &p.CorreoElectronico, &p.PoliticaDatosAceptada,
		&p.FechaCreacion, &p.CreadoPor, &p.Edad,
		&p.GeneroNombre, &p.EstadoCivilNombre, &p.TipoUsuarioNombre,
		&p.ZonaResidenciaNombre, &p.EtniaNombre, &p.DiscapacidadNombre,
		&p.UltimaAtencion,
	)
	if err != nil {
		return models.Paciente{}, err
	}
	p.FechaNacimiento = fechaNac.Format("2006-01-02")
	return p, nil
}

func insertarPaciente(ctx context.Context, db queryRower, input models.PacienteInput, version int, creadoPor string) (models.Paciente, error) {
	row := db.QueryRow(ctx, `
		INSERT INTO paciente (
			numero_version, es_ultima_version, esta_activo,
			tipo_documento, numero_documento, nombre_primero, nombre_segundo,
			apellido_primero, apellido_segundo, fecha_nacimiento, genero,
			estado_civil, ocupacion, direccion,
			nombre_responsable, telefono_responsable, parentesco_responsable,
			codigo_pais_origen, codigo_municipio_residencia, zona_residencia,
			tipo_usuario, codigo_etnia, codigo_discapacidad, codigo_eps,
			telefono, correo_electronico, politica_datos_aceptada, creado_por
		) VALUES (
			$1, TRUE, TRUE,
			$2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20, $21, $22,
			$23, $24, $25, $26
		)
		RETURNING id, numero_version, es_ultima_version, esta_activo,
		          tipo_documento, numero_documento, nombre_primero, nombre_segundo,
		          apellido_primero, apellido_segundo, fecha_nacimiento, genero,
		          estado_civil, ocupacion, direccion,
		          nombre_responsable, telefono_responsable, parentesco_responsable,
		          codigo_pais_origen, codigo_municipio_residencia, zona_residencia,
		          tipo_usuario, codigo_etnia, codigo_discapacidad, codigo_eps,
		          telefono, correo_electronico, politica_datos_aceptada,
		          fecha_creacion, creado_por,
		          EXTRACT(YEAR FROM AGE(NOW(), fecha_nacimiento))::int AS edad`+
		extraColumnasPaciente+nullUltimaAtencion,
		version,
		input.TipoDocumento, input.NumeroDocumento, input.NombrePrimero, input.NombreSegundo,
		input.ApellidoPrimero, input.ApellidoSegundo, input.FechaNacimiento, input.Genero,
		input.EstadoCivil, input.Ocupacion, input.Direccion,
		input.NombreResponsable, input.TelefonoResponsable, input.ParentescoResponsable,
		input.CodigoPaisOrigen, input.CodigoMunicipioResidencia, input.ZonaResidencia,
		input.TipoUsuario, input.CodigoEtnia, input.CodigoDiscapacidad, input.CodigoEps,
		input.Telefono, input.CorreoElectronico, input.PoliticaDatosAceptada, creadoPor,
	)
	return escanearPaciente(row)
}

func responderJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func responderError(w http.ResponseWriter, status int, mensaje string) {
	responderJSON(w, status, map[string]string{"error": mensaje})
}
