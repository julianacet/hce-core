-- Migración: nuevos roles de usuario
-- Reemplaza 'auxiliar' por recepcionista, enfermeria, facturador
-- Idempotente: se puede ejecutar varias veces sin error

ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_rol_check;

ALTER TABLE usuario ADD CONSTRAINT usuario_rol_check
  CHECK (rol IN ('admin', 'medico', 'recepcionista', 'enfermeria', 'facturador'));

-- Si hay usuarios con rol 'auxiliar' (instalaciones anteriores), pasan a recepcionista
UPDATE usuario SET rol = 'recepcionista' WHERE rol = 'auxiliar';
