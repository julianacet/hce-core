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
    genero            CHAR(1)     NOT NULL CHECK (genero IN ('M', 'F', 'I')),

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
    motivo_consulta              TEXT       NOT NULL,
    examen_fisico                TEXT,
    codigo_diagnostico_principal VARCHAR(5) NOT NULL,  -- CIE-10
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
-- 9. Inventario de insumos
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
