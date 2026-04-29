-- Migración: soporte para RIPS mensual (lote sin FEV)
ALTER TABLE rips_generado ALTER COLUMN encuentro_id DROP NOT NULL;
ALTER TABLE rips_generado ADD COLUMN IF NOT EXISTS periodo VARCHAR(7);
CREATE INDEX IF NOT EXISTS idx_rips_periodo ON rips_generado(periodo) WHERE periodo IS NOT NULL;
