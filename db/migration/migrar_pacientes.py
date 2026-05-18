#!/usr/bin/env python3
"""
Migración de pacientes desde Simedic (xlsx) → HCE Consultorio.

Uso:
    python3 migrar_pacientes.py pacientes.xlsx
    python3 migrar_pacientes.py pacientes.xlsx --dry-run

Variables de entorno para la conexión (o ajustar los defaults abajo):
    HCE_DB_HOST   (default: localhost)
    HCE_DB_PORT   (default: 5432)
    HCE_DB_NAME   (default: hce)
    HCE_DB_USER   (default: hce)
    HCE_DB_PASS   (default: hce)

Para quitar este script del instalador: eliminar este archivo y la línea
que lo invoca en el script de instalación (install.sh o equivalente).
"""

import sys
import os
import re
import argparse
from datetime import datetime, date

try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl. Instalar con: pip3 install openpyxl")

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    sys.exit("Falta psycopg2. Instalar con: pip3 install psycopg2-binary")

# ═══════════════════════════════════════════════════════════════════════════════
# TABLAS DE MAPEO
# ═══════════════════════════════════════════════════════════════════════════════

# Códigos internos de Simedic (llaveci en ciudades.xlsx) → DIVIPOLA (CHAR 5)
# Fuente verificada contra ciudades.xlsx del sistema origen
CIUDAD_DIVIPOLA: dict[int, str] = {
    # Tolima
    4389: '73555',  # Planadas
    4391: '73520',  # Palocabildo
    4392: '73504',  # Ortega
    4395: '73449',  # Melgar
    4396: '73563',  # Prado
    4400: '73585',  # Purificación
    4401: '73616',  # Rioblanco
    4402: '73622',  # Roncesvalles
    4403: '73624',  # Rovira             — 5 541 pacientes (el principal)
    4404: '73671',  # Saldaña
    4405: '73678',  # San Luis
    4407: '73854',  # Valle de San Juan
    4408: '73861',  # Venadillo
    4411: '73675',  # San Antonio
    4414: '73001',  # Ibagué
    4415: '73026',  # Alvarado
    4417: '73043',  # Anzoátegui
    4419: '73067',  # Ataco
    4420: '73124',  # Cajamarca
    4423: '73168',  # Chaparral
    4425: '73411',  # Líbano
    4428: '73319',  # Guamo
    4435: '73217',  # Coyaima
    # Otros departamentos
    3437: '05642',  # Salgar, Antioquia
    3461: '05001',  # Medellín, Antioquia
    3584: '11001',  # Bogotá (Teusaquillo)
    3594: '11001',  # Bogotá (Bosa)
    3921: '25372',  # Junín, Cundinamarca
    4242: '54347',  # Herrán, Norte de Santander
}
DEFAULT_MUNICIPIO = '73624'  # Rovira, Tolima

# Tipo de usuario Simedic (número) → código RIPS (2 dígitos)
TIPO_USUARIO: dict = {
    1:    '01',   # Contributivo
    2:    '02',   # Subsidiado
    3:    '03',   # Vinculado / no asegurado
    4:    '02',   # Subsidiado (el 99 % de la fuente)
    5:    '03',   # Vinculado
    6:    '05',   # Otro
    None: '02',
}

# Tipo de identificación — la fuente usa los mismos códigos que HCE
TIPO_DOC_VALIDOS = {'CC', 'CE', 'TI', 'RC', 'AS', 'MS', 'PA', 'PE', 'PT'}

