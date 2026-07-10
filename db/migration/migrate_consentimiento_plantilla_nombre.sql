-- Congela el nombre de la plantilla en cada consentimiento generado, igual que
-- ya se hace con contenido_renderizado, para que el historial no dependa de
-- que la plantilla siga existiendo ni de su nombre actual. Además permite
-- borrar una plantilla ya usada sin que la FK lo bloquee (ON DELETE SET NULL).
ALTER TABLE consentimiento_generado ADD COLUMN IF NOT EXISTS plantilla_nombre TEXT;

UPDATE consentimiento_generado cg
SET plantilla_nombre = pc.nombre
FROM plantilla_consentimiento pc
WHERE pc.id = cg.plantilla_id AND cg.plantilla_nombre IS NULL;

ALTER TABLE consentimiento_generado DROP CONSTRAINT IF EXISTS consentimiento_generado_plantilla_id_fkey;
ALTER TABLE consentimiento_generado ADD CONSTRAINT consentimiento_generado_plantilla_id_fkey
    FOREIGN KEY (plantilla_id) REFERENCES plantilla_consentimiento(id) ON DELETE SET NULL;
