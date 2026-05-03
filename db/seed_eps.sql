-- ============================================================
-- SEED EPS — Entidades SGSSS
-- Fuente: ADRES — Entidades SGSSS 2023 (BDUA Junio 2023)
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS regimen_salud (
  codigo  VARCHAR(10)   PRIMARY KEY,
  nombre  VARCHAR(100)  NOT NULL
);

CREATE TABLE IF NOT EXISTS eps (
  id       SERIAL        PRIMARY KEY,
  codigo   VARCHAR(20)   NOT NULL,
  nombre   VARCHAR(400)  NOT NULL,
  regimen  VARCHAR(10)   NOT NULL REFERENCES regimen_salud(codigo),
  UNIQUE (codigo, regimen)
);

CREATE INDEX IF NOT EXISTS idx_eps_regimen ON eps(regimen);
CREATE INDEX IF NOT EXISTS idx_eps_codigo  ON eps(codigo);

-- ------------------------------------------------------------
-- Regímenes
-- ------------------------------------------------------------
INSERT INTO regimen_salud (codigo, nombre) VALUES
  ('CNT', 'Contributivo'),
  ('SBS', 'Subsidiado'),
  ('ESP', 'Excepción y Especial'),
  ('VOL', 'Voluntario y Medicina Prepagada')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

-- ------------------------------------------------------------
-- Régimen Subsidiado (SBS)
-- ------------------------------------------------------------
INSERT INTO eps (codigo, nombre, regimen) VALUES
  ('CCF033',  'EPS FAMILIAR DE COLOMBIA S.A.S.',                                                                                        'SBS'),
  ('CCF050',  'CAJA DE COMPENSACIÓN FAMILIAR DEL ORIENTE COLOMBIANO "COMFAORIENTE"',                                                     'SBS'),
  ('CCF055',  'CAJACOPI EPS S.A.S',                                                                                                      'SBS'),
  ('CCF102',  'CAJA DE COMPENSACIÓN FAMILIAR DEL CHOCÓ',                                                                                 'SBS'),
  ('EPSI01',  'ASOCIACIÓN DE CABILDOS INDÍGENAS DEL CESAR Y GUAJIRA "DUSAKAWI A.R.S.I."',                                               'SBS'),
  ('EPSI03',  'ASOCIACIÓN INDÍGENA DEL CAUCA A.I.C. EPSI',                                                                              'SBS'),
  ('EPSI04',  'EMPRESA PROMOTORA DE SALUD INDÍGENA ANAS WAYUU EPSI',                                                                    'SBS'),
  ('EPSI05',  'ENTIDAD PROMOTORA DE SALUD MALLAMAS EPSI',                                                                               'SBS'),
  ('EPSI06',  'PIJAOS SALUD EPSI',                                                                                                       'SBS'),
  ('EPSS01',  'ALIANSALUD EPS S.A.',                                                                                                     'SBS'),
  ('EPSS02',  'SALUD TOTAL ENTIDAD PROMOTORA DE SALUD DEL REGIMEN CONTRIBUTIVO Y DEL REGIMEN SUBSIDIADO S.A.',                          'SBS'),
  ('EPSS05',  'ENTIDAD PROMOTORA DE SALUD SANITAS S.A.S.',                                                                              'SBS'),
  ('EPSS08',  'CAJA DE COMPENSACIÓN FAMILIAR COMPENSAR',                                                                                 'SBS'),
  ('EPSS10',  'EPS SURAMERICANA S.A.',                                                                                                   'SBS'),
  ('EPSS12',  'CAJA DE COMPENSACION FAMILIAR DEL VALLE DEL CAUCA "COMFENALCO VALLE DE LA GENTE"',                                       'SBS'),
  ('EPSS17',  'EPS FAMISANAR S.A.S.',                                                                                                    'SBS'),
  ('EPSS18',  'ENTIDAD PROMOTORA DE SALUD SERVICIO OCCIDENTAL DE SALUD S.A. S.O.S.',                                                    'SBS'),
  ('EPSS025', 'CAPRESOCA E.P.S.',                                                                                                        'SBS'),
  ('EPSS34',  'CAPITAL SALUD ENTIDAD PROMOTORA DE SALUD DEL RÉGIMEN SUBSIDIADO SAS "CAPITAL SALUD EPS-S S.A.S."',                       'SBS'),
  ('EPSS37',  'NUEVA EPS S.A.',                                                                                                          'SBS'),
  ('EPSS40',  'ALIANZA MEDELLIN ANTIOQUIA EPS S.A.S. "SAVIA SALUD EPS"',                                                               'SBS'),
  ('EPSS41',  'NUEVA EPS S.A.',                                                                                                          'SBS'),
  ('EPSS42',  'COOSALUD EPS S.A.',                                                                                                       'SBS'),
  ('EPSS46',  'FUNDACIÓN SALUD MIA',                                                                                                     'SBS'),
  ('EPSS47',  'SALUD BOLÍVAR EPS SAS',                                                                                                   'SBS'),
  ('EPSS48',  'ASOCIACION MUTUAL SER EMPRESA SOLIDARIA DE SALUD ENTIDAD PROMOTORA DE SALUD - MUTUAL SER EPS',                           'SBS'),
  ('ESS024',  'COOSALUD EPS S.A.',                                                                                                       'SBS'),
  ('ESS062',  'ASMET SALUD EPS S.A.S.',                                                                                                  'SBS'),
  ('ESS118',  'EMSSANAR S.A.S.',                                                                                                         'SBS'),
  ('ESS207',  'ASOCIACION MUTUAL SER EMPRESA SOLIDARIA DE SALUD ENTIDAD PROMOTORA DE SALUD - MUTUAL SER EPS',                           'SBS')
