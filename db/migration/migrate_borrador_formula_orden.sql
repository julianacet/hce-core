-- Agrega autoguardado de borrador a fórmula médica y órdenes de examen,
-- igual que ya existe para encuentro_clinico. Las filas existentes
-- representan fórmulas/órdenes ya finalizadas en su momento, por eso el
-- default aquí es 'finalizado' (a diferencia de init.sql, donde el default
-- para instalaciones nuevas es 'borrador').

ALTER TABLE formula_medica
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'finalizado'
    CHECK (estado IN ('borrador', 'finalizado'));

ALTER TABLE orden_examen
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'finalizado'
    CHECK (estado IN ('borrador', 'finalizado'));
