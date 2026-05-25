#!/usr/bin/env python3
"""
Migración de antecedentes Simedic → HCE.

Fuentes:
  consantceodon.xlsx  → personal, familiar, quirúrgico, farmacológico, alérgico, hábitos
  cons-gineco.xlsx    → ginecológico

Uso:
    python3 migrar_antecedentes.py --csv antecedentes_migrados.csv
    python3 migrar_antecedentes.py --dry-run

Carga en BD:
    COPY antecedente_respuesta (id,numero_documento,pregunta_id,valor,detalle)
         FROM 'antecedentes_migrados.csv' CSV HEADER NULL ''
         ON CONFLICT (numero_documento, pregunta_id) DO NOTHING
"""

import sys, re, argparse, csv, uuid, unicodedata
from pathlib import Path

def _quitar_ctrl(s: str) -> str:
    return ''.join(c for c in s if unicodedata.category(c)[0] != 'C' or c in '\t\n\r')

try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl.  pip3 install openpyxl")

# Directorio donde están los xlsx — se sobreescribe con --dir
EXPORTS = Path('.')

# ═══════════════════════════════════════════════════════════════════════════════
# UUIDs de preguntas (del seed de la BD — no cambian)
# ═══════════════════════════════════════════════════════════════════════════════

Q = {
    # ── alérgico ─────────────────────────────────────────────────────────────
    'alerg_medicamento': 'cc542f28-d419-4b01-97c8-42b2f167884b',
    'alerg_alimento':    'e5eb7f0c-278e-4523-8338-6b729befcc6e',
    'alerg_ambiental':   '84b607f0-1adf-4f90-8e87-903b76fb12b9',
    'alerg_anafilaxia':  '094b4d46-3e92-4270-80f7-ec73cba96b9d',
    # ── familiar ─────────────────────────────────────────────────────────────
    'fam_diabetes':      'fc03376f-5adf-4cd6-ab7e-4947bcb6d5fb',
    'fam_hipertension':  '4eee66a8-5b13-49f4-80f0-190240105234',
    'fam_cardiaco':      '1a505e8c-df84-4681-9d67-8c81cad66737',
    'fam_cancer':        '779e1943-8df5-4fce-9dc7-10c8d47c8af3',
    'fam_hereditaria':   '4b82a76a-7b3b-46c4-a061-c005900e16c6',
    'fam_mental':        '9538815c-5b1e-4364-8400-54f820215cd3',
    # ── farmacológico ────────────────────────────────────────────────────────
    'farma_prescripcion': '22075b28-cc4e-4550-8f30-9f1ecd7a3f4d',
    'farma_venta_libre':  '616c8aad-9210-4640-a36b-49c0fbeaf10c',
    'farma_plantas':      '19f864bc-c507-4949-8f66-233f0fa554b2',
    # ── ginecológico ─────────────────────────────────────────────────────────
    'gineco_menarquia':    'fee229dd-63c6-4a38-b23b-f28927dcb32e',
    'gineco_ciclo':        '98797685-12c9-49f1-8103-6739c56738b3',
    'gineco_menopausia':   'd2152624-2ca1-4fea-abd2-4b06cb270ab6',
    'gineco_gestas':       'e389a769-13bf-4a1c-9aa7-e3bfb0a5b82d',
    'gineco_partos':       '9d7f6ae5-833b-43dc-9827-792d2635c682',
    'gineco_cesareas':     'b0233eb8-4824-4aaf-a0dd-69ce001ced77',
    'gineco_abortos':      '24cc7ca7-f468-4cdb-b5fe-eea8a7fc47c7',
    'gineco_fum':          'cdff79e4-2277-4432-afc8-defa9340900a',
    'gineco_planificacion':'5143812c-f2d0-4adf-aea1-cb909fbc0a94',
    'gineco_citologia':    'bc98e371-a7ff-4298-b5f8-b0b434122962',
    'gineco_problema':     '37166b34-d42a-4b4a-9393-1a711d687969',
    # ── hábito ───────────────────────────────────────────────────────────────
    'habito_tabaco':    'ae076470-5709-4f24-a6e1-48e3d5c50b34',
    'habito_alcohol':   'aad641a7-8672-4151-a995-569ec5290778',
    'habito_psicoact':  '1107d27b-2109-4268-8d37-7b75564edf73',
    'habito_actividad': '7f615118-2cfa-492a-8998-9e621ecb6c16',
    'habito_dieta':     '06241210-5320-4257-8dae-4ce34e50bc65',
    # ── personal ─────────────────────────────────────────────────────────────
    'pers_hipertension': '4b4176ef-b480-4d69-bcb2-18413ada74ec',
    'pers_diabetes':     '010273b8-1445-4cd6-a2b4-0893a602ded2',
    'pers_tiroides':     'ed114f4a-3709-4aee-b12e-685f8f7307cc',
    'pers_asma':         '3165ffe4-8bee-42a5-8256-6b94bb1a0efc',
    'pers_epoc':         '09fa1771-329d-44f4-a21d-1e186ce0c6c2',
    'pers_infarto':      '17b3feb2-a089-4200-8c1c-fc163a51d0bd',
    'pers_acv':          'b8c14ab8-f450-4e3c-a66a-39592892393f',
    'pers_ic':           'a8b4aa7c-5ddb-4e95-ba7a-dd3804a3b9a6',
    'pers_renal':        '7c6f2f32-af51-47c8-a371-fb5e84b540a9',
    'pers_autoinmune':   '04466344-0ea6-46a9-8b47-5570e88ff7c1',
    'pers_cancer':       'f5fb7725-0573-4499-a7e6-c6cf57387a43',
    'pers_epilepsia':    '2c00135d-633a-4958-afa1-68626ae727f5',
    'pers_vih':          'cd602ea5-3bdc-4fa8-ad59-cb73de2cecb0',
    'pers_hospitalizado':'ace6a101-041b-43b4-a353-d5131c94f4fb',
    'pers_otro':         '5cc17383-50d8-44a7-a587-3157429a8be9',
    # ── quirúrgico ───────────────────────────────────────────────────────────
    'quir_cirugias':    'c943e275-e374-4de4-ba64-a573d2a34008',
    'quir_anestesia':   '64cae400-1289-46aa-9360-f4cb93d9938e',
    'quir_transfusion': 'c4b6dda6-07de-4b10-b0d4-fc7b6dde5d6b',
}

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def leer(nombre: str):
    ruta = EXPORTS / nombre
    wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    ws = wb.active
    filas = list(ws.iter_rows(values_only=True))
    header = [str(c) if c is not None else '' for c in filas[0]]
    data = [tuple(_quitar_ctrl(str(v)) if isinstance(v, str) else v for v in f) for f in filas[1:]]
    return header, data