ON CONFLICT (codigo, regimen) DO UPDATE SET nombre = EXCLUDED.nombre;

-- ------------------------------------------------------------
-- Régimen Contributivo (CNT)
-- ------------------------------------------------------------
INSERT INTO eps (codigo, nombre, regimen) VALUES
  ('CCFC20',  'CAJA DE COMPENSACIÓN FAMILIAR DEL CHOCÓ',                                                                                'CNT'),
  ('CCFC33',  'EPS FAMILIAR DE COLOMBIA S.A.S.',                                                                                        'CNT'),
  ('CCFC50',  'CAJA DE COMPENSACIÓN FAMILIAR DEL ORIENTE COLOMBIANO "COMFAORIENTE"',                                                    'CNT'),
  ('CCFC55',  'CAJACOPI EPS S.A.S',                                                                                                     'CNT'),
  ('EAS016',  'EMPRESAS PUBLICAS DE MEDELLIN - DEPARTAMENTO MEDICO',                                                                    'CNT'),
  ('EAS027',  'FONDO PASIVO SOCIAL DE LOS FERROCARRILES NACIONALES',                                                                    'CNT'),
  ('EPC25',   'CAPRESOCA E.P.S.',                                                                                                        'CNT'),
  ('EPC34',   'CAPITAL SALUD ENTIDAD PROMOTORA DE SALUD DEL RÉGIMEN SUBSIDIADO SAS "CAPITAL SALUD EPS-S S.A.S."',                      'CNT'),
  ('EPS001',  'ALIANSALUD EPS S.A.',                                                                                                     'CNT'),
  ('EPS002',  'SALUD TOTAL ENTIDAD PROMOTORA DE SALUD DEL REGIMEN CONTRIBUTIVO Y DEL REGIMEN SUBSIDIADO S.A.',                         'CNT'),
  ('EPS005',  'ENTIDAD PROMOTORA DE SALUD SANITAS S.A.S.',                                                                              'CNT'),
  ('EPS008',  'CAJA DE COMPENSACIÓN FAMILIAR COMPENSAR',                                                                                 'CNT'),
  ('EPS010',  'EPS SURAMERICANA S.A.',                                                                                                   'CNT'),
  ('EPS012',  'CAJA DE COMPENSACION FAMILIAR DEL VALLE DEL CAUCA "COMFENALCO VALLE DE LA GENTE"',                                      'CNT'),
  ('EPS017',  'EPS FAMISANAR S.A.S.',                                                                                                    'CNT'),
  ('EPS018',  'ENTIDAD PROMOTORA DE SALUD SERVICIO OCCIDENTAL DE SALUD S.A. S.O.S.',                                                   'CNT'),
  ('EPS037',  'NUEVA EPS S.A.',                                                                                                          'CNT'),
  ('EPS040',  'ALIANZA MEDELLIN ANTIOQUIA EPS S.A.S. "SAVIA SALUD EPS"',                                                               'CNT'),
  ('EPS041',  'NUEVA EPS S.A.',                                                                                                          'CNT'),
  ('EPS042',  'COOSALUD EPS S.A.',                                                                                                       'CNT'),
  ('EPS046',  'FUNDACIÓN SALUD MIA',                                                                                                     'CNT'),
  ('EPS047',  'SALUD BOLÍVAR EPS SAS',                                                                                                   'CNT'),
  ('EPS048',  'ASOCIACION MUTUAL SER EMPRESA SOLIDARIA DE SALUD ENTIDAD PROMOTORA DE SALUD - MUTUAL SER EPS',                          'CNT'),
  ('EPSIC1',  'ASOCIACIÓN DE CABILDOS INDÍGENAS DEL CESAR Y GUAJIRA "DUSAKAWI A.R.S.I."',                                              'CNT'),
  ('EPSIC3',  'ASOCIACIÓN INDÍGENA DEL CAUCA A.I.C. EPSI',                                                                             'CNT'),
  ('EPSIC4',  'EMPRESA PROMOTORA DE SALUD INDÍGENA ANAS WAYUU EPSI',                                                                   'CNT'),
  ('EPSIC5',  'ENTIDAD PROMOTORA DE SALUD MALLAMAS EPSI',                                                                              'CNT'),
  ('EPSIC6',  'PIJAOS SALUD EPSI',                                                                                                      'CNT'),
  ('ESSC07',  'ASOCIACION MUTUAL SER EMPRESA SOLIDARIA DE SALUD ENTIDAD PROMOTORA DE SALUD - MUTUAL SER EPS',                          'CNT'),
  ('ESSC18',  'EMSSANAR S.A.S.',                                                                                                         'CNT'),
  ('ESSC24',  'COOSALUD EPS S.A.',                                                                                                       'CNT'),
  ('ESSC62',  'ASMET SALUD EPS S.A.S.',                                                                                                  'CNT')
