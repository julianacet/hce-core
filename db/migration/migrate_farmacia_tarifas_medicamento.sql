-- ============================================================
-- HCE Farmacia — Tarifas de medicamentos
-- Tabla propia del módulo farmacia para registrar el precio
-- de referencia de cada medicamento del catálogo.
-- ============================================================

CREATE TABLE IF NOT EXISTS farmacia.tarifa_medicamento (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    medicamento_id  INTEGER       NOT NULL UNIQUE
                                  REFERENCES medicamento_predefinido(id) ON DELETE CASCADE,
    precio          NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
    notas           TEXT,
    esta_activo     BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_por      TEXT          NOT NULL DEFAULT 'sistema',
    fecha_creacion  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farm_tarifa_med ON farmacia.tarifa_medicamento(medicamento_id);
