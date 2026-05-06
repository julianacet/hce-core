-- ============================================================
-- HCE Consultorio — Esquema de base de datos
-- PostgreSQL 15
-- ============================================================

-- ============================================================
-- 1. Extensiones
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. Tabla de referencia: códigos CUPS
-- (Res. 2706/2025 — vigente desde 1 de enero de 2026)
-- Cargar el catálogo completo desde la fuente oficial del MinSalud.
-- ============================================================

CREATE TABLE cups_codigo (
    codigo      VARCHAR(6) PRIMARY KEY,
    descripcion TEXT       NOT NULL,
    esta_activo BOOLEAN    NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 3. Usuarios del sistema
-- ============================================================

CREATE TABLE usuario (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_usuario  TEXT        UNIQUE NOT NULL,
    nombre_completo TEXT        NOT NULL,
    rol             VARCHAR(20) NOT NULL DEFAULT 'medico'
                                CHECK (rol IN ('admin', 'medico', 'auxiliar')),
    hash_contrasena TEXT        NOT NULL,
    esta_activo     BOOLEAN     NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. Paciente  (SCD2 — cada actualización genera nueva versión)
-- ============================================================

CREATE TABLE paciente (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_version    INTEGER     NOT NULL DEFAULT 1,
    es_ultima_version BOOLEAN     NOT NULL DEFAULT TRUE,
    esta_activo       BOOLEAN     NOT NULL DEFAULT TRUE,
    tipo_documento    VARCHAR(2)  NOT NULL,  -- CC, TI, CE, PA, RC, MS, AS…
    numero_documento  VARCHAR(20) NOT NULL,
    nombre_primero    TEXT        NOT NULL,
    nombre_segundo    TEXT,
    apellido_primero  TEXT        NOT NULL,
    apellido_segundo  TEXT,
    fecha_nacimiento  DATE        NOT NULL,
    genero            CHAR(1)     NOT NULL CHECK (genero IN ('M', 'F', 'X')),

    -- Datos personales obligatorios (Res. 1995/1999)
    estado_civil  VARCHAR(2),   -- 01 soltero, 02 casado, 03 unión libre…
    ocupacion     TEXT,
    direccion     TEXT,

    -- Responsable / acompañante
    nombre_responsable     TEXT,
    telefono_responsable   VARCHAR(20),
    parentesco_responsable TEXT,

    -- Georreferenciación y tipo de usuario (RIPS)
    codigo_pais_origen          CHAR(3)    NOT NULL DEFAULT '170',
    codigo_municipio_residencia CHAR(5)    NOT NULL,
    zona_residencia             CHAR(1)    NOT NULL CHECK (zona_residencia IN ('U', 'R')),
    tipo_usuario                VARCHAR(2) NOT NULL,  -- 01 contributivo, 02 subsidiado…
    codigo_etnia                VARCHAR(2) NOT NULL DEFAULT '06',
    codigo_discapacidad         VARCHAR(2) NOT NULL DEFAULT '06',
    codigo_eps                  VARCHAR(10),

    -- Contacto
    telefono           VARCHAR(20),
    correo_electronico TEXT,

    -- Consentimiento
    politica_datos_aceptada BOOLEAN NOT NULL DEFAULT FALSE,

    -- Auditoría interna de la fila
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por     TEXT        NOT NULL
);

-- Un documento solo puede tener una versión activa vigente a la vez
CREATE UNIQUE INDEX idx_paciente_documento_activo
    ON paciente(numero_documento)
    WHERE es_ultima_version = TRUE AND esta_activo = TRUE;

-- Historial completo de versiones de un paciente
CREATE INDEX idx_paciente_documento ON paciente(numero_documento);
-- Búsqueda por nombre
CREATE INDEX idx_paciente_nombre ON paciente(apellido_primero, nombre_primero)
    WHERE es_ultima_version = TRUE;

-- ============================================================
-- 5. Encuentro clínico  (SCD2)
-- ============================================================

CREATE TABLE encuentro_clinico (
    -- Versión de la fila
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    encuentro_id      UUID        NOT NULL,  -- hilo conductor entre versiones del mismo encuentro
    numero_version    INTEGER     NOT NULL DEFAULT 1,
    es_ultima_version BOOLEAN     NOT NULL DEFAULT TRUE,
    esta_activo       BOOLEAN     NOT NULL DEFAULT TRUE,
    paciente_documento  VARCHAR(20) NOT NULL,

    encuentro_padre_id  UUID        NULL,

    -- Clasificación RIPS
    fecha_atencion         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    causa_externa          VARCHAR(2)  NOT NULL DEFAULT '13',
    finalidad_consulta     VARCHAR(2)  NOT NULL DEFAULT '10',
    via_ingreso            VARCHAR(2)  NOT NULL DEFAULT '02',

    -- Contenido clínico (Res. 866/2021)
    motivo_consulta TEXT NOT NULL,

    -- Signos vitales y examen físico parametrizables (ver tabla campo_clinico)
    signos_vitales JSONB,
    examen_fisico  JSONB,

    -- Diagnóstico principal (mantenido para compat. RIPS; derivado de encuentro_diagnostico)
    codigo_diagnostico_principal VARCHAR(8),  -- CIE-10
    descripcion_diagnostico      TEXT,
    plan_manejo                  TEXT,

    -- Integridad del documento (Ley 527/1999)
    hash_integridad TEXT,

    -- Auditoría interna de la fila
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por     TEXT        NOT NULL,

    -- Migración de sistema anterior
    id_sistema_anterior VARCHAR(50)
);

CREATE INDEX idx_encuentro_ultima
    ON encuentro_clinico(encuentro_id) WHERE es_ultima_version = TRUE;
CREATE INDEX idx_encuentro_id       ON encuentro_clinico(encuentro_id);
CREATE INDEX idx_encuentro_paciente ON encuentro_clinico(paciente_documento);
CREATE INDEX idx_encuentro_fecha    ON encuentro_clinico(fecha_atencion DESC);

-- ============================================================
-- 6. Fórmula médica  (SCD2)
-- ============================================================

CREATE TABLE formula_medica (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_id        UUID        NOT NULL,
    numero_version    INTEGER     NOT NULL DEFAULT 1,
    es_ultima_version BOOLEAN     NOT NULL DEFAULT TRUE,
    esta_activo       BOOLEAN     NOT NULL DEFAULT TRUE,
    encuentro_id      UUID        NOT NULL,
    tipo              VARCHAR(10) NOT NULL DEFAULT 'no_pos' CHECK (tipo IN ('pos', 'no_pos')),
    observaciones     TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por     TEXT        NOT NULL
);

CREATE INDEX idx_formula_ultima
    ON formula_medica(formula_id) WHERE es_ultima_version = TRUE;
CREATE INDEX idx_formula_encuentro ON formula_medica(encuentro_id);

-- Medicamentos: ligados a la versión exacta de la fórmula (formula_medica.id)
CREATE TABLE formula_medicamento (
    id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_id UUID    NOT NULL REFERENCES formula_medica(id) ON DELETE RESTRICT,

    nombre_medicamento   TEXT    NOT NULL,
    concentracion        TEXT,
    forma_farmaceutica   TEXT,    -- tableta, jarabe, inyectable, crema…
    dosis                TEXT    NOT NULL,
    frecuencia           TEXT    NOT NULL,
    duracion_tratamiento TEXT    NOT NULL,
    cantidad_dispensar   INTEGER,
    indicaciones         TEXT,
    orden                INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_medicamento_formula ON formula_medicamento(formula_id);

-- ============================================================
-- 7. Factura  (SCD2)
-- ============================================================

CREATE TABLE factura (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    factura_id        UUID        NOT NULL,
    numero_version    INTEGER     NOT NULL DEFAULT 1,
    es_ultima_version BOOLEAN     NOT NULL DEFAULT TRUE,
    esta_activo       BOOLEAN     NOT NULL DEFAULT TRUE,

    -- Vínculos
    encuentro_id       UUID        NOT NULL,
    paciente_documento VARCHAR(20) NOT NULL,

    estado        VARCHAR(20) NOT NULL DEFAULT 'borrador'
                  CHECK (estado IN ('borrador', 'emitida', 'pagada', 'anulada')),

    fecha_emision TIMESTAMPTZ,
    subtotal      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total         NUMERIC(15, 2) NOT NULL DEFAULT 0,

    -- Resultados de validación externa
    cuv  TEXT,   -- del MUV (MinSalud), tras validar RIPS
    cufe TEXT,   -- de la DIAN, tras enviar FEV

    -- Auditoría interna de la fila
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por     TEXT        NOT NULL
);

CREATE INDEX idx_factura_ultima
    ON factura(factura_id) WHERE es_ultima_version = TRUE;
CREATE INDEX idx_factura_encuentro ON factura(encuentro_id);
CREATE INDEX idx_factura_paciente  ON factura(paciente_documento);
CREATE INDEX idx_factura_estado    ON factura(estado);

-- Items de la factura: ligados a la versión exacta
CREATE TABLE factura_item (
    id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    factura_id UUID          NOT NULL REFERENCES factura(id) ON DELETE RESTRICT,

    codigo_cups    VARCHAR(6)     NOT NULL REFERENCES cups_codigo(codigo) ON UPDATE CASCADE,
    descripcion    TEXT           NOT NULL,
    valor_unitario NUMERIC(15, 2) NOT NULL,
    cantidad       INTEGER        NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    subtotal       NUMERIC(15, 2) NOT NULL,   -- guardado explícitamente para auditoría
    orden          INTEGER        NOT NULL DEFAULT 1
);

CREATE INDEX idx_factura_item_factura ON factura_item(factura_id);

-- ============================================================
-- 8. RIPS generado  (Res. 2275/2023 — formato JSON)
-- ============================================================

CREATE TABLE rips_generado (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encuentro_id UUID,                           -- nulo en lotes mensuales
    factura_id   UUID REFERENCES factura(id),
    periodo      VARCHAR(7),                     -- "YYYY-MM" para lotes mensuales

    datos_json       JSONB       NOT NULL,
    estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'validado', 'rechazado')),
    cuv              TEXT,
    error_validacion TEXT,

    fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_validacion TIMESTAMPTZ,
    creado_por       TEXT        NOT NULL
);

CREATE INDEX idx_rips_encuentro ON rips_generado(encuentro_id) WHERE encuentro_id IS NOT NULL;
CREATE INDEX idx_rips_periodo   ON rips_generado(periodo)      WHERE periodo IS NOT NULL;

-- ============================================================
-- 9. Consentimientos informados
-- ============================================================

CREATE TABLE plantilla_consentimiento (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre       VARCHAR(100) NOT NULL,
    contenido    TEXT        NOT NULL,  -- soporta {{variables}}
    esta_activo  BOOLEAN     NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por   TEXT        NOT NULL
);

CREATE TABLE consentimiento_generado (
    id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    encuentro_id         UUID        NOT NULL,
    plantilla_id         UUID        REFERENCES plantilla_consentimiento(id),
    paciente_documento   VARCHAR(20) NOT NULL,
    contenido_renderizado TEXT       NOT NULL,  -- texto final con variables sustituidas
    fecha_generacion     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por           TEXT        NOT NULL
);

CREATE INDEX idx_consentimiento_encuentro ON consentimiento_generado(encuentro_id);

INSERT INTO plantilla_consentimiento (nombre, contenido, creado_por) VALUES (
    'Consentimiento informado general',
    'Por medio del presente documento, yo, {{paciente_nombre}}, identificado/a con {{tipo_documento}} N.° {{paciente_documento}}, manifiesto que:

1. He sido informado/a por el Dr. {{medico_nombre}} sobre mi estado de salud, el diagnóstico, el tratamiento propuesto y sus posibles riesgos y beneficios.

2. He tenido la oportunidad de formular las preguntas que he considerado necesarias y todas han sido respondidas satisfactoriamente.

3. Autorizo la realización de los procedimientos diagnósticos y terapéuticos necesarios para mi atención médica en {{consultorio}}.

4. Entiendo que puedo revocar este consentimiento en cualquier momento, siempre y cuando no se hayan iniciado los procedimientos.

5. Autorizo el manejo de mis datos personales con fines exclusivamente médicos, de conformidad con la Ley 1581 de 2012 y el Decreto 1377 de 2013.',
    'sistema'
);

-- ============================================================
-- 10. Encuestas de satisfacción
-- ============================================================

CREATE TABLE encuesta_satisfaccion (
    id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_atencion            DATE        NOT NULL,            -- ingresada manualmente por el personal
    paciente_documento        TEXT,                            -- opcional, para privacidad
    -- Dimensiones 1-5
    facilidad_cita            SMALLINT    NOT NULL CHECK (facilidad_cita BETWEEN 1 AND 5),
    tiempo_espera             SMALLINT    NOT NULL CHECK (tiempo_espera BETWEEN 1 AND 5),
    calidad_atencion          SMALLINT    NOT NULL CHECK (calidad_atencion BETWEEN 1 AND 5),
    comunicacion_medico       SMALLINT    NOT NULL CHECK (comunicacion_medico BETWEEN 1 AND 5),
    claridad_informacion      SMALLINT    NOT NULL CHECK (claridad_informacion BETWEEN 1 AND 5),
    comodidad_instalaciones   SMALLINT    NOT NULL CHECK (comodidad_instalaciones BETWEEN 1 AND 5),
    satisfaccion_general      SMALLINT    NOT NULL CHECK (satisfaccion_general BETWEEN 1 AND 5),
    -- NPS
    recomendaria              BOOLEAN     NOT NULL,
    -- Texto libre
    comentarios               TEXT,
    -- Auditoría (sistema, no manual)
    fecha_registro            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registrado_por            TEXT        NOT NULL
);

CREATE INDEX idx_encuesta_fecha ON encuesta_satisfaccion(fecha_atencion DESC);

-- ============================================================
-- 11. Inventario de insumos
-- ============================================================

CREATE TABLE insumo (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre        TEXT          NOT NULL,
    descripcion   TEXT,
    unidad        TEXT          NOT NULL,  -- unidad, caja, rollo, ml…
    stock_actual  NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock_minimo  NUMERIC(10,2) NOT NULL DEFAULT 0,  -- dispara alerta cuando stock_actual <= stock_minimo
    esta_activo   BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por    TEXT          NOT NULL
);

-- Cada entrada o salida de inventario queda registrada aquí.
-- referencia_tipo + referencia_id permiten vincular la salida a un encuentro
-- o factura en el futuro (descuento automático).
CREATE TABLE insumo_movimiento (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    insumo_id        UUID          NOT NULL REFERENCES insumo(id),
    tipo             VARCHAR(10)   NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
    cantidad         NUMERIC(10,2) NOT NULL,
    stock_resultante NUMERIC(10,2) NOT NULL,  -- snapshot del stock tras el movimiento
    referencia_tipo  VARCHAR(20),  -- 'encuentro', 'factura', 'manual'
    referencia_id    UUID,         -- id del encuentro o factura que causó el movimiento
    notas            TEXT,
    fecha_movimiento TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por       TEXT          NOT NULL
);

CREATE INDEX idx_insumo_movimiento_insumo ON insumo_movimiento(insumo_id);
CREATE INDEX idx_insumo_movimiento_fecha  ON insumo_movimiento(fecha_movimiento DESC);

-- ============================================================
-- 12. Directorio de proveedores
-- ============================================================

CREATE TABLE proveedor (
    id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    razon_social          TEXT        NOT NULL,
    nit                   VARCHAR(20),
    tipo                  VARCHAR(40) NOT NULL
        CHECK (tipo IN (
            'insumos_medicos', 'medicamentos', 'equipos_medicos',
            'laboratorio', 'mantenimiento', 'servicios_generales', 'otro'
        )),
    contacto_nombre       TEXT,
    contacto_cargo        TEXT,
    telefono              VARCHAR(20),
    telefono_alt          VARCHAR(20),
    correo                TEXT,
    direccion             TEXT,
    ciudad                TEXT,
    sitio_web             TEXT,
    descripcion_servicios TEXT,
    condiciones_pago      TEXT,
    notas                 TEXT,
    esta_activo           BOOLEAN     NOT NULL DEFAULT TRUE,
    fecha_creacion        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por            TEXT        NOT NULL
);

CREATE INDEX idx_proveedor_razon ON proveedor(razon_social);
CREATE INDEX idx_proveedor_tipo  ON proveedor(tipo);

-- ============================================================
-- 13. Eventos adversos (PAMEC / Res. 2003/2014)
-- ============================================================

CREATE TABLE tipo_evento_adverso (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre       VARCHAR(120) NOT NULL,
    descripcion  TEXT,
    requiere_reporte_invima BOOLEAN NOT NULL DEFAULT FALSE,
    esta_activo  BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por   TEXT         NOT NULL
);

CREATE SEQUENCE evento_adverso_numero_seq START 1;

CREATE TABLE evento_adverso (
    id      UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero  BIGINT  NOT NULL DEFAULT nextval('evento_adverso_numero_seq'),
    tipo_id UUID    REFERENCES tipo_evento_adverso(id),
    fecha_evento TIMESTAMPTZ NOT NULL,
    paciente_documento TEXT,
    diagnostico_activo TEXT,
    clasificacion  VARCHAR(30) NOT NULL
        CHECK (clasificacion IN ('incidente', 'adverso_prevenible', 'adverso_no_prevenible', 'centinela')),
    categoria_danio VARCHAR(20) NOT NULL
        CHECK (categoria_danio IN ('sin_danio', 'leve', 'moderado', 'grave', 'muerte')),
    se_informo_paciente BOOLEAN,
    descripcion        TEXT NOT NULL,
    como_se_detecto    TEXT,
    factores_contribuyentes JSONB,
    acciones_inmediatas     TEXT,
    requiere_causa_raiz     BOOLEAN NOT NULL DEFAULT FALSE,
    analisis_causa_raiz     TEXT,
    acciones_mejora         TEXT,
    responsable_seguimiento TEXT,
    fecha_limite_mejora     DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'abierto'
        CHECK (estado IN ('abierto', 'en_seguimiento', 'cerrado')),
    fecha_cierre  TIMESTAMPTZ,
    cerrado_por   TEXT,
    creado_por     TEXT        NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ea_fecha   ON evento_adverso(fecha_evento DESC);
CREATE INDEX idx_ea_estado  ON evento_adverso(estado);
CREATE INDEX idx_ea_tipo    ON evento_adverso(tipo_id);

INSERT INTO tipo_evento_adverso (nombre, descripcion, requiere_reporte_invima, creado_por) VALUES
    ('Medicación',
     'Errores en prescripción, dispensación o administración de medicamentos.',
     FALSE, 'sistema'),
    ('Procedimiento clínico',
     'Complicaciones o errores durante un procedimiento diagnóstico o terapéutico.',
     FALSE, 'sistema'),
    ('Caída del paciente',
     'Caída accidental del paciente dentro del consultorio.',
     FALSE, 'sistema'),
    ('Identificación errónea del paciente',
     'Confusión en la identidad del paciente, sus muestras o resultados.',
     FALSE, 'sistema'),
    ('Infección asociada a la atención',
     'Infección adquirida durante o como consecuencia de la atención prestada.',
     FALSE, 'sistema'),
    ('Error diagnóstico',
     'Diagnóstico incorrecto, omitido o tardío que causó o pudo causar daño.',
     FALSE, 'sistema'),
    ('Comunicación o información',
     'Falla en la transmisión de información clínica entre el equipo o con el paciente.',
     FALSE, 'sistema'),
    ('Equipos o dispositivos médicos',
     'Falla o uso inadecuado de un equipo o dispositivo médico.',
     TRUE, 'sistema'),
    ('Reacción adversa a medicamento (RAM)',
     'Reacción inesperada a un medicamento en dosis normales. Reporte obligatorio a INVIMA.',
     TRUE, 'sistema'),
    ('Accidente con material cortopunzante',
     'Pinchazo, corte u otro accidente con material potencialmente biocontaminado.',
     FALSE, 'sistema'),
    ('Otro',
     'Evento que no corresponde a las categorías anteriores.',
     FALSE, 'sistema');

-- ============================================================
-- 10. Log de auditoría
-- ============================================================

CREATE TABLE log_auditoria (
    id               BIGSERIAL   PRIMARY KEY,
    nombre_tabla     TEXT        NOT NULL,
    registro_id      UUID        NOT NULL,
    accion           TEXT        NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    datos_anteriores JSONB,
    datos_nuevos     JSONB,
    usuario_id       TEXT,
    fecha_cambio     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_log_tabla_registro ON log_auditoria(nombre_tabla, registro_id);
CREATE INDEX idx_log_fecha          ON log_auditoria(fecha_cambio DESC);

-- ============================================================
-- 11. Función y triggers de auditoría
-- ============================================================

CREATE OR REPLACE FUNCTION fn_auditar_cambios()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO log_auditoria(nombre_tabla, registro_id, accion, datos_anteriores)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO log_auditoria(nombre_tabla, registro_id, accion, datos_anteriores, datos_nuevos)
        VALUES (TG_TABLE_NAME, OLD.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO log_auditoria(nombre_tabla, registro_id, accion, datos_nuevos)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_paciente
AFTER INSERT OR UPDATE OR DELETE ON paciente
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

CREATE TRIGGER trg_auditoria_encuentro
AFTER INSERT OR UPDATE OR DELETE ON encuentro_clinico
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

CREATE TRIGGER trg_auditoria_formula
AFTER INSERT OR UPDATE OR DELETE ON formula_medica
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

CREATE TRIGGER trg_auditoria_factura
AFTER INSERT OR UPDATE OR DELETE ON factura
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

-- ============================================================
-- 12. Seeds
-- ============================================================

-- Usuario administrador por defecto.
-- El hash debe reemplazarse al configurar el sistema por primera vez
-- (bcrypt del password real, generado por el backend).

INSERT INTO usuario (nombre_usuario, nombre_completo, rol, hash_contrasena) VALUES
    ('admin', 'Administrador', 'admin', '$2a$12$ItytOuCJ/XQQvxe/9Cvxo.GQ8cs6h16JxJzb6S7PguCUAovZ/p29G');

-- Códigos CUPS frecuentes en consulta externa (muestra — cargar catálogo completo).
-- Fuente oficial: https://www.minsalud.gov.co (Res. 2706/2025)
INSERT INTO cups_codigo (codigo, descripcion) VALUES
    ('890101', 'Consulta de primera vez por medicina general'),
    ('890201', 'Consulta de control o de seguimiento por medicina general'),
    ('890301', 'Consulta de urgencias, triage y clasificación por medicina general'),
    ('890401', 'Consulta integral de medicina general'),
    ('893801', 'Teleconsulta de primera vez por medicina general'),
    ('893901', 'Teleconsulta de control o seguimiento por medicina general'),
    ('271501', 'Toma de muestras de sangre venosa'),
    ('901501', 'Electrocardiograma de 12 derivaciones e interpretación');

-- ============================================================
-- 14. Agenda de citas
-- ============================================================

CREATE TABLE IF NOT EXISTS cita (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha               DATE         NOT NULL,
  hora_inicio         TIME         NOT NULL,
  duracion_minutos    INT          NOT NULL DEFAULT 30,
  paciente_documento  VARCHAR(20),
  paciente_nombre     VARCHAR(200) NOT NULL,
  paciente_telefono   VARCHAR(20),
  motivo              VARCHAR(300),
  estado              VARCHAR(20)  NOT NULL DEFAULT 'programada'
                      CHECK (estado IN ('programada','confirmada','cancelada','no_asistio','completada')),
  notas               TEXT,
  creado_por          VARCHAR(100) NOT NULL,
  fecha_creacion      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cita_fecha ON cita(fecha);
CREATE INDEX IF NOT EXISTS idx_cita_paciente_doc ON cita(paciente_documento) WHERE paciente_documento IS NOT NULL;

-- ============================================================
-- 15. Configuración del sistema (tema + datos del médico)
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id                  INT          PRIMARY KEY DEFAULT 1,
  tema                JSONB        NOT NULL DEFAULT '{}',
  medico              JSONB        NOT NULL DEFAULT '{}',
  actualizado_por     VARCHAR(100),
  fecha_actualizacion TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT solo_una_fila CHECK (id = 1)
);

INSERT INTO configuracion_sistema (id, tema, medico)
VALUES (1, '{}', '{}')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 16. DIVIPOLA — División Político-Administrativa de Colombia
-- ============================================================

CREATE TABLE IF NOT EXISTS departamento (
  codigo  CHAR(2)       PRIMARY KEY,
  nombre  VARCHAR(100)  NOT NULL
);

CREATE TABLE IF NOT EXISTS municipio (
  codigo        CHAR(5)       PRIMARY KEY,
  nombre        VARCHAR(100)  NOT NULL,
  departamento  CHAR(2)       NOT NULL REFERENCES departamento(codigo)
);

CREATE INDEX IF NOT EXISTS idx_municipio_departamento ON municipio(departamento);

-- ============================================================
-- 17. CNO — Clasificación Nacional de Ocupaciones
-- ============================================================

CREATE TABLE IF NOT EXISTS ocupacion (
  codigo  VARCHAR(10)   PRIMARY KEY,
  nombre  VARCHAR(300)  NOT NULL
);

-- ============================================================
-- 18. EPS — Entidades del Sistema General de Seguridad Social
-- ============================================================

CREATE TABLE IF NOT EXISTS regimen_salud (
  codigo  VARCHAR(10)   PRIMARY KEY,
  nombre  VARCHAR(100)  NOT NULL
);

CREATE TABLE IF NOT EXISTS eps (
  id       SERIAL        PRIMARY KEY,
  codigo   VARCHAR(20)   NOT NULL,
  nombre   VARCHAR(400)  NOT NULL,
  regimen  VARCHAR(10)   NOT NULL REFERENCES regimen_salud(codigo),
  UNIQUE (codigo, regimen)
);

CREATE INDEX IF NOT EXISTS idx_eps_regimen ON eps(regimen);
CREATE INDEX IF NOT EXISTS idx_eps_codigo  ON eps(codigo);

-- ============================================================
-- 19. Antecedentes del paciente — preguntas parametrizables
-- ============================================================

CREATE TABLE IF NOT EXISTS antecedente_pregunta (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria           VARCHAR(20) NOT NULL
                        CHECK (categoria IN ('personal','familiar','farmacologico','alergico','quirurgico','habito','gineco')),
    texto               TEXT        NOT NULL,
    tipo_respuesta      VARCHAR(20) NOT NULL
                        CHECK (tipo_respuesta IN ('booleano','texto','numero','fecha','opciones','lista')),
    opciones            JSONB,
    tiene_detalle       BOOLEAN     NOT NULL DEFAULT FALSE,
    placeholder_detalle TEXT,
    solo_genero         VARCHAR(5),
    orden               INTEGER     NOT NULL DEFAULT 0,
    esta_activo         BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS antecedente_respuesta (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_documento TEXT        NOT NULL,
    pregunta_id      UUID        NOT NULL REFERENCES antecedente_pregunta(id) ON DELETE CASCADE,
    valor            TEXT        NOT NULL,
    detalle          TEXT,
    actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (numero_documento, pregunta_id)
);

-- ── Semilla: preguntas iniciales ───────────────────────────────────────────────

INSERT INTO antecedente_pregunta (categoria, texto, tipo_respuesta, opciones, tiene_detalle, placeholder_detalle, solo_genero, orden) VALUES
-- Personales patológicos
('personal','¿Tiene hipertensión arterial?','booleano',NULL,TRUE,'Desde cuándo, si está medicado',NULL,1),
('personal','¿Tiene diabetes mellitus?','booleano',NULL,TRUE,'Tipo (1 o 2), desde cuándo',NULL,2),
('personal','¿Tiene hipotiroidismo o hipertiroidismo?','booleano',NULL,TRUE,'Cuál',NULL,3),
('personal','¿Tiene asma?','booleano',NULL,FALSE,NULL,NULL,4),
('personal','¿Tiene EPOC u otra enfermedad pulmonar crónica?','booleano',NULL,FALSE,NULL,NULL,5),
('personal','¿Ha tenido infarto de miocardio?','booleano',NULL,TRUE,'Cuándo',NULL,6),
('personal','¿Ha tenido derrame cerebral (ACV)?','booleano',NULL,TRUE,'Cuándo',NULL,7),
('personal','¿Tiene insuficiencia cardíaca?','booleano',NULL,FALSE,NULL,NULL,8),
('personal','¿Tiene enfermedad renal crónica?','booleano',NULL,TRUE,'¿Está en diálisis?',NULL,9),
('personal','¿Tiene artritis, lupus u otra enfermedad autoinmune?','booleano',NULL,TRUE,'Cuál',NULL,10),
('personal','¿Ha tenido cáncer?','booleano',NULL,TRUE,'Cuál, cuándo',NULL,11),
('personal','¿Tiene epilepsia o convulsiones?','booleano',NULL,FALSE,NULL,NULL,12),
('personal','¿Tiene VIH/SIDA?','booleano',NULL,FALSE,NULL,NULL,13),
('personal','¿Ha sido hospitalizado anteriormente?','booleano',NULL,TRUE,'Cuándo, por qué',NULL,14),
('personal','Otra enfermedad crónica o relevante','texto',NULL,FALSE,NULL,NULL,15),

-- Familiares
('familiar','¿Algún familiar directo tiene o tuvo diabetes?','booleano',NULL,TRUE,'Quién',NULL,1),
('familiar','¿Algún familiar directo tiene o tuvo hipertensión?','booleano',NULL,TRUE,'Quién',NULL,2),
('familiar','¿Hay antecedentes de infarto o enfermedad cardíaca?','booleano',NULL,TRUE,'Quién, a qué edad',NULL,3),
('familiar','¿Hay antecedentes de cáncer en la familia?','booleano',NULL,TRUE,'Quién, cuál',NULL,4),
('familiar','¿Hay antecedentes de muerte súbita en la familia?','booleano',NULL,TRUE,'Quién, a qué edad',NULL,5),
('familiar','¿Hay enfermedades hereditarias o genéticas en la familia?','booleano',NULL,TRUE,'Cuál',NULL,6),
('familiar','¿Algún familiar tiene enfermedad mental o neurológica?','booleano',NULL,TRUE,'Cuál',NULL,7),

-- Farmacológicos
('farmacologico','Medicamentos actuales con prescripción','lista','[{"campo":"medicamento","label":"Medicamento","requerido":true},{"campo":"dosis","label":"Dosis","requerido":false},{"campo":"frecuencia","label":"Frecuencia","requerido":false}]',FALSE,NULL,NULL,1),
('farmacologico','¿Usa medicamentos de venta libre con frecuencia?','booleano',NULL,TRUE,'Cuáles',NULL,2),
('farmacologico','¿Usa plantas medicinales o remedios naturales?','booleano',NULL,TRUE,'Cuáles',NULL,3),
('farmacologico','¿Usa suplementos, vitaminas u otros?','booleano',NULL,TRUE,'Cuáles',NULL,4),

-- Alérgicos
('alergico','¿Tiene alergia a algún medicamento?','booleano',NULL,TRUE,'Cuál, qué reacción',NULL,1),
('alergico','¿Tiene alergia a algún alimento?','booleano',NULL,TRUE,'Cuál, qué reacción',NULL,2),
('alergico','¿Tiene alergia ambiental (polvo, animales, pólenes)?','booleano',NULL,TRUE,'Cuál',NULL,3),
('alergico','¿Tiene alergia a picaduras de insectos?','booleano',NULL,TRUE,'Qué reacción',NULL,4),
('alergico','¿Tiene alergia al látex o a materiales médicos?','booleano',NULL,TRUE,'Cuál',NULL,5),
('alergico','¿Ha tenido anafilaxia o reacción alérgica grave?','booleano',NULL,TRUE,'A qué',NULL,6),

-- Quirúrgicos
('quirurgico','Cirugías previas','lista','[{"campo":"procedimiento","label":"Procedimiento","requerido":true},{"campo":"anio","label":"Año","requerido":false}]',FALSE,NULL,NULL,1),
('quirurgico','¿Ha tenido complicaciones con anestesia general?','booleano',NULL,TRUE,'Cuáles',NULL,2),
('quirurgico','¿Ha recibido transfusiones de sangre?','booleano',NULL,TRUE,'Cuándo',NULL,3),

-- Hábitos y tóxicos
('habito','Tabaquismo','opciones','["Nunca ha fumado","Fumador activo","Ex-fumador"]',TRUE,'Cigarrillos/día y años; si ex-fumador, hasta cuándo',NULL,1),
('habito','Consumo de alcohol','opciones','["No consume","Ocasional","Regular (fines de semana)","Diario"]',TRUE,'Cantidad aproximada',NULL,2),
('habito','¿Consume sustancias psicoactivas?','booleano',NULL,TRUE,'Cuál, con qué frecuencia',NULL,3),
('habito','Actividad física habitual','opciones','["Sedentario","Actividad leve (caminatas)","Actividad moderada","Deportista regular"]',FALSE,NULL,NULL,4),
('habito','¿Tiene restricción alimentaria o dieta especial?','booleano',NULL,TRUE,'Cuál',NULL,5),
('habito','¿Trabaja expuesto a riesgos (ruido, químicos, polvo)?','booleano',NULL,TRUE,'Cuáles',NULL,6),

-- Gineco-obstétrico (solo para pacientes F o X)
('gineco','Edad de primera menstruación (menarquia)','numero',NULL,FALSE,NULL,'FX',1),
('gineco','Ciclo menstrual','opciones','["Regular","Irregular","Sin ciclo (menopausia o anticonceptivo)"]',FALSE,NULL,'FX',2),
('gineco','¿Está en menopausia?','booleano',NULL,TRUE,'Desde cuándo','FX',3),
('gineco','Gestas (número de embarazos)','numero',NULL,FALSE,NULL,'FX',4),
('gineco','Partos vaginales','numero',NULL,FALSE,NULL,'FX',5),
('gineco','Cesáreas','numero',NULL,FALSE,NULL,'FX',6),
('gineco','Abortos (espontáneos o inducidos)','numero',NULL,FALSE,NULL,'FX',7),
('gineco','Fecha de última menstruación (FUM)','fecha',NULL,FALSE,NULL,'FX',8),
('gineco','¿Usa método de planificación familiar?','booleano',NULL,TRUE,'Cuál','FX',9),
('gineco','¿Cuándo fue su última citología (Papanicolaou)?','fecha',NULL,FALSE,NULL,'FX',10),
('gineco','¿Se realiza autoexamen de seno regularmente?','booleano',NULL,FALSE,NULL,'FX',11),
('gineco','¿Ha tenido algún problema ginecológico?','booleano',NULL,TRUE,'Cuál','FX',12)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 20. Catálogo CIE-10 y diagnósticos por encuentro
-- ============================================================

CREATE TABLE IF NOT EXISTS diagnostico_cie10 (
    codigo  VARCHAR(8)  PRIMARY KEY,
    nombre  TEXT        NOT NULL
);

CREATE TABLE IF NOT EXISTS encuentro_diagnostico (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    encuentro_clinico_id  UUID        NOT NULL REFERENCES encuentro_clinico(id) ON DELETE CASCADE,
    tipo                  VARCHAR(15) NOT NULL CHECK (tipo IN ('principal', 'secundario', 'nota')),
    codigo                VARCHAR(8)  REFERENCES diagnostico_cie10(codigo),
    descripcion           TEXT        NOT NULL,
    orden                 SMALLINT    NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_enc_diag_clinico ON encuentro_diagnostico(encuentro_clinico_id);

INSERT INTO diagnostico_cie10 (codigo, nombre) VALUES
-- Vías respiratorias superiores
('J00',   'Rinofaringitis aguda (resfriado común)'),
('J01.9', 'Sinusitis aguda, no especificada'),
('J02.9', 'Faringitis aguda, no especificada'),
('J03.9', 'Amigdalitis aguda, no especificada'),
('J04.0', 'Laringitis aguda'),
('J06.9', 'Infección aguda de vías respiratorias superiores, no especificada'),
('J30.0', 'Rinitis alérgica vasomotora'),
('J30.4', 'Rinitis alérgica, no especificada'),
('J35.0', 'Amigdalitis crónica'),
('J35.1', 'Hipertrofia de amígdalas'),
-- Vías respiratorias inferiores
('J10',   'Influenza debida a virus de la influenza identificado'),
('J11',   'Influenza, virus no identificado'),
('J18.9', 'Neumonía, no especificada'),
('J20.9', 'Bronquitis aguda, no especificada'),
('J22',   'Infección aguda de las vías respiratorias inferiores, no especificada'),
('J40',   'Bronquitis, no especificada como aguda o crónica'),
('J41.0', 'Bronquitis crónica simple'),
('J45.0', 'Asma predominantemente alérgica'),
('J45.1', 'Asma no alérgica'),
('J45.9', 'Asma, no especificada'),
('J96.9', 'Insuficiencia respiratoria, no especificada'),
-- Cardiovascular
('I10',   'Hipertensión esencial (primaria)'),
('I11.9', 'Cardiopatía hipertensiva sin insuficiencia cardíaca'),
('I20.9', 'Angina de pecho, no especificada'),
('I21.9', 'Infarto agudo del miocardio, no especificado'),
('I25.10','Enfermedad aterosclerótica del corazón'),
('I48.9', 'Fibrilación y aleteo auricular, no especificados'),
('I50.9', 'Insuficiencia cardíaca, no especificada'),
('I63.9', 'Infarto cerebral, no especificado'),
('I73.9', 'Enfermedad vascular periférica, no especificada'),
('I83.9', 'Venas varicosas de los miembros inferiores sin úlcera ni inflamación'),
-- Endocrinología y metabolismo
('E03.9', 'Hipotiroidismo, no especificado'),
('E05.9', 'Tirotoxicosis, no especificada'),
('E10',   'Diabetes mellitus tipo 1'),
('E11',   'Diabetes mellitus tipo 2'),
('E11.9', 'Diabetes mellitus tipo 2, sin complicaciones'),
('E11.65','Diabetes mellitus tipo 2 con hiperglucemia'),
('E66.9', 'Obesidad, no especificada'),
('E78.0', 'Hipercolesterolemia pura'),
('E78.5', 'Hiperlipidemia, no especificada'),
('E83.5', 'Trastornos del metabolismo del calcio'),
-- Gastrointestinal
('A09',   'Otras gastroenteritis y colitis de origen infeccioso y no especificadas'),
('K21.0', 'Enfermedad por reflujo gastroesofágico con esofagitis'),
('K21.9', 'Enfermedad por reflujo gastroesofágico sin esofagitis'),
('K25.9', 'Úlcera gástrica, no especificada'),
('K27.9', 'Úlcera péptica, sitio no especificado'),
('K29.5', 'Gastritis crónica, no especificada'),
('K29.7', 'Gastritis, no especificada'),
('K31.9', 'Enfermedad del estómago y del duodeno, no especificada'),
('K57.30','Diverticulosis del intestino grueso sin hemorragia'),
('K58.0', 'Síndrome del colon irritable con diarrea'),
('K58.9', 'Síndrome del colon irritable sin diarrea'),
('K59.0', 'Estreñimiento'),
('K74.6', 'Cirrosis hepática, no especificada'),
('K92.9', 'Enfermedades del aparato digestivo, no especificadas'),
-- Musculoesquelético
('M06.9', 'Artritis reumatoide, no especificada'),
('M10.9', 'Gota, no especificada'),
('M17.9', 'Gonartrosis, no especificada'),
('M47.9', 'Espondiloartrosis, no especificada'),
('M54.2', 'Cervicalgia'),
('M54.4', 'Lumbago con ciática'),
('M54.5', 'Lumbalgia'),
('M54.9', 'Dorsalgia, no especificada'),
('M75.1', 'Síndrome del manguito rotatorio'),
('M79.1', 'Mialgia'),
('M79.3', 'Paniculitis, no especificada'),
('M79.9', 'Trastorno de los tejidos blandos, no especificado'),
-- Urológico
('N10',   'Nefritis tubulointersticial aguda'),
('N18.9', 'Enfermedad renal crónica, no especificada'),
('N20.0', 'Cálculo del riñón'),
('N39.0', 'Infección de vías urinarias, sitio no especificado'),
('N40',   'Hiperplasia de la próstata'),
-- Salud mental
('F32.0', 'Episodio depresivo leve'),
('F32.1', 'Episodio depresivo moderado'),
('F32.9', 'Episodio depresivo, no especificado'),
('F33.0', 'Trastorno depresivo recurrente, episodio leve actual'),
('F41.0', 'Trastorno de pánico'),
('F41.1', 'Trastorno de ansiedad generalizada'),
('F41.9', 'Trastorno de ansiedad, no especificado'),
('F43.1', 'Trastorno de estrés postraumático'),
('F10.1', 'Trastornos mentales debidos al uso del alcohol, uso nocivo'),
-- Piel
('B35.0', 'Tiña de la barba y del cuero cabelludo'),
('B35.4', 'Tiña del pie'),
('L01.0', 'Impétigo por Staphylococcus'),
('L20.9', 'Dermatitis atópica, no especificada'),
('L23.9', 'Dermatitis alérgica de contacto, causa no especificada'),
('L25.9', 'Dermatitis de contacto, no especificada'),
('L30.9', 'Dermatitis, no especificada'),
('L50.9', 'Urticaria, no especificada'),
-- Ginecología y obstetricia
('N91.2', 'Amenorrea, no especificada'),
('N92.0', 'Menstruación excesiva y frecuente con ciclo regular'),
('N92.6', 'Menstruación irregular, no especificada'),
('N94.6', 'Dismenorrea, no especificada'),
('N95.1', 'Menopausia y climaterio femenino'),
('O09.9', 'Duración del embarazo, no especificada'),
('Z34.9', 'Supervisión de embarazo normal, no especificado'),
-- Neurológico
('G43.9', 'Migraña, no especificada'),
('G44.2', 'Cefalea tensional'),
('G47.0', 'Insomnio'),
('G62.9', 'Polineuropatía, no especificada'),
('R51',   'Cefalea'),
-- Oftalmológico
('H10.9', 'Conjuntivitis, no especificada'),
('H52.1', 'Miopía'),
('H52.4', 'Presbicia'),
('H66.9', 'Otitis media, no especificada'),
-- Otorrinolaringología
('H60.9', 'Otitis externa, no especificada'),
('H65.9', 'Otitis media no supurada, no especificada'),
('H92.0', 'Otalgia'),
-- Infecciosas
('A15.0', 'Tuberculosis del pulmón, confirmada por microscopía'),
('B01.9', 'Varicela sin complicaciones'),
('B02.9', 'Herpes zóster sin complicaciones'),
('B19.9', 'Hepatitis viral no especificada, sin coma hepático'),
('B50.9', 'Paludismo por Plasmodium falciparum, sin otra especificación'),
-- Preventivo / control
('Z00.0', 'Examen médico general'),
('Z00.1', 'Examen de rutina del estado de salud infantil'),
('Z30.0', 'Consejería general sobre anticoncepción'),
('Z76.0', 'Emisión de prescripción repetida')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 21. Campos clínicos parametrizables (signos vitales y examen físico)
-- ============================================================

CREATE TABLE IF NOT EXISTS campo_clinico (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    seccion     VARCHAR(20) NOT NULL CHECK (seccion IN ('signos_vitales', 'examen_fisico')),
    nombre      TEXT        NOT NULL,
    tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('numero', 'normal_notas', 'texto', 'opciones')),
    unidad      TEXT,
    clave       TEXT        NOT NULL UNIQUE,
    orden       SMALLINT    NOT NULL DEFAULT 0,
    esta_activo BOOLEAN     NOT NULL DEFAULT TRUE,
    descripcion TEXT,
    opciones    JSONB
);

INSERT INTO campo_clinico (seccion, nombre, tipo, unidad, clave, orden) VALUES
  ('signos_vitales', 'Tensión arterial sistólica',  'numero', 'mmHg',  'ta_sistolica',            1),
  ('signos_vitales', 'Tensión arterial diastólica', 'numero', 'mmHg',  'ta_diastolica',           2),
  ('signos_vitales', 'Frecuencia cardíaca',         'numero', 'lpm',   'frecuencia_cardiaca',     3),
  ('signos_vitales', 'Frecuencia respiratoria',     'numero', 'rpm',   'frecuencia_respiratoria', 4),
  ('signos_vitales', 'Temperatura',                 'numero', '°C',    'temperatura',             5),
  ('signos_vitales', 'Saturación O₂',               'numero', '%',     'saturacion_o2',           6),
  ('signos_vitales', 'Peso',                        'numero', 'kg',    'peso',                    7),
  ('signos_vitales', 'Talla',                       'numero', 'cm',    'talla',                   8),
  ('signos_vitales', 'Glucometría',                 'numero', 'mg/dL', 'glucometria',             9),
  ('signos_vitales', 'Perímetro abdominal',         'numero', 'cm',    'perimetro_abdominal',    10),
  ('examen_fisico',  'Aspecto general',             'texto',        NULL, 'aspecto_general',     1),
  ('examen_fisico',  'Piel y mucosas',              'normal_notas', NULL, 'piel',                2),
  ('examen_fisico',  'Cabeza y cuello',             'normal_notas', NULL, 'cabeza_cuello',       3),
  ('examen_fisico',  'Ojos',                        'normal_notas', NULL, 'ojos',                4),
  ('examen_fisico',  'Oídos, nariz, garganta',      'normal_notas', NULL, 'oing',                5),
  ('examen_fisico',  'Tórax',                       'normal_notas', NULL, 'torax',               6),
  ('examen_fisico',  'Pulmones',                    'normal_notas', NULL, 'pulmones',            7),
  ('examen_fisico',  'Cardiovascular',              'normal_notas', NULL, 'cardiovascular',      8),
  ('examen_fisico',  'Abdomen',                     'normal_notas', NULL, 'abdomen',             9),
  ('examen_fisico',  'Extremidades',                'normal_notas', NULL, 'extremidades',       10),
  ('examen_fisico',  'Neurológico',                 'normal_notas', NULL, 'neurologico',        11),
  ('examen_fisico',  'Musculoesquelético',          'normal_notas', NULL, 'musculoesqueletico', 12),
  ('examen_fisico',  'Genitourinario',              'normal_notas', NULL, 'genitourinario',     13)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 22. Notas de corrección por encuentro (Res. 1995/1999)
-- ============================================================

CREATE TABLE IF NOT EXISTS encuentro_nota (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    encuentro_id   UUID        NOT NULL,
    texto          TEXT        NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por     TEXT        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nota_encuentro ON encuentro_nota(encuentro_id);

-- ============================================================
-- 23. Catálogo de medicamentos predefinidos (POS / No POS)
-- ============================================================

CREATE TABLE IF NOT EXISTS medicamento_predefinido (
    id                 SERIAL  PRIMARY KEY,
    codigo             TEXT,
    nombre             TEXT    NOT NULL,
    concentracion      TEXT,
    forma_farmaceutica TEXT,
    tipo               TEXT    NOT NULL CHECK (tipo IN ('pos', 'no_pos')),
    esta_activo        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_medicamento_predefinido_tipo   ON medicamento_predefinido(tipo);
CREATE INDEX IF NOT EXISTS idx_medicamento_predefinido_nombre ON medicamento_predefinido
    USING gin(to_tsvector('spanish', nombre));