ON CONFLICT (codigo, regimen) DO UPDATE SET nombre = EXCLUDED.nombre;

-- ------------------------------------------------------------
-- Régimen de Excepción y Especial (ESP)
-- ------------------------------------------------------------
INSERT INTO eps (codigo, nombre, regimen) VALUES
  ('FMS001',  'FUERZAS MILITARES',                                                 'ESP'),
  ('POL001',  'POLICIA NACIONAL SANIDAD',                                           'ESP'),
  ('RES002',  'ECOPETROL',                                                           'ESP'),
  ('RES004',  'MAGISTERIO',                                                          'ESP'),
  ('RES005',  'UNIVERSIDAD DEL ATLANTICO',                                           'ESP'),
  ('RES006',  'UNIVERSIDAD INDUSTRIAL DE SANTANDER',                                 'ESP'),
  ('RES007',  'UNIVERSIDAD DEL VALLE',                                               'ESP'),
  ('RES008',  'UNIVERSIDAD NACIONAL DE COLOMBIA',                                    'ESP'),
  ('RES009',  'UNIVERSIDAD DEL CAUCA',                                               'ESP'),
  ('RES010',  'UNIVERSIDAD DE CARTAGENA',                                            'ESP'),
  ('RES011',  'UNIVERSIDAD DE ANTIOQUIA',                                            'ESP'),
  ('RES012',  'UNIVERSIDAD DE CORDOBA',                                              'ESP'),
  ('RES013',  'UNIVERSIDAD DE NARIÑO',                                               'ESP'),
  ('RES014',  'UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA - UPTC',             'ESP')
ON CONFLICT (codigo, regimen) DO UPDATE SET nombre = EXCLUDED.nombre;

