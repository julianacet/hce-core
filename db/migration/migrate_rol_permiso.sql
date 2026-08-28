-- Migración: tabla rol_permiso — mapeo de roles a recursos (páginas/acciones)
-- de la aplicación. Sembrada con el mismo contenido de api/permisos.Registro
-- para que la migración sea transparente: nadie gana ni pierde acceso.
-- El rol 'admin' nunca se lista: el backend siempre lo trata como acceso
-- total sin consultar esta tabla.
-- Idempotente: se puede ejecutar varias veces sin error, sin importar si la
-- tabla no existe, si ya existe con la versión anterior (llave primaria
-- compuesta (rol, recurso), sin columna id), o si ya tiene la forma final.

CREATE TABLE IF NOT EXISTS rol_permiso (
    id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rol     VARCHAR(20) NOT NULL
                        CHECK (rol IN ('medico', 'recepcionista', 'enfermeria', 'facturador', 'farmacia')),
    recurso VARCHAR(50) NOT NULL,
    UNIQUE (rol, recurso)
);

-- Instalaciones que ya corrieron una versión anterior de esta migración
-- (llave primaria compuesta (rol, recurso), sin columna id): migrar en caliente.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rol_permiso' AND column_name = 'id'
    ) THEN
        ALTER TABLE rol_permiso ADD COLUMN id UUID DEFAULT gen_random_uuid();
        UPDATE rol_permiso SET id = gen_random_uuid() WHERE id IS NULL;
        ALTER TABLE rol_permiso ALTER COLUMN id SET NOT NULL;
        ALTER TABLE rol_permiso DROP CONSTRAINT rol_permiso_pkey;
        ALTER TABLE rol_permiso ADD PRIMARY KEY (id);
        ALTER TABLE rol_permiso ADD CONSTRAINT rol_permiso_rol_recurso_key UNIQUE (rol, recurso);
    END IF;
END $$;

-- "admin" ya no es un recurso independiente: el acceso a /admin se deriva
-- de tener cualquier admin.* (ver AuthContext.tieneAlgunRecurso). Limpia la
-- fila en instalaciones que ya corrieron una versión anterior de esta
-- migración; no falla si no existe.
DELETE FROM rol_permiso WHERE recurso = 'admin';

INSERT INTO rol_permiso (rol, recurso) VALUES
    ('medico', 'pacientes'), ('recepcionista', 'pacientes'), ('enfermeria', 'pacientes'),
    ('medico', 'nueva-consulta'),
    ('medico', 'agenda'), ('recepcionista', 'agenda'), ('enfermeria', 'agenda'),
    ('medico', 'consentimientos'), ('recepcionista', 'consentimientos'),
    ('medico', 'facturas'), ('recepcionista', 'facturas'), ('facturador', 'facturas'),
    ('medico', 'rips-mensual'), ('facturador', 'rips-mensual'),
    ('medico', 'tarifas'), ('facturador', 'tarifas'),
    ('medico', 'inventario'), ('recepcionista', 'inventario'), ('enfermeria', 'inventario'),
    ('medico', 'proveedores'),
    ('medico', 'eventos-adversos'), ('enfermeria', 'eventos-adversos'),
    ('medico', 'encuestas'), ('recepcionista', 'encuestas'),
    ('farmacia', 'farmacia'), ('medico', 'farmacia'), ('recepcionista', 'farmacia'),
    ('enfermeria', 'farmacia'), ('facturador', 'farmacia'),
    ('medico', 'admin.perfil'),
    ('medico', 'admin.apariencia'),
    ('medico', 'admin.antecedentes'),
    ('medico', 'admin.consentimientos'),
    ('medico', 'admin.eventos'),
    ('medico', 'admin.campos'),
    ('medico', 'admin.medicamentos'),
    ('medico', 'admin.examenes'),
    ('medico', 'admin.sistema')
ON CONFLICT (rol, recurso) DO NOTHING;
-- admin.usuarios y historial no tienen filas: son exclusivos de admin.
