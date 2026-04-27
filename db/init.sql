-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Paciente Table
CREATE TABLE paciente (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_documento VARCHAR(2) NOT NULL,
    numero_documento varchar(20) UNIQUE NOT NULL,
    nombre_primero TEXT NOT NULL,
    nombre_segundo TEXT,
    apellido_primero TEXT NOT NULL,
    apellido_segundo TEXT,
    fecha_nacimiento DATE NOT NULL,
    genero CHAR(1) NOT NULL,

    codigo_pais_origen CHAR(3) DEFAULT '170',
    codigo_municipio_residencia CHAR(5) NOT NULL,
    zona_residencia CHAR(1) NOT NULL,
    tipo_usuario VARCHAR(2) NOT NULL,
    codigo_etnia VARCHAR(2) DEFAULT '06',
    codigo_discapacidad VARCHAR(2) DEFAULT '06',
    codigo_eps VARCHAR(10),

    telefono VARCHAR(20),
    correo_electronico TEXT,
    politica_datos_aceptada BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE encuentro_clinico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID REFERENCES paciente(id),

    fecha_atencion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    causa_externa VARCHAR(2) DEFAULT '13',
    finalidad_consulta VARCHAR(2) DEFAULT '10',
    via_inreso VARCHAR(2) DEFAULT '02',

    motivo_consulta TEXT NOT NULL,
    examen_fisico TEXT,
    codigo_diagnostico_principal VARCHAR(5) NOT NULL,
    plan_manejo TEXT,

    numero_version INTEGER DEFAULT 1,
    es_ultima_version BOOLEAN DEFAULT TRUE,
    hash_integridad TEXT,
    creado_por TEXT NOT NULL,
    id_sistema_anterior VARCHAR(50) -- for data migration
);

CREATE TABLE log_auditoria (
    id SERIAL PRIMARY KEY,
    nombre_tabla TEXT NOT NULL,
    registro_id UUID NOT NULL,
    accion TEXT NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario_id TEXT,
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION fn_auditar_cambios()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
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
AFTER INSERT OR UPDATE ON paciente
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();

CREATE TRIGGER trg_auditoria_encuentro
AFTER INSERT OR UPDATE ON encuentro_clinico
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();