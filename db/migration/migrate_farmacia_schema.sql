-- Migración: schema del módulo de Farmacia
-- Idempotente: se puede ejecutar varias veces sin error.
-- Necesaria para instalaciones existentes que actualicen desde una versión
-- anterior a la inclusión del módulo de farmacia en hce-core.

CREATE SCHEMA IF NOT EXISTS farmacia;

CREATE TABLE IF NOT EXISTS farmacia.factura (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    numero             TEXT          UNIQUE NOT NULL,
    paciente_documento TEXT          NOT NULL,
    fecha              TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total              NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado             TEXT          NOT NULL DEFAULT 'pagada'
                                     CHECK (estado IN ('pagada', 'pendiente', 'anulada')),
    notas              TEXT,
    creado_por         TEXT          NOT NULL DEFAULT 'sistema',
    fecha_creacion     TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farm_factura_paciente ON farmacia.factura(paciente_documento);
CREATE INDEX IF NOT EXISTS idx_farm_factura_fecha    ON farmacia.factura(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_farm_factura_numero   ON farmacia.factura(numero);

CREATE TABLE IF NOT EXISTS farmacia.factura_item (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id          UUID          NOT NULL REFERENCES farmacia.factura(id) ON DELETE CASCADE,
    medicamento_id      INTEGER       REFERENCES medicamento_predefinido(id) ON DELETE SET NULL,
    nombre_medicamento  TEXT          NOT NULL,
    concentracion       TEXT          NOT NULL DEFAULT '',
    forma_farmaceutica  TEXT          NOT NULL DEFAULT '',
    cantidad            NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
    precio_unitario     NUMERIC(12,2) NOT NULL,
    subtotal            NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_farm_item_factura ON farmacia.factura_item(factura_id);

CREATE TABLE IF NOT EXISTS farmacia.contador_factura (
    year   INT PRIMARY KEY,
    ultimo INT NOT NULL DEFAULT 0
);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA farmacia TO hce;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA farmacia TO hce;
GRANT USAGE ON SCHEMA farmacia TO hce;
