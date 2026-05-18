-- Catálogo de exámenes predefinidos para consultorio de medicina general
-- Códigos CUPS tomados de la Resolución MINSALUD (Tabla 1 - Procedimientos en Salud)

INSERT INTO examen_predefinido (nombre, codigo_cups, categoria) VALUES

-- =====================================================================
-- LABORATORIO: Hematología
-- =====================================================================
('Hemograma completo (cuadro hemático)', '902208', 'laboratorio'),
('Hemograma I (Hb, Hcto, leucograma)', '902207', 'laboratorio'),
('Leucograma (recuento total y diferencial)', '902216', 'laboratorio'),
('Hemoglobina', '902213', 'laboratorio'),
('Hematocrito', '902211', 'laboratorio'),
('Recuento de plaquetas', '902220', 'laboratorio'),
('Velocidad de sedimentación globular (VSG)', '902205', 'laboratorio'),
('Tiempo de protrombina (TP)', '902044', 'laboratorio'),
('Tiempo de tromboplastina parcial (TTP)', '902049', 'laboratorio'),
('Dímero D', '902104', 'laboratorio'),

-- =====================================================================
-- LABORATORIO: Bioquímica y química sanguínea
-- =====================================================================
('Glucosa en ayunas', '903841', 'laboratorio'),
('Glucosa postprandial', '903843', 'laboratorio'),
('Curva de tolerancia a la glucosa', '903844', 'laboratorio'),
('Hemoglobina glicosilada (HbA1c)', '903426', 'laboratorio'),
('Creatinina sérica', '903895', 'laboratorio'),
('Urea en sangre (BUN)', '903869', 'laboratorio'),
('Ácido úrico', '903801', 'laboratorio'),
('Colesterol total', '903818', 'laboratorio'),
('Colesterol HDL', '903815', 'laboratorio'),
('Colesterol LDL', '903817', 'laboratorio'),
('Triglicéridos', '903868', 'laboratorio'),
('Bilirrubinas total y directa', '903809', 'laboratorio'),
('ALT / TGP (transaminasa glutámico-pirúvica)', '903866', 'laboratorio'),
('AST / TGO (transaminasa glutámico-oxalacética)', '903867', 'laboratorio'),
('Gamma-glutamil transferasa (GGT)', '903838', 'laboratorio'),
('Fosfatasa alcalina', '903833', 'laboratorio'),
('Deshidrogenasa láctica (LDH)', '903828', 'laboratorio'),
('Proteínas totales séricas', '903863', 'laboratorio'),
('Albúmina sérica', '903803', 'laboratorio'),
('Sodio sérico', '903864', 'laboratorio'),
('Potasio sérico', '903859', 'laboratorio'),
('Calcio sérico', '903603', 'laboratorio'),
('Magnesio sérico', '903854', 'laboratorio'),
('Ionograma (Na, K, Cl, HCO3)', '903605', 'laboratorio'),
('Ferritina', '903016', 'laboratorio'),
('Ácido fólico (folatos)', '903105', 'laboratorio'),
('Vitamina B12 (cianocobalamina)', '903703', 'laboratorio'),
('Vitamina D 25-OH total', '903706', 'laboratorio'),
('Troponina I cuantitativa', '903437', 'laboratorio'),
('Troponina I cualitativa', '903436', 'laboratorio'),
('Insulina basal', '904704', 'laboratorio'),

-- =====================================================================
-- LABORATORIO: Hormonas y tiroides
-- =====================================================================
('TSH ultrasensible', '904904', 'laboratorio'),
('T4 libre (tiroxina libre)', '904921', 'laboratorio'),
('T4 total (tiroxina total)', '904922', 'laboratorio'),
('T3 total (triyodotironina)', '904925', 'laboratorio'),
('Prueba de embarazo BhCG cualitativa', '904508', 'laboratorio'),
('FSH (hormona folículo estimulante)', '904105', 'laboratorio'),
('LH (hormona luteinizante)', '904107', 'laboratorio'),
('Prolactina', '904108', 'laboratorio'),
('Estradiol', '904503', 'laboratorio'),
('Progesterona', '904510', 'laboratorio'),
('Testosterona total', '904602', 'laboratorio'),
('Cortisol AM', '904812', 'laboratorio'),

-- =====================================================================
-- LABORATORIO: Serología e infecciosos
-- =====================================================================
('VIH 1 y 2 anticuerpos', '906249', 'laboratorio'),
('Prueba confirmatoria VIH', '906250', 'laboratorio'),
('Antígeno superficie Hepatitis B (HBsAg)', '906317', 'laboratorio'),
('Anti-core Hepatitis B total (Anti-HBc)', '906221', 'laboratorio'),
('Anti-HBs (anticuerpos Hepatitis B)', '906223', 'laboratorio'),
('Hepatitis C anticuerpos', '906225', 'laboratorio'),
('Hepatitis A anticuerpos IgM', '906218', 'laboratorio'),
('VDRL / Treponema pallidum anticuerpos', '906039', 'laboratorio'),
('Helicobacter pylori anticuerpos IgG', '906023', 'laboratorio'),
('Dengue anticuerpos IgG', '906207', 'laboratorio'),
('Dengue anticuerpos IgM', '906208', 'laboratorio'),
('Toxoplasma gondii IgG', '906127', 'laboratorio'),
('Toxoplasma gondii IgM', '906129', 'laboratorio'),

