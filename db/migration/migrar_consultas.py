#!/usr/bin/env python3
"""
Migración de consultas desde Simedic (historiacli.xlsx) → HCE Consultorio.

Uso:
    python3 migrar_consultas.py historiacli.xlsx --csv consultas_migradas.csv
    python3 migrar_consultas.py historiacli.xlsx --dry-run

El CSV resultante se carga en la BD con dos comandos COPY (ver README).

Nota: creado_por='migracion'. Actualizar al username real del médico con:
    UPDATE encuentro_clinico SET creado_por='<username>' WHERE creado_por='migracion';
    UPDATE encuentro_diagnostico SET ... (no tiene creado_por, hereda del encuentro)
"""

import sys, os, re, argparse, csv, json, uuid, unicodedata
from datetime import datetime, date

def _quitar_ctrl(s: str) -> str:
    return ''.join(c for c in s if unicodedata.category(c)[0] != 'C' or c in '\t\n\r')

try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl.  pip3 install openpyxl")

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTES
# ═══════════════════════════════════════════════════════════════════════════════

TEMPLATE_CONDUCTA = re.compile(r'^:\s*\n+\s*SIGNOS DE ALARMA:\s*', re.IGNORECASE)

# CUPS → finalidad_consulta RIPS
CUPS_FINALIDAD = {
    '890201': '10',  # Consulta primera vez
    '890301': '11',  # Consulta control/seguimiento
    '890302': '11',
}

# tipodia origen → tipo_diagnostico_principal RIPS
TIPO_DX = {
    '1': '01',  # Impresión diagnóstica
    '2': '02',  # Confirmado clínicamente
    '3': '03',  # Confirmado por laboratorio
}

# Mapeo columnas examen físico origen → clave campo_clinico HCE
# aspecto_general es tipo "texto" (string plano); el resto son tipo "normal_notas"
# ({normal: bool, notas: str}).
#
# Simedic usa nombres de campo que NO coinciden con el contenido real:
#   peri_cefalico → estado general del paciente (aspecto_general)
#   per_abdomen   → auscultación cardiaca (cardiovascular)
#   per_tprax     → agudeza visual/auditiva, otoscopia (oing)
#   bocagar       → mucosas orales → se agrega a cabeza_cuello
#   orofaringe    → cuello/tiroides → se agrega a cabeza_cuello
EXAMEN_MAP = {
    # ── aspecto_general (texto plano, puede recibir varias fuentes) ──────────
    'peri_cefalico': 'aspecto_general',  # estado general: consciente, hidratado…
    'Otros':         'aspecto_general',  # llenado capilar y miscelánea
    # ── normal_notas ─────────────────────────────────────────────────────────
    'peilanexos':    'piel',
    'cabeza':        'cabeza_cuello',
    'bocagar':       'cabeza_cuello',    # mucosas orales → región cabeza/cuello
    'orofaringe':    'cabeza_cuello',    # cuello/tiroides → región cabeza/cuello
    'per_tprax':     'oing',             # visual/auditivo/otoscopia (antes sin mapear)
    'Pulmones':      'torax',
    'cardiopulmonar':'pulmones',
    'per_abdomen':   'cardiovascular',   # ruidos cardiacos (antes sin mapear)
    'abdomen':       'abdomen',
    'miembros':      'extremidades',
    'neurolo':       'neurologico',
    'columna':       'musculoesqueletico',
    'genital':       'genitourinario',
}

# med1 contiene hallazgos renales — se concatena a aspecto_general (texto)
RENAL_COL = 'med1'

# Valores que indican "no se exploró" — se omiten del examen físico
NO_EXPLORO = {'no se explora', 'no explorado', 'no se realizó', 'n/a', 'na'}


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def s(val) -> str | None:
    """Limpia un valor a str o None."""
    if val is None:
        return None
    t = str(val).strip()
    return t if t else None


def limpiar_conducta(val) -> str | None:
    """Elimina el template boilerplate y devuelve solo el contenido real."""
    t = s(val)
    if not t:
        return None
    # Quitar la plantilla del inicio y dejar lo que sigue
    limpio = TEMPLATE_CONDUCTA.sub('', t).strip()
    return limpio if limpio else None


