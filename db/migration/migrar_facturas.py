#!/usr/bin/env python3
"""
Migración de facturas desde Simedic → HCE Consultorio.

Fuentes (RIPS viejo — formato AC/AF):
  tempafrips.xlsx  — AF: cabecera de cada factura (fecha, total)
  tmpacrips.xlsx   — AC: detalle de consulta por factura (paciente, CUPS, valor)

Uso:
    python3 migrar_facturas.py --af tempafrips.xlsx --ac tmpacrips.xlsx --csv facturas_migradas
    python3 migrar_facturas.py --af tempafrips.xlsx --ac tmpacrips.xlsx --dry-run

Carga en la BD (dentro de psql):
    SET client_encoding = 'UTF8';
    \\COPY factura (id,factura_id,numero_version,es_ultima_version,esta_activo,
                   paciente_documento,estado,subtotal,total,creado_por,fecha_creacion)
          FROM '/ruta/facturas_migradas_facturas.csv' CSV HEADER NULL '';
    \\COPY factura_item (id,factura_id,codigo_cups,descripcion,valor_unitario,cantidad,subtotal,orden)
          FROM '/ruta/facturas_migradas_items.csv' CSV HEADER NULL '';

    -- Vincular con encuentros históricos (FIFO por paciente):
    UPDATE factura f SET encuentro_id = (
        SELECT ec.id FROM encuentro_clinico ec
        WHERE ec.paciente_documento = f.paciente_documento
          AND ec.es_ultima_version = TRUE AND ec.esta_activo = TRUE
          AND ec.estado = 'finalizado'
          AND NOT EXISTS (
              SELECT 1 FROM factura f2
              WHERE f2.encuentro_id = ec.id AND f2.es_ultima_version = TRUE
          )
        ORDER BY ec.fecha_atencion ASC LIMIT 1
    )
    WHERE f.encuentro_id IS NULL
      AND f.es_ultima_version = TRUE AND f.esta_activo = TRUE;
"""

import sys, os, argparse, csv, uuid, unicodedata
from datetime import datetime

try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl.  pip3 install openpyxl")


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _quitar_ctrl(v: str) -> str:
    return ''.join(c for c in v if unicodedata.category(c)[0] != 'C' or c in '\t\n\r')


def s(val) -> str | None:
    if val is None:
        return None
    t = _quitar_ctrl(str(val)).strip()
    return t if t else None


def leer_excel(ruta: str):
    print(f"Leyendo {ruta} …")
    wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    ws = wb.active
    filas = list(ws.iter_rows(values_only=True))
    header = [str(h) if h is not None else '' for h in filas[0]]
    data = filas[1:]
    wb.close()
    print(f"  {len(data)} filas.")
    return header, data


def parsear_fecha(val) -> str | None:
    """Acepta DD/MM/YYYY, D/M/YYYY y datetime. Devuelve 'YYYY-MM-DD' o None."""
    if isinstance(val, datetime):
        return val.date().isoformat()
    t = s(val)
    if not t:
        return None
    for fmt in ('%d/%m/%Y', '%d/%m/%y'):
        try:
            return datetime.strptime(t, fmt).date().isoformat()
        except ValueError:
            pass
    # D/M/YYYY sin ceros
    partes = t.split('/')
    if len(partes) == 3:
        try:
            return datetime(int(partes[2]), int(partes[1]), int(partes[0])).date().isoformat()
        except ValueError:
            pass
    return None


def parsear_valor(val) -> float:
    try:
        return max(0.0, float(val)) if val is not None else 0.0
    except (ValueError, TypeError):
        return 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# PARSEO TEMPAFRIPS (AF)
# ═══════════════════════════════════════════════════════════════════════════════
# Formato usrips (CSV separado por coma):
# [0]  NIT_prestador
# [1]  nombre_beneficiario  (nombre paciente o del médico/prestador)
# [2]  tipo_id_beneficiario
# [3]  id_beneficiario      (cédula médico en este export)
# [4]  nro_factura          ← clave de enlace con tmpacrips[0]
# [5]  fecha_elaboracion_factura  (DD/MM/YYYY)
# [6]  fecha_ini_atencion
# [7]  fecha_fin_atencion
# [8]  tipo_usuario
# [9]  nombre_entidad
# [10] nro_contrato
# [11] nro_poliza
# [12] nro_serie
# [13] vr_pagos_compartidos
# [14] vr_cuotas_moderadoras
# [15] vr_desc_pobl_especial
# [16] vr_total_cobros          ← total de la factura

def parsear_tempafrips(header, data) -> dict:
    """Devuelve {nro_factura: {fecha, total}}."""
    idx = header.index('usrips') if 'usrips' in header else 0
    facturas = {}
    for row in data:
        usrips = s(row[idx])
        if not usrips:
            continue
        c = usrips.split(',')
        if len(c) < 5:
            continue
        nro = s(c[4])
        if not nro:
            continue
        total = parsear_valor(c[16]) if len(c) > 16 else 0.0
        fecha = parsear_fecha(c[5]) if len(c) > 5 else None
        facturas[nro] = {'fecha': fecha, 'total': total}
    return facturas