def s(val) -> str:
    if val is None:
        return ''
    return str(val).strip()


def niega(val: str) -> bool:
    """Retorna True si el texto indica negación o está vacío."""
    t = val.strip().upper()
    return not t or t in ('NIEGA', 'NIEGA.', 'NO', 'NINGUNA', 'NINGUNO', 'N/A', 'NA', '0')


def contiene(texto: str, *palabras) -> bool:
    t = texto.upper()
    return any(p in t for p in palabras)


def fila(doc: str, clave: str, valor: str, detalle: str = '') -> dict:
    return {
        'id':               str(uuid.uuid4()),
        'numero_documento': doc,
        'pregunta_id':      Q[clave],
        'valor':            valor,
        'detalle':          detalle,
    }


def si(doc: str, clave: str, detalle: str = '') -> dict:
    return fila(doc, clave, 'true', detalle)


# ═══════════════════════════════════════════════════════════════════════════════
# ANTECEDENTES GENERALES (consantceodon.xlsx)
# ═══════════════════════════════════════════════════════════════════════════════

def procesar_antecedentes(header, data) -> tuple[list[dict], list[str]]:
    filas = []
    advertencias = []
    vistos = set()  # (doc, pregunta_id) — evitar duplicados

    def agregar(row_dict: dict):
        key = (row_dict['numero_documento'], row_dict['pregunta_id'])
        if key not in vistos:
            vistos.add(key)
            filas.append(row_dict)

    def idx(col): return header.index(col)

    for row in data:
        doc = s(row[idx('cc_hcant')])
        if not doc:
            continue

        antpat     = s(row[idx('antpat')])
        antquir    = s(row[idx('antquir')])
        anttox     = s(row[idx('anttox')])
        anthosp    = s(row[idx('anthosp')])
        antfarma   = s(row[idx('antfarma')])
        antfami    = s(row[idx('antfami')])
        dieta      = s(row[idx('dieta')])
        alcohol    = s(row[idx('alcohol')])
        ejercicio  = s(row[idx('ejercicio')])
        fuma_val   = s(row[idx('fuma')])
        alucinogeno= s(row[idx('alucinogeno')])
        cardiop    = row[idx('cardiop')]  # boolean en origen
        descard    = s(row[idx('descard')])
        deshepat   = s(row[idx('deshepat')])
        deshiv     = s(row[idx('deshiv')])
        desdiab    = s(row[idx('desdiab')])
        deshipe    = s(row[idx('deshipe')])
        cualaler   = s(row[idx('cualaler')])
        cualefpul  = s(row[idx('cualefpul')])
        causahospit= s(row[idx('causahospit')])
        otrosant   = s(row[idx('otrosant')])

        # ── Personal ─────────────────────────────────────────────────────────
        if not niega(deshipe):
            agregar(si(doc, 'pers_hipertension', deshipe))

        if not niega(desdiab):
            agregar(si(doc, 'pers_diabetes', desdiab))

        if not niega(deshiv):
            agregar(si(doc, 'pers_vih', deshiv))

        if not niega(cualefpul):
            agregar(si(doc, 'pers_epoc', cualefpul))

        if cardiop or (not niega(descard) and contiene(descard, 'INSUFICIENCI', 'FALLA CARDIACA')):
            agregar(si(doc, 'pers_ic', descard))

        if not niega(descard) and contiene(descard, 'INFARTO', 'IAM'):
            agregar(si(doc, 'pers_infarto', descard))

        if not niega(descard) and contiene(descard, 'ACV', 'DERRAME', 'ISQUEMIA CEREBRAL'):
            agregar(si(doc, 'pers_acv', descard))

        if not niega(anthosp):
            detalle_hosp = causahospit if causahospit else anthosp
            agregar(si(doc, 'pers_hospitalizado', detalle_hosp))

        # Buscar condiciones específicas en el texto libre de antpat
        if not niega(antpat):
            if contiene(antpat, 'ASMA'):
                agregar(si(doc, 'pers_asma', antpat))
            if contiene(antpat, 'TIROI', 'HIPOTIROI', 'HIPERTIROI'):
                agregar(si(doc, 'pers_tiroides', antpat))
            if contiene(antpat, 'EPILEPSI', 'CONVULSI', 'CRISIS EPILEPTICA'):
                agregar(si(doc, 'pers_epilepsia', antpat))
            if contiene(antpat, 'CANCER', 'CARCINOMA', 'TUMOR MALIGNO', 'LEUCEMIA', 'LINFOMA'):
                agregar(si(doc, 'pers_cancer', antpat))
            if contiene(antpat, 'RENAL CRONI', 'INSUFICIENCIA RENAL', 'IRC'):
                agregar(si(doc, 'pers_renal', antpat))
            if contiene(antpat, 'ARTRITIS', 'LUPUS', 'AUTOINMUNE', 'ARTRITIS REUMATOI'):
                agregar(si(doc, 'pers_autoinmune', antpat))
            if contiene(antpat, 'INFARTO', 'IAM') and 'pers_infarto' not in {k[1] for k in vistos if k[0] == doc}:
                agregar(si(doc, 'pers_infarto', antpat))
            # Almacenar texto libre en "otra enfermedad crónica"
            agregar(fila(doc, 'pers_otro', antpat))

        if not niega(otrosant):
            existing = next((r for r in filas if r['numero_documento'] == doc and r['pregunta_id'] == Q['pers_otro']), None)
            if existing:
                existing['detalle'] = (existing['detalle'] + ' | ' + otrosant).strip(' | ')
            else:
                agregar(fila(doc, 'pers_otro', otrosant))

        # ── Familiar ─────────────────────────────────────────────────────────
        if not niega(antfami):
            if contiene(antfami, 'DIABET'):
                agregar(si(doc, 'fam_diabetes', antfami))
            if contiene(antfami, 'HIPERT', 'HTA', 'PRESION ALTA'):
                agregar(si(doc, 'fam_hipertension', antfami))
            if contiene(antfami, 'CARDIOP', 'INFARTO', 'CARDIO', 'CORONARIA', 'FALLA CARDIACA'):
                agregar(si(doc, 'fam_cardiaco', antfami))
            if contiene(antfami, 'CANCER', 'CARCINOMA', 'TUMOR', 'LEUCEMIA', 'LINFOMA'):
                agregar(si(doc, 'fam_cancer', antfami))
            if contiene(antfami, 'ALZHEIMER', 'PARKINSON', 'ESQUIZOFREN', 'TRASTORNO MENTAL', 'DEMENCIA'):
                agregar(si(doc, 'fam_mental', antfami))
            if contiene(antfami, 'GENETICA', 'HEREDITARI', 'SINDROME DOWN', 'HEMOFILI'):
                agregar(si(doc, 'fam_hereditaria', antfami))

        # ── Alérgico ─────────────────────────────────────────────────────────
        # anttox contiene nombres de medicamentos a los que es alérgico
        if not niega(anttox):
            agregar(si(doc, 'alerg_medicamento', anttox))
        elif not niega(cualaler):
            agregar(si(doc, 'alerg_medicamento', cualaler))

        # ── Farmacológico ────────────────────────────────────────────────────
        if not niega(antfarma):
            agregar(fila(doc, 'farma_prescripcion', antfarma))

        # ── Quirúrgico ───────────────────────────────────────────────────────
        if not niega(antquir):
            agregar(fila(doc, 'quir_cirugias', antquir))

        # ── Hábitos ──────────────────────────────────────────────────────────

        # Tabaquismo
        tu = fuma_val.upper()
        if not tu or niega(fuma_val):
            tabaco_val = 'Nunca ha fumado'
            tabaco_det = ''
        elif contiene(fuma_val, 'FUE FUMADOR', 'EX FUMADOR', 'EX-FUMADOR', 'DEJÓ', 'DEJO DE FUMAR', 'DURANTE '):
            tabaco_val = 'Ex-fumador'
            tabaco_det = fuma_val
        else:
            tabaco_val = 'Fumador activo'
            tabaco_det = fuma_val
        agregar(fila(doc, 'habito_tabaco', tabaco_val, tabaco_det))

        # Alcohol
        au = alcohol.upper()
        if niega(alcohol):
            alc_val = 'No consume'
        elif contiene(alcohol, 'OCASIONAL'):
            alc_val = 'Ocasional'
        elif contiene(alcohol, 'DIARIO', 'TODOS LOS DIAS', 'CADA DIA'):
            alc_val = 'Diario'
        elif contiene(alcohol, 'SEMANA', 'FINES', '8 DIAS', 'QUINCENAL'):
            alc_val = 'Regular (fines de semana)'
        elif not niega(alcohol):
            alc_val = 'Ocasional'  # "SI" sin más detalle → ocasional
        else:
            alc_val = 'No consume'
        agregar(fila(doc, 'habito_alcohol', alc_val, alcohol if not niega(alcohol) else ''))

        # Actividad física
        eu = ejercicio.upper()
        if niega(ejercicio):
            act_val = 'Sedentario'
        elif contiene(ejercicio, 'CICLISM', 'FUTBOL', 'DEPORT', 'ATLETISM', 'NATACION', 'GYM', 'GIMNASIO'):
            act_val = 'Deportista regular'
        elif contiene(ejercicio, 'MODERADO', '1 HORA', '45 MINUTOS', 'TROTE', 'CORR'):
            act_val = 'Actividad moderada'
        else:
            act_val = 'Actividad leve (caminatas)'
        agregar(fila(doc, 'habito_actividad', act_val, ejercicio if not niega(ejercicio) else ''))

        # Sustancias psicoactivas
        if not niega(alucinogeno):
            agregar(si(doc, 'habito_psicoact', alucinogeno))

        # Dieta especial
        if not niega(dieta):
            agregar(si(doc, 'habito_dieta', dieta))

    return filas, advertencias


