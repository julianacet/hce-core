-- Permite ítems de factura sin código CUPS (procedimientos internos del consultorio).
-- El código deja de ser obligatorio; cuando es NULL, el ítem es meramente interno
-- y no se refleja en RIPS. La FK se mantiene: si hay código, debe existir en el catálogo.

ALTER TABLE factura_item
    ALTER COLUMN codigo_cups DROP NOT NULL;