# ═══════════════════════════════════════════════════════════════════════════════
# PARSEO TMPACRIPS (AC)
# ═══════════════════════════════════════════════════════════════════════════════
# Formato usrips:
# [0]  nro_factura         ← clave de enlace con tempafrips[4]
# [1]  NIT_prestador
# [2]  tipo_doc_paciente
# [3]  doc_paciente        ← documento del paciente
# [4]  fecha_consulta      (D/M/YYYY)
# [5]  nro_autorizacion
# [6]  cod_cups
# [7]  finalidad_consulta
# [8]  causa_externa
# [9]  cod_diag_principal
# [10] tipo_diag_principal
# [11] cod_diag_rel1
# [12] cod_diag_rel2
# [13] num_consultas_prestados
# [14] vr_servicio         ← valor cobrado
# [15] copago_cuota_moderadora
# [16] vr_neto_cobrar

def parsear_tmpacrips(header, data) -> list[dict]:
    """Devuelve lista de items de consulta."""
    idx = header.index('usrips') if 'usrips' in header else 0
    items = []
    for row in data:
        usrips = s(row[idx])
        if not usrips:
            continue
        c = usrips.split(',')
        if len(c) < 6:
            continue
        nro = s(c[0])
        doc = s(c[3])
        if not nro or not doc:
            continue
        cups = s(c[6]) if len(c) > 6 else ''
        items.append({
            'nro_factura':  nro,
            'tipo_doc':     s(c[2]) or 'CC',
            'doc_paciente': doc,
            'fecha':        parsear_fecha(c[4]) if len(c) > 4 else None,
            'cups':         cups or '',
            'valor':        parsear_valor(c[14]) if len(c) > 14 else 0.0,
        })
    return items


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSFORMACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

CUPS_DESC = {
    '890101': 'Consulta médica general',
    '890201': 'Consulta de primera vez',
    '890301': 'Consulta de control / seguimiento',
    '890302': 'Consulta control',
    '890308': 'Consulta control',
    '890310': 'Consulta control especializada',
    '954107': 'Procedimiento médico',
    '931000': 'Procedimiento diagnóstico',
}


def transformar(af: dict, ac: list[dict]) -> tuple[list[dict], list[dict], list[str]]:
    facturas_out = []
    items_out = []
    advertencias = []

    # Agrupar items por nro_factura
    por_factura: dict[str, list[dict]] = {}
    for it in ac:
        por_factura.setdefault(it['nro_factura'], []).append(it)

    for nro, grupo in sorted(por_factura.items()):
        primer = grupo[0]
        doc    = primer['doc_paciente']
        fecha_serv = primer['fecha']

        af_info = af.get(nro)
        fecha   = (af_info['fecha'] if af_info and af_info['fecha'] else None) or fecha_serv
        if not fecha:
            advertencias.append(f"  factura {nro} (doc {doc}): sin fecha — omitida")
            continue

        # Total: preferir el del AF; si es 0 sumar los items
        total_items = sum(it['valor'] for it in grupo)
        total = af_info['total'] if af_info and af_info['total'] > 0 else total_items

        # Advertir si hay docs distintos en la misma factura
        docs = {it['doc_paciente'] for it in grupo}
        if len(docs) > 1:
            advertencias.append(
                f"  factura {nro}: múltiples pacientes {docs} — se usa {doc}"
            )

        fac_uuid = str(uuid.uuid4())

        facturas_out.append({
            'id':                 fac_uuid,
            'factura_id':         fac_uuid,
            'numero_version':     1,
            'es_ultima_version':  True,
            'esta_activo':        True,
            'paciente_documento': doc,
            'estado':             'activa',
            'subtotal':           round(total, 2),
            'total':              round(total, 2),
            'creado_por':         'migracion',
            'fecha_creacion':     fecha + 'T00:00:00Z',
        })

        for i, it in enumerate(grupo):
            cups     = it['cups']
            desc_cup = CUPS_DESC.get(cups, cups) if cups else 'Servicio'
            desc     = f"{desc_cup} ({cups})" if cups and cups not in CUPS_DESC else desc_cup
            val      = round(it['valor'], 2)

            items_out.append({
                'id':            str(uuid.uuid4()),
                'factura_id':    fac_uuid,
                'codigo_cups':   '',           # vacío → NULL via COPY NULL ''
                'descripcion':   desc,
                'valor_unitario': val,
                'cantidad':      1,
                'subtotal':      val,
                'orden':         i + 1,
            })

    return facturas_out, items_out, advertencias


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTAR CSV
# ═══════════════════════════════════════════════════════════════════════════════