# ═══════════════════════════════════════════════════════════════════════════════
# GINECOLÓGICO (cons-gineco.xlsx)
# ═══════════════════════════════════════════════════════════════════════════════

def parsear_numero(val) -> str | None:
    t = s(val)
    if not t:
        return None
    m = re.search(r'\d+', t)
    return m.group(0) if m else None


def parsear_fecha(val) -> str | None:
    t = s(val)
    if not t or niega(t):
        return None
    # Intentar varios formatos
    from datetime import datetime
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%d/%m/%y'):
        try:
            return datetime.strptime(t, fmt).date().isoformat()
        except ValueError:
            pass
    # Si tiene forma "mes/año" o texto libre, devolver el texto original
    if re.search(r'\d{4}', t):
        return t
    return None


def procesar_gineco(header, data) -> tuple[list[dict], list[str]]:
    filas = []
    advertencias = []
    vistos = set()

    def agregar(row_dict: dict):
        key = (row_dict['numero_documento'], row_dict['pregunta_id'])
        if key not in vistos:
            vistos.add(key)
            filas.append(row_dict)

    def idx(col): return header.index(col)

    for row in data:
        doc = s(row[idx('cedgin')])
        if not doc:
            continue

        menarquia   = s(row[idx('ant_menarquia')])
        gestaciones = row[idx('gestaciones')]
        partos      = row[idx('partos')]
        cesareas    = row[idx('cesareas')]
        abortos     = row[idx('abortos')]
        ant_ca      = s(row[idx('ant_ca')])
        planificacion = s(row[idx('ant_planificacion')])
        fuc         = s(row[idx('ant_fuc')])
        pum         = s(row[idx('ant_pum')])
        resulcito   = s(row[idx('resulcito')])

        # Menarquia (numero)
        m = parsear_numero(menarquia)
        if m:
            agregar(fila(doc, 'gineco_menarquia', m))

        # Gestas, partos, cesáreas, abortos (numero)
        for campo, col_val in [
            ('gineco_gestas',    gestaciones),
            ('gineco_partos',    partos),
            ('gineco_cesareas',  cesareas),
            ('gineco_abortos',   abortos),
        ]:
            if col_val is not None and str(col_val).strip() not in ('', '0', '0.0'):
                try:
                    n = int(float(str(col_val)))
                    if n > 0:
                        agregar(fila(doc, campo, str(n)))
                except ValueError:
                    pass

        # Ciclo menstrual (opciones)
        ca = ant_ca.upper()
        if ca and not niega(ant_ca):
            if contiene(ca, 'IRREGULAR', 'IRRREG'):
                ciclo = 'Irregular'
            elif contiene(ca, 'MENOPAUSIA', 'SIN CICLO', 'POST MENO'):
                ciclo = 'Sin ciclo (menopausia o anticonceptivo)'
            else:
                ciclo = 'Regular'
            agregar(fila(doc, 'gineco_ciclo', ciclo, ant_ca))

        # FUM (fecha)
        fecha_pum = parsear_fecha(pum)
        if fecha_pum:
            agregar(fila(doc, 'gineco_fum', fecha_pum))

        # Última citología (fecha)
        fecha_cito = parsear_fecha(fuc)
        if fecha_cito:
            agregar(fila(doc, 'gineco_citologia', fecha_cito, resulcito or ''))

        # Planificación familiar
        if not niega(planificacion):
            agregar(si(doc, 'gineco_planificacion', planificacion))

        # Procedimientos ginecológicos → cirugías previas
        proc_cols = ['ATAS', 'Cauteri', 'radio', 'Letz', 'radiot', 'crio', 'Coniz', 'leep', 'hister']
        nombres_proc = {
            'ATAS': 'ATAS', 'Cauteri': 'Cauterización', 'radio': 'Radioterapia',
            'Letz': 'LEEP/LETZ', 'radiot': 'Radioterapia', 'crio': 'Crioterapia',
            'Coniz': 'Conización', 'leep': 'LEEP', 'hister': 'Histerectomía',
        }
        proc_realizados = []
        for col in proc_cols:
            if col in header:
                val = s(row[idx(col)])
                if val.upper() in ('SI', 'SÍ', '1', 'TRUE', 'YES'):
                    proc_realizados.append(nombres_proc.get(col, col))

        if proc_realizados:
            texto_proc = ', '.join(proc_realizados)
            # Intentar agregar a cirugías existentes
            existing = next((r for r in filas if r['numero_documento'] == doc
                             and r['pregunta_id'] == Q['quir_cirugias']), None)
            if existing:
                existing['valor'] = existing['valor'] + ' | ' + texto_proc
            else:
                agregar(fila(doc, 'quir_cirugias', texto_proc))

    return filas, advertencias


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTAR
# ═══════════════════════════════════════════════════════════════════════════════

