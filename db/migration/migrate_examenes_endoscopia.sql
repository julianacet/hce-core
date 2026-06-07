-- Agregar colonoscopias y endoscopias diagnósticas al catálogo de exámenes
-- Idempotente: no inserta si el código CUPS ya existe

INSERT INTO examen_predefinido (nombre, codigo_cups, categoria)
SELECT v.nombre, v.codigo_cups, v.categoria FROM (VALUES
  ('Colonoscopia total', '452301', 'imagen'),
  ('Colonoscopia total con o sin biopsia', '452305', 'imagen'),
  ('Colonoscopia con magnificación o cromoendoscópica', '452303', 'imagen'),
  ('Dilatación del colon por colonoscopia', '468501', 'imagen'),
  ('Esofagogastroduodenoscopia (EGD) con o sin biopsia', '441302', 'imagen'),
  ('Esofagogastroduodenoscopia (EGD) con magnificación o cromoendoscopia', '441303', 'imagen'),
  ('Esofagoscopia vía oral exploratoria o diagnóstica sin biopsia', '422003', 'imagen'),
  ('Sigmoidoscopia flexible o rígida', '452401', 'imagen'),
  ('Proctosigmoidoscopia', '482301', 'imagen'),
  ('Enteroscopia o endoscopia de intestino delgado después de duodeno', '451302', 'imagen'),
  ('Enteroscopia o endoscopia de intestino delgado después de duodeno con biopsia', '451306', 'imagen'),
  ('Colangiopancreatografía retrógrada endoscópica (CPRE)', '511001', 'imagen'),
  ('Biopsia por punción y aspiración guiada por ecoendoscopia', '542901', 'imagen')
) AS v(nombre, codigo_cups, categoria)
WHERE NOT EXISTS (
  SELECT 1 FROM examen_predefinido e WHERE e.codigo_cups = v.codigo_cups
);