def parsear_ta(val):
    """'123/65' → (123, 65). Devuelve (None, None) si no parsea."""
    t = s(val)
    if not t:
        return None, None
    m = re.match(r'(\d+)\s*/\s*(\d+)', t)
    if m:
        return m.group(1), m.group(2)
    return None, None


def parsear_num(val) -> str | None:
    """Devuelve el número como string, o None si es 0 / vacío."""
    t = s(val)
    if not t or t in ('0', '0.0'):
        return None
    try:
        f = float(t)
        return None if f == 0 else t
    except ValueError:
        return None


def talla_a_cm(val) -> str | None:
    """Convierte talla de metros a cm si el valor es < 3 (p.ej. 1.75 → 175)."""
    t = parsear_num(val)
    if t is None:
        return None
    try:
        f = float(t)
        if f < 3:          # metros
            return str(round(f * 100, 1))
        return t           # ya en cm
    except ValueError:
        return None


def construir_signos(row, header) -> dict | None:
    h = header
    sv = {}

    ta_s, ta_d = parsear_ta(row[h.index('tension_arterial')])
    if ta_s: sv['ta_sistolica']  = ta_s
    if ta_d: sv['ta_diastolica'] = ta_d

    fc = parsear_num(row[h.index('frecuencia_cardiaca')])
    if fc: sv['frecuencia_cardiaca'] = fc

    temp = parsear_num(row[h.index('temperatura')])
    if temp: sv['temperatura'] = temp

    peso = parsear_num(row[h.index('peso')])
    if peso: sv['peso'] = peso

    talla = talla_a_cm(row[h.index('talla')])
    if talla: sv['talla'] = talla

    fr = parsear_num(row[h.index('fr')])
    if fr: sv['frecuencia_respiratoria'] = fr

    npso2 = parsear_num(row[h.index('npso2')])
    if npso2: sv['saturacion_o2'] = npso2

    return sv if sv else None


def construir_examen(row, header) -> dict | None:
    h = header
    ef = {}
    for col_origen, clave in EXAMEN_MAP.items():
        val = s(row[h.index(col_origen)])
        if not val or val.lower() in NO_EXPLORO:
            continue

        if clave == 'aspecto_general':
            # tipo texto — concatenar como string plano
            ef[clave] = ef[clave] + ' | ' + val if clave in ef else val
        else:
            # tipo normal_notas — { normal: bool, notas: str }
            if clave in ef:
                ef[clave]['notas'] = ef[clave]['notas'] + ' | ' + val
            else:
                ef[clave] = {'normal': True, 'notas': val}

    # Hallazgos renales (med1) → aspecto_general (texto)
    renal = s(row[h.index(RENAL_COL)])
    if renal and renal.lower() not in NO_EXPLORO:
        if 'aspecto_general' in ef:
            ef['aspecto_general'] += ' | Renal: ' + renal
        else:
            ef['aspecto_general'] = 'Renal: ' + renal

    return ef if ef else None


# ═══════════════════════════════════════════════════════════════════════════════
# LECTURA
# ═══════════════════════════════════════════════════════════════════════════════

def leer_excel(ruta: str):
    print(f"Leyendo {ruta} …")
    wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    ws = wb.active
    filas = list(ws.iter_rows(values_only=True))
    header = list(filas[0])
    data   = [tuple(_quitar_ctrl(str(v)) if isinstance(v, str) else v for v in f) for f in filas[1:]]
    print(f"  {len(data)} filas leídas.")
    return header, data


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSFORMACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