# Nombre de EPS (origen, en mayúsculas) → código en nuestra tabla eps
EPS_NOMBRE_CODIGO: dict[str, str | None] = {
    'NUEVA EPS':                         'EPSS37',
    'LA NUEVA EPS':                      'EPSS37',
    'NUEVA EPS.':                        'EPSS37',
    'NUEVA PES.':                        'EPSS37',
    'NUEVA EPS SUBSIDIADO':              'EPSS37',
    'NUEVA EPS (CONTRIBUTIVO9':          'EPS037',
    'NUEVA EPS S.A.':                    'EPSS37',
    'ASMET SALUD':                       'ESS062',
    'ASMET - SALUD':                     'ESS062',
    'ASMED SALUD':                       'ESS062',
    'ASMEDSALUD':                        'ESS062',
    'ASMET SALUD CONTRIBUTIVO':          'ESSC62',
    'SALUD TOTAL':                       'EPSS02',
    'SALUD TORAL':                       'EPSS02',
    'SALUD TOTAL SUBSIDIADO':            'EPSS02',
    'SANITAS':                           'EPSS05',
    'EPS - SANITAS':                     'EPSS05',
    'SANITAS EPS':                       'EPSS05',
    'FAMISANAR':                         'EPSS17',
    'COMPENSAR':                         'EPSS08',
    'SURA':                              'EPSS10',
    'EMSSANAR EPS':                      'ESS118',
    'PIJAOS SALUD':                      'EPSI06',
    'PIJAO SALUD':                       'EPSI06',
    'AIC - EPS INDIGENA DEL CAUCA':      'EPSI03',
    # Sin código en nuestra BD → None (campo queda vacío)
    'ECOOPS':   None, 'ECOOPSOS':  None, 'ECOPSS':    None,
    'COMPARTA': None, 'SOLASALUD': None, 'CAFESALUD': None,
    'SALUD VIDA': None, 'MEDIMAS':  None,
    'TOLI HUILA': None, 'TOLIHUILA': None,
    'EPS - MAGISTERIO - TOLI HUILA': None,
    'POLICIA NACIONAL': None, 'SANIDAD MILITAR': None,
    'SANIDAD': None, 'EJERCITO': None, 'PREPAGADA': None,
    'SISBEN': None, 'SISBEM': None,
    'N/D': None, 'NINGUNA': None, 'NINGUNO': None,
    'NO': None, 'NO SABE': None,
}


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS DE LIMPIEZA
# ═══════════════════════════════════════════════════════════════════════════════

def limpiar_str(val) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s if s and s.upper() not in ('NO', 'NINGUNA', 'NINGUNO', 'N/A', 'N/D') else None


def limpiar_telefono(val) -> str | None:
    if val is None:
        return None
    # Extraer solo la primera secuencia de dígitos (ignora texto adjunto como nombres)
    digitos = re.findall(r'\d+', str(val))
    t = ''.join(digitos)[:20]
    return t if len(t) >= 7 else None


def limpiar_email(val) -> str | None:
    s = limpiar_str(val)
    if not s:
        return None
    if '@' in s and '.' in s.split('@')[-1]:
        return s.lower()
    return None


def normalizar_genero(val) -> str:
    if val and str(val).strip().upper() in ('F',):
        return 'F'
    if val and str(val).strip().upper() in ('M',):
        return 'M'
    return 'M'   # default solicitado


def normalizar_tipo_doc(val) -> str:
    if val and str(val).strip().upper() in TIPO_DOC_VALIDOS:
        return str(val).strip().upper()
    return 'CC'


def normalizar_municipio(cod, advertencias: list, doc: str) -> str:
    try:
        key = int(cod) if cod is not None else None
    except (ValueError, TypeError):
        key = None
    municipio = CIUDAD_DIVIPOLA.get(key)
    if municipio is None:
        advertencias.append(f"  [{doc}] ciudad desconocida ({cod}) → {DEFAULT_MUNICIPIO} (Rovira)")
        return DEFAULT_MUNICIPIO
    return municipio


def normalizar_zona(val) -> str:
    if val and str(val).strip().upper() in ('R', 'r'):
        return 'R'
    return 'U'


def resolver_eps(nombre_eps) -> str | None:
    if not nombre_eps:
        return None
    key = str(nombre_eps).strip().upper()
    if key in EPS_NOMBRE_CODIGO:
        return EPS_NOMBRE_CODIGO[key]
    # Búsqueda parcial para variaciones de escritura
    for patron, codigo in EPS_NOMBRE_CODIGO.items():
        if patron and len(patron) > 4 and patron in key:
            return codigo
    return None


def limpiar_fecha(val) -> date | None:
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.date() if isinstance(val, datetime) else val
    s = str(val).strip()
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# LECTURA DEL EXCEL
# ═══════════════════════════════════════════════════════════════════════════════

def leer_excel(ruta: str) -> list[dict]:
    print(f"Leyendo {ruta} …")
    wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    ws = wb.active
    filas = list(ws.iter_rows(values_only=True))
    encabezado = [str(c).strip() if c else f'col{i}' for i, c in enumerate(filas[0])]
    registros = []
    for fila in filas[1:]:
        registros.append(dict(zip(encabezado, fila)))
    print(f"  {len(registros)} filas leídas.")
    return registros


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSFORMACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