COLS_FACTURA = [
    'id', 'factura_id', 'numero_version', 'es_ultima_version', 'esta_activo',
    'paciente_documento', 'estado', 'subtotal', 'total', 'creado_por', 'fecha_creacion',
]
COLS_ITEM = [
    'id', 'factura_id', 'codigo_cups', 'descripcion',
    'valor_unitario', 'cantidad', 'subtotal', 'orden',
]


def exportar_csv(facturas, items, advertencias, prefijo: str):
    ruta_fac   = prefijo + '_facturas.csv'
    ruta_items = prefijo + '_items.csv'

    with open(ruta_fac, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLS_FACTURA, extrasaction='ignore')
        w.writeheader()
        w.writerows(facturas)

    with open(ruta_items, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLS_ITEM, extrasaction='ignore')
        w.writeheader()
        w.writerows(items)

    if advertencias:
        ruta_log = prefijo + '_advertencias.log'
        with open(ruta_log, 'w', encoding='utf-8') as f:
            f.write('\n'.join(advertencias))
        print(f"  Log: {ruta_log}")

    abs_fac   = os.path.abspath(ruta_fac).replace('\\', '/')
    abs_items = os.path.abspath(ruta_items).replace('\\', '/')

    print(f"\nCSV generados:")
    print(f"  {ruta_fac}  ({len(facturas)} facturas)")
    print(f"  {ruta_items}  ({len(items)} items)")
    print()
    print("Para cargar en la BD (en psql):")
    print()
    print("  SET client_encoding = 'UTF8';")
    fac_cols  = ','.join(COLS_FACTURA)
    item_cols = ','.join(COLS_ITEM)
    print(f"  \\COPY factura ({fac_cols})")
    print(f"    FROM '{abs_fac}' CSV HEADER NULL '';")
    print()
    print(f"  \\COPY factura_item ({item_cols})")
    print(f"    FROM '{abs_items}' CSV HEADER NULL '';")
    print()
    print("Luego para vincular facturas con encuentros (FIFO por paciente):")
    print("  UPDATE factura f SET encuentro_id = (")
    print("    SELECT ec.id FROM encuentro_clinico ec")
    print("    WHERE ec.paciente_documento = f.paciente_documento")
    print("      AND ec.es_ultima_version = TRUE AND ec.esta_activo = TRUE")
    print("      AND ec.estado = 'finalizado'")
    print("      AND NOT EXISTS (")
    print("          SELECT 1 FROM factura f2")
    print("          WHERE f2.encuentro_id = ec.id AND f2.es_ultima_version = TRUE)")
    print("    ORDER BY ec.fecha_atencion ASC LIMIT 1")
    print("  )")
    print("  WHERE f.encuentro_id IS NULL")
    print("    AND f.es_ultima_version = TRUE AND f.esta_activo = TRUE;")


def dry_run(facturas, items, advertencias):
    print(f"\n[DRY RUN] — nada escrito.")
    print(f"  Facturas:     {len(facturas)}")
    print(f"  Items:        {len(items)}")
    print(f"  Advertencias: {len(advertencias)}")
    print()
    print("Muestra (primeras 5 facturas):")
    for fac in facturas[:5]:
        print(f"  [{fac['paciente_documento']}] {fac['fecha_creacion'][:10]}  total={fac['total']}")
    if advertencias:
        print("\nAdvertencias:")
        for a in advertencias[:10]:
            print(f"  {a}")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='Migración de facturas Simedic → HCE')
    parser.add_argument('--af', required=True, metavar='tempafrips.xlsx',
                        help='Archivo AF RIPS: cabecera de facturas')
    parser.add_argument('--ac', required=True, metavar='tmpacrips.xlsx',
                        help='Archivo AC RIPS: detalle de consultas por factura')
    parser.add_argument('--csv', metavar='PREFIJO',
                        help='Exportar CSVs con este prefijo (p.ej. facturas_migradas)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Solo estadísticas, sin escribir archivos')
    args = parser.parse_args()

    for ruta in [args.af, args.ac]:
        if not os.path.exists(ruta):
            sys.exit(f"Archivo no encontrado: {ruta}")

    af_header, af_data = leer_excel(args.af)
    ac_header, ac_data = leer_excel(args.ac)

    af_dict = parsear_tempafrips(af_header, af_data)
    ac_list = parsear_tmpacrips(ac_header, ac_data)

    facturas, items, advertencias = transformar(af_dict, ac_list)

    print(f"\n  Facturas generadas: {len(facturas)}")
    print(f"  Items totales:      {len(items)}")

    if args.dry_run:
        dry_run(facturas, items, advertencias)
    elif args.csv:
        exportar_csv(facturas, items, advertencias, args.csv)
    else:
        parser.print_help()
        print("\nIndica --csv PREFIJO o --dry-run")


if __name__ == '__main__':
    main()
