-- Vincula cada factura con su encuentro clínico (relación 1:1).
-- La cola de pendientes es implícita: factura.encuentro_id IS NULL.
ALTER TABLE factura ADD COLUMN IF NOT EXISTS encuentro_id UUID REFERENCES encuentro_clinico(id);

CREATE INDEX IF NOT EXISTS idx_factura_encuentro_id
    ON factura(encuentro_id) WHERE encuentro_id IS NOT NULL;