def transformar(registro: dict, advertencias: list) -> dict | None:
    doc = str(registro.get('Cedulap', '') or '').strip()
    if not doc:
        advertencias.append("  [sin doc] fila omitida — documento vacío")
        return None

    tipo_doc = normalizar_tipo_doc(registro.get('Tipo_Identificacion'))
    nombre1  = limpiar_str(registro.get('Primer_Nombre'))   or '(SIN NOMBRE)'
    nombre2  = limpiar_str(registro.get('Segundo_Nombre'))
    apellido1 = limpiar_str(registro.get('Primer_Apellido')) or '(SIN APELLIDO)'
    apellido2 = limpiar_str(registro.get('Segundo_Apellido'))

    fecha_nac = limpiar_fecha(registro.get('Fecha_nacimi'))
    if fecha_nac is None:
        advertencias.append(f"  [{doc}] sin fecha de nacimiento — omitido")
        return None

    genero    = normalizar_genero(registro.get('sexo'))
    municipio = normalizar_municipio(registro.get('codigo_ciudad'), advertencias, doc)
    zona      = normalizar_zona(registro.get('Residencia_Habitual'))

    tipo_usuario = TIPO_USUARIO.get(registro.get('Tipo_Usuario'), '02')

    # Dirección: combinar calle + barrio
    dir_base = limpiar_str(registro.get('Direcc_resd')) or ''
    barrio   = limpiar_str(registro.get('Barrio'))
    if barrio and barrio.upper() not in ('NO', 'LA MISMA'):
        direccion = f"{dir_base}, {barrio}".strip(', ') if dir_base else barrio
    else:
        direccion = dir_base or None

    # Teléfono: preferir celular sobre teléfono fijo
    celular  = limpiar_telefono(registro.get('Celular'))
    telefono = limpiar_telefono(registro.get('Telefono'))
    tel_final = celular or telefono

    email    = limpiar_email(registro.get('email'))
    eps_code = resolver_eps(registro.get('nomeps'))

    return {
        'tipo_documento':              tipo_doc,
        'numero_documento':            doc,
        'nombre_primero':              nombre1.upper(),
        'nombre_segundo':              nombre2.upper() if nombre2 else None,
        'apellido_primero':            apellido1.upper(),
        'apellido_segundo':            apellido2.upper() if apellido2 else None,
        'fecha_nacimiento':            fecha_nac,
        'genero':                      genero,
        'codigo_municipio_residencia': municipio,
        'zona_residencia':             zona,
        'tipo_usuario':                tipo_usuario,
        'codigo_etnia':                '06',
        'codigo_discapacidad':         '06',
        'codigo_pais_origen':          '170',
        'direccion':                   direccion,
        'telefono':                    tel_final,
        'correo_electronico':          email,
        'codigo_eps':                  eps_code,
        'politica_datos_aceptada':     False,
        'creado_por':                  'migracion',
    }


# ═══════════════════════════════════════════════════════════════════════════════
# INSERCIÓN
# ═══════════════════════════════════════════════════════════════════════════════

INSERT_SQL = """
INSERT INTO paciente (
    tipo_documento, numero_documento,
    nombre_primero, nombre_segundo,
    apellido_primero, apellido_segundo,
    fecha_nacimiento, genero,
    codigo_municipio_residencia, zona_residencia,
    tipo_usuario, codigo_etnia, codigo_discapacidad, codigo_pais_origen,
    direccion, telefono, correo_electronico, codigo_eps,
    politica_datos_aceptada, creado_por
) VALUES (
    %(tipo_documento)s, %(numero_documento)s,
    %(nombre_primero)s, %(nombre_segundo)s,
    %(apellido_primero)s, %(apellido_segundo)s,
    %(fecha_nacimiento)s, %(genero)s,
    %(codigo_municipio_residencia)s, %(zona_residencia)s,
    %(tipo_usuario)s, %(codigo_etnia)s, %(codigo_discapacidad)s, %(codigo_pais_origen)s,
    %(direccion)s, %(telefono)s, %(correo_electronico)s, %(codigo_eps)s,
    %(politica_datos_aceptada)s, %(creado_por)s
)
ON CONFLICT DO NOTHING
"""