-- =====================================================================
-- LABORATORIO: Microbiología y uroanálisis
-- =====================================================================
('Parcial de orina (uroanálisis)', NULL, 'laboratorio'),
('Urocultivo con antibiograma', '901235', 'laboratorio'),
('Coprocultivo', '901206', 'laboratorio'),
('Coprológico (examen de materia fecal)', '901304', 'laboratorio'),
('Espermograma', '903013', 'laboratorio'),
('Gram para cualquier muestra', '901107', 'laboratorio'),
('Baciloscopia (Ziehl-Neelsen)', '901101', 'laboratorio'),
('Cultivo para M. tuberculosis', '901230', 'laboratorio'),

-- =====================================================================
-- IMAGEN: Radiografías
-- =====================================================================
('Radiografía de tórax PA y lateral', '871121', 'imagen'),
('Radiografía de abdomen simple', '872002', 'imagen'),
('Radiografía de columna cervical', '871010', 'imagen'),
('Radiografía de columna torácica', '871020', 'imagen'),
('Radiografía de columna dorsolumbar', '871030', 'imagen'),
('Radiografía de columna lumbosacra', '871040', 'imagen'),
('Radiografía de hombro', '873204', 'imagen'),
('Radiografía de húmero', '873121', 'imagen'),
('Radiografía de codo', '873205', 'imagen'),
('Radiografía de antebrazo', '873122', 'imagen'),
('Radiografía de muñeca', '873206', 'imagen'),
('Radiografía de mano / dedos', '873210', 'imagen'),
('Radiografía de cadera (coxofemoral)', '873411', 'imagen'),
('Radiografía de fémur', '873312', 'imagen'),
('Radiografía de rodilla', '873420', 'imagen'),
('Radiografía de pierna', '873313', 'imagen'),
('Radiografía de tobillo', '873431', 'imagen'),
('Radiografía de pie', '873333', 'imagen'),
('Radiografía de columna vertebral total', '871060', 'imagen'),

-- =====================================================================
-- IMAGEN: Ecografías
-- =====================================================================
('Ecografía de abdomen total', '881302', 'imagen'),
('Ecografía de abdomen superior', '881305', 'imagen'),
('Ecografía de hígado, páncreas y vía biliar', '881306', 'imagen'),
('Ecografía de riñones, bazo y adrenales', '881331', 'imagen'),
('Ecografía de vías urinarias (riñones, vejiga, próstata)', '881332', 'imagen'),
('Ecografía pélvica ginecológica transvaginal', '881401', 'imagen'),
('Ecografía pélvica ginecológica transabdominal', '881402', 'imagen'),
('Ecografía obstétrica transabdominal', '881431', 'imagen'),
('Ecografía obstétrica transvaginal', '881432', 'imagen'),
('Ecografía obstétrica con translucencia nucal', '881436', 'imagen'),
('Perfil biofísico fetal', '881434', 'imagen'),
('Ecografía de tiroides', '881141', 'imagen'),
('Ecografía de cuello', '881132', 'imagen'),
('Ecografía de mama', '881201', 'imagen'),
('Ecografía de próstata transabdominal', '881501', 'imagen'),
('Ecografía testicular', '881510', 'imagen'),
('Ecografía articular de hombro', '881610', 'imagen'),
('Ecografía articular de rodilla', '881620', 'imagen'),
('Ecografía de tejidos blandos miembros superiores', '881601', 'imagen'),
('Ecografía de tejidos blandos miembros inferiores', '881602', 'imagen'),
('Ecocardiograma transtorácico', '881202', 'imagen'),
('Holter de ritmo (monitoreo electrocardiográfico 24h)', '895001', 'imagen'),
('Electrocardiograma', '895100', 'imagen'),
('Espirometría', '893703', 'imagen'),

-- =====================================================================
-- IMAGEN: Tomografía computada (TAC / TC)
-- =====================================================================
('TAC de cráneo simple', '879111', 'imagen'),
('TAC de cráneo con contraste', '879112', 'imagen'),
('TAC de cráneo simple y con contraste', '879113', 'imagen'),
('TAC de cuello', '879161', 'imagen'),
('TAC de tórax', '879301', 'imagen'),
('TAC de abdomen superior', '879410', 'imagen'),
('TAC de abdomen y pelvis', '879420', 'imagen'),
('TAC de pelvis', '879460', 'imagen'),
('TAC de columna cervical/torácica/lumbar', '879201', 'imagen'),
('TAC de miembros inferiores', '879520', 'imagen'),

-- =====================================================================
-- IMAGEN: Mamografía, densitometría y otros
-- =====================================================================
('Mamografía bilateral', '876802', 'imagen'),
('Mamografía unilateral', '876801', 'imagen'),
('Osteodensitometría (DEXA)', '886012', 'imagen');
