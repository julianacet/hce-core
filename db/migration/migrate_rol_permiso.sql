-- Migración: tabla rol_permiso — mapeo de roles a recursos (páginas/acciones)
-- de la aplicación. Sembrada con el mismo contenido de api/permisos.Registro
-- para que la migración sea transparente: nadie gana ni pierde acceso.
-- El rol 'admin' nunca se lista: el backend siempre lo trata como acceso
-- total sin consultar esta tabla.
-- Idempotente: se puede ejecutar varias veces sin error.

CREATE TABLE IF NOT EXISTS rol_permiso (
    rol     VARCHAR(20) NOT NULL
                        CHECK (rol IN ('medico', 'recepcionista', 'enfermeria', 'facturador', 'farmacia')),
    recurso VARCHAR(50) NOT NULL,
    PRIMARY KEY (rol, recurso)
);

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
    ('medico', 'admin'),
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
