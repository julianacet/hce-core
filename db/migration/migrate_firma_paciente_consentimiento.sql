-- Guarda la firma del paciente (PNG data-URL capturado en tableta digitalizadora)
-- al registrar un consentimiento como firmado.
ALTER TABLE consentimiento_generado ADD COLUMN IF NOT EXISTS firma_paciente_base64 TEXT;