def transformar(header, data: list) -> tuple[list[dict], list[dict], list[str]]:
    """
    Devuelve (encuentros, diagnosticos, advertencias).
    encuentros  → filas para encuentro_clinico
    diagnosticos → filas para encuentro_diagnostico
    """
    encuentros   = []
    diagnosticos = []
    advertencias = []

    omitidos_sincedula = 0

    for row in data:
        doc = s(row[header.index('cc_hc')])

        # Saltar registros de prueba
        if not doc or doc.upper() == 'SINCEDULA':
            omitidos_sincedula += 1
            continue

        nrohis      = row[header.index('nrohis')]
        fecha_raw   = row[header.index('fecha_hist')]
        cups        = s(row[header.index('Cod_procedim')]) or '890201'
        motivo      = s(row[header.index('Motivo_consulta')]) or '(sin registro)'
        enfermedad  = s(row[header.index('Enferm_actual')])
        conducta    = limpiar_conducta(row[header.index('conducta')])
        tipodia     = s(row[header.index('tipodia')]) or '1'
        dx1_cod     = s(row[header.index('Diagnostico1')])
        dx2_cod     = s(row[header.index('Diagnostico2')])
        dx3_texto   = s(row[header.index('Diagnostico3')])
        dxrel_texto = s(row[header.index('Diagnostrelac')])

        # Fecha
        if isinstance(fecha_raw, datetime):
            fecha = fecha_raw.date().isoformat()
        elif isinstance(fecha_raw, date):
            fecha = fecha_raw.isoformat()
        else:
            d = s(fecha_raw)
            if not d:
                advertencias.append(f"  [{doc} nro:{nrohis}] sin fecha — omitido")
                continue
            try:
                fecha = datetime.strptime(d, '%d/%m/%Y').date().isoformat()
            except ValueError:
                advertencias.append(f"  [{doc} nro:{nrohis}] fecha inválida ({d}) — omitido")
                continue

        enc_uuid = str(uuid.uuid4())

        sv = construir_signos(row, header)
        ef = construir_examen(row, header)

        encuentro = {
            'id':                          enc_uuid,
            'encuentro_id':                enc_uuid,  # primera y única versión
            'estado':                      'finalizado',
            'paciente_documento':          doc,
            'fecha_atencion':              fecha,
            'finalidad_consulta':          CUPS_FINALIDAD.get(cups, '10'),
            'causa_externa':               '13',
            'via_ingreso':                 '02',
            'motivo_consulta':             motivo,
            'descripcion_ingreso':         enfermedad,
            'signos_vitales':              json.dumps(sv, ensure_ascii=False) if sv else '',
            'examen_fisico':               json.dumps(ef, ensure_ascii=False) if ef else '',
            'codigo_diagnostico_principal': dx1_cod,
            'descripcion_diagnostico':     dx3_texto,
            'tipo_diagnostico_principal':  TIPO_DX.get(tipodia, '01'),
            'plan_manejo':                 conducta,
            'creado_por':                  'migracion',
            'id_sistema_anterior':         str(nrohis) if nrohis else '',
        }
        encuentros.append(encuentro)

        # ── Diagnósticos ──────────────────────────────────────────────────────
        orden = 0

        if dx1_cod:
            diagnosticos.append({
                'id':                   str(uuid.uuid4()),
                'encuentro_clinico_id': enc_uuid,
                'tipo':                 'principal',
                'codigo':               dx1_cod,
                'descripcion':          dx3_texto or dx1_cod,
                'orden':                orden,
            })
            orden += 1

        if dx2_cod:
            diagnosticos.append({
                'id':                   str(uuid.uuid4()),
                'encuentro_clinico_id': enc_uuid,
                'tipo':                 'secundario',
                'codigo':               dx2_cod,
                'descripcion':          dx2_cod,
                'orden':                orden,
            })
            orden += 1

        if dx3_texto and not dx1_cod:
            # Solo texto, sin código — va como nota clínica
            diagnosticos.append({
                'id':                   str(uuid.uuid4()),
                'encuentro_clinico_id': enc_uuid,
                'tipo':                 'nota',
                'codigo':               '',
                'descripcion':          dx3_texto,
                'orden':                orden,
            })
            orden += 1

        if dxrel_texto:
            diagnosticos.append({
                'id':                   str(uuid.uuid4()),
                'encuentro_clinico_id': enc_uuid,
                'tipo':                 'nota',
                'codigo':               '',
                'descripcion':          dxrel_texto,
                'orden':                orden,
            })

    advertencias.insert(0, f"SINCEDULA omitidos: {omitidos_sincedula}")
    return encuentros, diagnosticos, advertencias


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTAR CSV
# ═══════════════════════════════════════════════════════════════════════════════