def migrar(registros_raw: list[dict], dry_run: bool):
    advertencias: list[str] = []
    transformados: list[dict] = []

    print("Transformando registros …")
    for r in registros_raw:
        t = transformar(r, advertencias)
        if t:
            transformados.append(t)

    omitidos    = len(registros_raw) - len(transformados)
    con_default = sum(1 for a in advertencias if 'ciudad desconocida' in a)

    print(f"  {len(transformados)} listos para insertar, {omitidos} omitidos.")

    if dry_run:
        print("\n[DRY RUN] — no se escribió nada en la base de datos.")
        _imprimir_muestra(transformados[:5])
        _guardar_log(advertencias)
        return

    conn_params = {
        'host':     os.getenv('HCE_DB_HOST', 'localhost'),
        'port':     int(os.getenv('HCE_DB_PORT', '5432')),
        'dbname':   os.getenv('HCE_DB_NAME', 'hce'),
        'user':     os.getenv('HCE_DB_USER', 'hce'),
        'password': os.getenv('HCE_DB_PASS', 'hce'),
    }

    print(f"\nConectando a {conn_params['host']}:{conn_params['port']}/{conn_params['dbname']} …")
    try:
        conn = psycopg2.connect(**conn_params)
    except Exception as e:
        sys.exit(f"Error al conectar: {e}")

    # autocommit=True → cada INSERT es su propia transacción;
    # un fallo no revierte los anteriores.
    conn.autocommit = True

    insertados  = 0
    duplicados  = 0
    errores     = 0

    with conn.cursor() as cur:
        for pac in transformados:
            try:
                cur.execute(INSERT_SQL, pac)
                if cur.rowcount == 0:
                    duplicados += 1
                else:
                    insertados += 1
            except Exception as e:
                errores += 1
                advertencias.append(f"  [{pac['numero_documento']}] ERROR: {e}")

    conn.close()

    _guardar_log(advertencias)

    print("\n── Resultado ──────────────────────────────────────")
    print(f"  Insertados:  {insertados}")
    print(f"  Duplicados:  {duplicados}  (ya existían, ignorados)")
    print(f"  Errores:     {errores}")
    print(f"  Con default: {con_default}  (ciudad o sexo ajustado)")
    print("───────────────────────────────────────────────────")


COLUMNAS_CSV = [
    'tipo_documento', 'numero_documento',
    'nombre_primero', 'nombre_segundo',
    'apellido_primero', 'apellido_segundo',
    'fecha_nacimiento', 'genero',
    'codigo_municipio_residencia', 'zona_residencia',
    'tipo_usuario', 'codigo_etnia', 'codigo_discapacidad', 'codigo_pais_origen',
    'direccion', 'telefono', 'correo_electronico', 'codigo_eps',
    'politica_datos_aceptada', 'creado_por',
]


def exportar_csv(registros_raw: list[dict], ruta_csv: str):
    import csv
    advertencias: list[str] = []
    transformados: list[dict] = []

    print("Transformando registros …")
    for r in registros_raw:
        t = transformar(r, advertencias)
        if t:
            transformados.append(t)

    omitidos    = len(registros_raw) - len(transformados)
    con_default = sum(1 for a in advertencias if 'ciudad desconocida' in a)

    print(f"  {len(transformados)} registros transformados, {omitidos} omitidos.")

    with open(ruta_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNAS_CSV, extrasaction='ignore')
        writer.writeheader()
        for pac in transformados:
            # Convertir bool a texto que PostgreSQL COPY entiende
            pac['politica_datos_aceptada'] = 'false'
            writer.writerow(pac)

    _guardar_log(advertencias)
    print(f"\nCSV generado: {ruta_csv}")
    print(f"  {len(transformados)} filas  ·  {con_default} con municipio por defecto (Rovira)")
    print()
    print("Para cargarlo en la BD:")
    print(f"  \\COPY paciente ({', '.join(COLUMNAS_CSV)}) FROM '{ruta_csv}' CSV HEADER NULL ''")


def _guardar_log(advertencias: list[str]):
    if not advertencias:
        return
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'migracion_advertencias.log')
    with open(log_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(advertencias))
    print(f"  {len(advertencias)} advertencias/errores en {log_path}")


def _imprimir_muestra(registros: list[dict]):
    print("\nMuestra de los primeros registros transformados:")
    for r in registros:
        print(f"  {r['tipo_documento']} {r['numero_documento']}  "
              f"{r['apellido_primero']} {r['apellido_segundo'] or ''}, "
              f"{r['nombre_primero']} {r['nombre_segundo'] or ''}  "
              f"nac:{r['fecha_nacimiento']}  {r['genero']}  "
              f"mun:{r['codigo_municipio_residencia']}  eps:{r['codigo_eps']}")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='Migración de pacientes Simedic → HCE')
    parser.add_argument('archivo', help='Ruta al archivo .xlsx de pacientes')
    parser.add_argument('--dry-run', action='store_true',
                        help='Transforma pero no inserta en la BD')
    parser.add_argument('--csv', metavar='ARCHIVO_CSV',
                        help='Exportar datos transformados a CSV en lugar de insertar en BD')
    args = parser.parse_args()

    if not os.path.exists(args.archivo):
        sys.exit(f"Archivo no encontrado: {args.archivo}")

    registros = leer_excel(args.archivo)

    if args.csv:
        exportar_csv(registros, args.csv)
    else:
        migrar(registros, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