COLS = ['id', 'numero_documento', 'pregunta_id', 'valor', 'detalle']


def exportar_csv(filas: list[dict], ruta: str):
    with open(ruta, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLS, extrasaction='ignore')
        w.writeheader()
        w.writerows(filas)
    ruta_abs = str(Path(ruta).resolve()).replace('\\', '/')
    print(f"\nCSV generado: {ruta_abs}  ({len(filas)} filas)")
    print("\nPara cargar en la BD, ejecuta dentro de psql:")
    print()
    print("  SET client_encoding = 'UTF8';")
    print(f"  \\COPY antecedente_respuesta (id,numero_documento,pregunta_id,valor,detalle)"
          f" FROM '{ruta_abs}' CSV HEADER NULL ''")


def dry_run(filas: list[dict]):
    from collections import Counter
    cats = Counter()
    for r in filas:
        for k, v in Q.items():
            if v == r['pregunta_id']:
                cats[k.split('_')[0]] += 1
                break
    print(f"\n[DRY RUN]")
    print(f"  Total filas: {len(filas)}")
    print(f"  Por categoría: {dict(cats)}")
    print("\nMuestra (10 primeras):")
    for r in filas[:10]:
        print(f"  [{r['numero_documento']}] {r['pregunta_id'][:8]}… = {r['valor'][:40]}")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    global EXPORTS
    parser = argparse.ArgumentParser(description='Migración antecedentes Simedic → HCE')
    parser.add_argument('--dir', metavar='DIRECTORIO', default='.',
                        help='Carpeta donde están los xlsx (default: directorio actual)')
    parser.add_argument('--csv', metavar='RUTA', help='Exportar a CSV (ej: antecedentes_migrados.csv)')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    EXPORTS = Path(args.dir)

    print("Leyendo consantceodon.xlsx …")
    h1, d1 = leer('consantceodon.xlsx')
    print(f"  {len(d1)} filas")
    filas1, adv1 = procesar_antecedentes(h1, d1)

    print("Leyendo cons-gineco.xlsx …")
    h2, d2 = leer('cons-gineco.xlsx')
    print(f"  {len(d2)} filas")
    filas2, adv2 = procesar_gineco(h2, d2)

    # Combinar y deduplicar por (numero_documento, pregunta_id).
    # Los de consantceodon tienen prioridad; los de gineco se concatenan si ya existe entrada.
    indice: dict[tuple, dict] = {}
    for r in filas1:
        key = (r['numero_documento'], r['pregunta_id'])
        indice[key] = r

    for r in filas2:
        key = (r['numero_documento'], r['pregunta_id'])
        if key in indice:
            existing = indice[key]
            if r['valor'] not in existing['valor']:
                existing['valor'] = existing['valor'] + ' | ' + r['valor']
        else:
            indice[key] = r

    todas = list(indice.values())
    print(f"\nTotal respuestas a insertar: {len(todas)}")

    if args.dry_run:
        dry_run(todas)
    elif args.csv:
        exportar_csv(todas, args.csv)
    else:
        parser.print_help()
        print("\nIndica --csv RUTA o --dry-run")


if __name__ == '__main__':
    main()