-- ------------------------------------------------------------
-- Planes Voluntarios y Medicina Prepagada (VOL)
-- ------------------------------------------------------------
INSERT INTO eps (codigo, nombre, regimen) VALUES
  ('EMP002',  'MEDPLUS MEDICINA PREPAGADA S.A.',                                                                                         'VOL'),
  ('EMP015',  'MEDISANITAS S.A. COMPAÑÍA DE MEDICINA PREPAGADA',                                                                        'VOL'),
  ('EMP017',  'COLMEDICA MEDICINA PREPAGADA',                                                                                            'VOL'),
  ('EMP021',  'EPS Y MEDICINA PREPAGADA SURAMERICANA S.A.',                                                                             'VOL'),
  ('EMP022',  'VIVIR S.A.',                                                                                                              'VOL'),
  ('EMP023',  'COMPAÑÍA DE MEDICINA PREPAGADA COLSANITAS S.A.',                                                                         'VOL'),
  ('EMP024',  'SERVICIO DE SALUD INMEDIATO MEDICINA PREPAGADA S.A.',                                                                    'VOL'),
  ('EMP025',  'PLAN U.H.C.M. MEDICINA PREPAGADA COMFENALCO VALLE',                                                                     'VOL'),
  ('EMP028',  'COOMEVA MEDICINA PREPAGADA S.A.',                                                                                         'VOL'),
  ('EMP029',  'COLPATRIA MEDICINA PREPAGADA S.A.',                                                                                       'VOL'),
  ('EPS003',  'CAFESALUD EPS',                                                                                                           'VOL'),
  ('EPS023',  'CRUZ BLANCA EPS',                                                                                                         'VOL'),
  ('000014',  'ALLIANZ SEGUROS S.A.',                                                                                                    'VOL'),
  ('P13005',  'ACE SEGUROS S.A.',                                                                                                        'VOL'),
  ('P13006',  'AXA COLPATRIA SEGUROS S.A.',                                                                                              'VOL'),
  ('P13007',  'NACIONAL DE SEGUROS S.A. COMPAÑÍA DE SEGUROS GENERALES',                                                                 'VOL'),
  ('P13008',  'COMPAÑÍA ASEGURADORA DE FIANZAS S.A., CONFIANZA S.A.',                                                                   'VOL'),
  ('P13009',  'QBE SEGUROS S.A.',                                                                                                        'VOL'),
  ('P13014',  'GENERALI COLOMBIA - SEGUROS GENERALES S.A.',                                                                             'VOL'),
  ('P13015',  'ROYAL & SUN ALLIANCE SEGUROS (COLOMBIA) S.A.',                                                                           'VOL'),
  ('P13017',  'COMPAÑÍA MUNDIAL DE SEGUROS S.A.',                                                                                        'VOL'),
  ('P13018',  'SEGUROS DE VIDA SURAMERICANA S.A.',                                                                                       'VOL'),
  ('P13021',  'CHUBB DE COLOMBIA COMPAÑÍA DE SEGUROS S.A.',                                                                             'VOL'),
  ('P13022',  'AIG SEGUROS COLOMBIA S.A.',                                                                                               'VOL'),
  ('P13024',  'LA PREVISORA S.A. COMPAÑÍA DE SEGUROS',                                                                                  'VOL'),
  ('P13025',  'SEGUROS ALFA S.A.',                                                                                                       'VOL'),
  ('P13026',  'MAPFRE SEGUROS GENERALES DE COLOMBIA S.A.',                                                                               'VOL'),
  ('P13027',  'COMPAÑÍA DE SEGUROS BOLIVAR S.A.',                                                                                        'VOL'),
  ('P13029',  'SEGUROS DEL ESTADO S.A.',                                                                                                  'VOL'),
  ('P13030',  'SEGUREXPO DE COLOMBIA S.A. ASEGURADORA DE CRÉDITO Y DEL COMERCIO EXTERIOR',                                             'VOL'),
  ('P13033',  'LIBERTY SEGUROS S.A.',                                                                                                    'VOL'),
  ('P13041',  'BBVA SEGUROS COLOMBIA S.A.',                                                                                              'VOL'),
  ('P13042',  'SOLUNION COLOMBIA SEGUROS DE CRÉDITO S.A.',                                                                              'VOL'),
  ('P13044',  'CARDIF COLOMBIA SEGUROS GENERALES S.A.',                                                                                  'VOL'),
  ('P13045',  'JMALUCELLITRAVELERS SEGUROS S.A.',                                                                                        'VOL'),
  ('P13046',  'COFACE COLOMBIA SEGUROS DE CRÉDITO S.A.',                                                                                'VOL'),
  ('P13047',  'BERKLEY INTERNATIONAL SEGUROS COLOMBIA S.A.',                                                                             'VOL'),
  ('P13048',  'ZURICH COLOMBIA SEGUROS S.A.',                                                                                            'VOL'),
  ('SAP008',  'EMERGENCIA MEDICA INTEGRAL COLOMBIA S.A.',                                                                                'VOL'),
  ('SAP026',  'EMERMEDICA S.A. SERVICIOS DE AMBULANCIA PREPAGADOS',                                                                     'VOL'),
  ('SAP030',  'EMPRESA DE MEDICINA INTEGRAL EMI SA SERVICIO DE AMBULANCIA PREPAGADO',                                                   'VOL'),
  ('SAP031',  'ASISTENCIA MEDICA INMEDIATA - SERVICIO DE AMBULANCIA PREPAGADA S.A.',                                                    'VOL'),
  ('SAP032',  'SERVICIO DE EMERGENCIAS REGIONAL (SERVICIO DE AMBULANCIA PREPAGADO) S.A.',                                              'VOL'),
  ('SAP033',  'COOMEVA EMERGENCIA MÉDICA',                                                                                               'VOL'),
  ('SAP034',  'ASISTENCIA MEDICA SAS SERVICIO DE AMBULANCIA PREPAGADO',                                                                 'VOL'),
  ('SAP035',  'SERVICIO DE ASISTENCIA MEDICA INMEDIATA S.A. - SERVICIO DE AMBULANCIA PREPAGADO',                                       'VOL'),
  ('SAP037',  'SERVICIOS MEDICOS INTEGRALES DE COLOMBIA SERVICIO DE AMBULANCIAS PREPAGADO S.A.S. "SEMI SAP S.A.S."',                   'VOL'),
  ('SAP038',  'RED MEDICA VITAL S.A.S. SERVICIO DE AMBULANCIA PREPAGADO',                                                               'VOL')
ON CONFLICT (codigo, regimen) DO UPDATE SET nombre = EXCLUDED.nombre;

COMMIT;