COLS_ENCUENTRO = [
    'id', 'encuentro_id', 'estado', 'paciente_documento',
    'fecha_atencion', 'finalidad_consulta', 'causa_externa', 'via_ingreso',
    'motivo_consulta', 'descripcion_ingreso',
    'signos_vitales', 'examen_fisico',
    'codigo_diagnostico_principal', 'descripcion_diagnostico',
    'tipo_diagnostico_principal', 'plan_manejo',
    'creado_por', 'id_sistema_anterior',
]

COLS_DIAGNOSTICO = [
    'id', 'encuentro_clinico_id', 'tipo', 'codigo', 'descripcion', 'orden',
]


def exportar_csv(encuentros, diagnosticos, advertencias, prefijo: str):
    ruta_enc  = prefijo + '_encuentros.csv'
    ruta_diag = prefijo + '_diagnosticos.csv'

    with open(ruta_enc, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLS_ENCUENTRO, extrasaction='ignore')
        w.writeheader()
        w.writerows(encuentros)

    with open(ruta_diag, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLS_DIAGNOSTICO, extrasaction='ignore')
        w.writeheader()
        w.writerows(diagnosticos)

    _guardar_log(advertencias, prefijo + '_advertencias.log')

    print(f"\nCSV generados:")
    print(f"  {ruta_enc}  ({len(encuentros)} filas)")
    print(f"  {ruta_diag}  ({len(diagnosticos)} filas)")
    print()
    print("Para cargar en la BD (en este orden):")
    print(f"  \\COPY encuentro_clinico ({','.join(COLS_ENCUENTRO)}) FROM '{ruta_enc}' CSV HEADER NULL ''")
    print(f"  \\COPY encuentro_diagnostico ({','.join(COLS_DIAGNOSTICO)}) FROM '{ruta_diag}' CSV HEADER NULL ''")


# ═══════════════════════════════════════════════════════════════════════════════
# DRY-RUN / LOG
# ═══════════════════════════════════════════════════════════════════════════════

def _guardar_log(advertencias, ruta):
    if not advertencias:
        return
    with open(ruta, 'w', encoding='utf-8') as f:
        f.write('\n'.join(advertencias))
    print(f"  Log: {ruta}")


def dry_run(encuentros, diagnosticos, advertencias):
    print(f"\n[DRY RUN] — nada escrito.")
    print(f"  Encuentros a insertar:   {len(encuentros)}")
    print(f"  Diagnósticos a insertar: {len(diagnosticos)}")
    print(f"  Advertencias:            {len(advertencias)}")
    print()
    print("Muestra (primeros 3 encuentros):")
    for e in encuentros[:3]:
        sv = json.loads(e['signos_vitales']) if e['signos_vitales'] else {}
        print(f"  [{e['paciente_documento']}] {e['fecha_atencion']}  "
              f"dx:{e['codigo_diagnostico_principal']}  "
              f"sv:{list(sv.keys())[:4]}")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='Migración de consultas Simedic → HCE')
    parser.add_argument('archivo', help='Ruta al historiacli.xlsx')
    parser.add_argument('--csv', metavar='PREFIJO',
                        help='Exportar CSVs con este prefijo (ej: consultas_migradas)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Solo mostrar estadísticas, sin escribir nada')
    args = parser.parse_args()

    if not os.path.exists(args.archivo):
        sys.exit(f"Archivo no encontrado: {args.archivo}")

    header, data = leer_excel(args.archivo)
    encuentros, diagnosticos, advertencias = transformar(header, data)

    print(f"  Encuentros:   {len(encuentros)}")
    print(f"  Diagnósticos: {len(diagnosticos)}")

    if args.dry_run:
        dry_run(encuentros, diagnosticos, advertencias)
    elif args.csv:
        exportar_csv(encuentros, diagnosticos, advertencias, args.csv)
    else:
        parser.print_help()
        print("\nIndica --csv PREFIJO o --dry-run")


if __name__ == '__main__':
    main()
