import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'

// Palabras sin espacios (p.ej. test con X's o URLs) igual hacen wrap
Font.registerHyphenationCallback(word =>
  word.length > 14 ? Array.from(word) : [word]
)
import type { DatosMedico } from '../../context/MedicoContext'
import type { Paciente } from '../../api/pacientes'
import type { Encuentro, ValorNormalNotas } from '../../api/encuentros'
import type { CampoClinico } from '../../api/campos_clinicos'
import type { AntecedentesCompletos, ListaCampo } from '../../api/antecedentes'
import type { FormulaGuardada } from '../../api/formulas'
import type { OrdenExamen } from '../../api/ordenes_examen'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function fmtLarga(iso: string) {
  const d = new Date(iso)
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

function fmtCorta(iso: string) {
  const d = new Date(iso)
  const h = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  return `${fmtLarga(iso)} · ${h}`
}

const TIPO_CLINICO: Record<string, string> = {
  '01': 'Impresión diagnóstica',
  '02': 'Confirmado nuevo',
  '03': 'Confirmado repetido',
}

const DX_TIPO: Record<string, string> = {
  impresion:  'Impresión',
  principal:  'Principal',
  relacionado:'Relacionado',
  secundario: 'Secundario',
}

const CATEGORIA_LABEL: Record<string, string> = {
  personales:             'Personales / Patológicos',
  personales_patologicos: 'Personales / Patológicos',
  familiares:             'Familiares',
  alergicos:              'Alérgicos',
  alergias:               'Alérgicos',
  toxicos:                'Tóxicos',
  toxicologicos:          'Tóxicos',
  gineco_obstetricos:     'Gineco-obstétricos',
  ginecologicos:          'Ginecológicos',
  habitos:                'Hábitos',
  farmacologicos:         'Farmacológicos',
  quirurgicos:            'Quirúrgicos',
  traumaticos:            'Traumáticos',
  psicologicos:           'Psicológicos',
}

function catLabel(k: string) {
  return CATEGORIA_LABEL[k] ?? k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g,' ')
}

function extractClinico(rs: Record<string, unknown>, clave: string) {
  const raw = rs[clave]
  if (raw == null) return null
  if (typeof raw === 'string') {
    if (!raw.trim()) return null
    const notas = rs[`${clave}_notas`]
    return { estado: raw, detalle: typeof notas === 'string' && notas.trim() ? notas.trim() : undefined }
  }
  if (typeof raw === 'object' && 'normal' in (raw as object)) {
    const v = raw as ValorNormalNotas
    return { estado: v.normal ? 'Normal' : 'Anormal', detalle: v.notas?.trim() || undefined }
  }
  return null
}

function estadoColor(s: string) {
  const l = s.toLowerCase()
  if (l === 'normal' || l === 'niega') return '#16a34a'
  if (l === 'anormal' || l === 'refiere') return '#d97706'
  return '#64748b'
}

function imcDe(sv: Record<string, string>) {
  const p = parseFloat(sv['peso'] ?? ''), t = parseFloat(sv['talla'] ?? '')
  if (!p || !t || t <= 0) return null
  const v = Math.round((p / Math.pow(t / 100, 2)) * 10) / 10
  const alerta = v < 18.5 ? 'bajo peso' : v >= 30 ? 'obesidad' : v >= 25 ? 'sobrepeso' : ''
  return { v, alerta }
}

// ── Props ─────────────────────────────────────────────────────────────────────

export type HistoriaClinicaProps = {
  medico: DatosMedico
  paciente: Paciente
  encuentro: Encuentro
  campos: CampoClinico[]
  antecedentes: AntecedentesCompletos
  formulas: FormulaGuardada[]
  ordenes?: OrdenExamen[]
  fechaImpresion?: string
  tamano?: string | [number, number]
  colorPrimario?: string
  logoBase64?: string | null
  logoTextoBase64?: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HistoriaClinicaPDF({
  medico, paciente, encuentro, campos, antecedentes, formulas, ordenes = [],
  fechaImpresion, tamano = 'LETTER', colorPrimario = '#1d4ed8', logoBase64 = null, logoTextoBase64 = null,
}: HistoriaClinicaProps) {
  const PRIMARY = colorPrimario
  const LOGO_W  = 60

  const s = StyleSheet.create({
    page: {
      paddingHorizontal: 48,
      paddingVertical: 36,
      // Reserva espacio para el footer fijo (ver estilo `footer`). El footer ya solo
      // lleva el aviso legal fijo (no datos variables del médico), así que su alto
      // máximo es acotado incluso en el formato más angosto soportado (MediaCarta,
      // 396pt de ancho) — 36pt cubre ~3-4 líneas envueltas con margen de sobra.
      paddingBottom: 52,
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#0f172a',
      backgroundColor: '#ffffff',
    },

    // ── Header ────────────────────────────────────────────────────────────────
    marcaAgua: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center', justifyContent: 'center', opacity: 0.07,
    },
    marcaAguaImg: { width: 320, height: 320, objectFit: 'contain' },
    header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    logoBox: { width: LOGO_W, marginRight: 12 },
    logoImg: { width: LOGO_W, height: LOGO_W, objectFit: 'contain' },
    logoPlaceholder: {
      width: LOGO_W, height: LOGO_W,
      borderWidth: 1, borderColor: '#e2e8f0',
      borderStyle: 'dashed', borderRadius: 4,
    },
    headerInfo: { flex: 1 },
    headerConsultorio: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: PRIMARY, marginBottom: 2 },
    headerSub: { fontSize: 8, color: '#374151', marginBottom: 1 },

    dividerAccent: { borderBottomWidth: 2, borderBottomColor: PRIMARY, marginBottom: 12 },
    divider: { borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', marginVertical: 10 },

    // ── Título ────────────────────────────────────────────────────────────────
    titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 2 },
    titulo: { fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 1, color: '#0f172a' },
    refLabel: { fontSize: 7, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
    refValor: { fontSize: 8, color: '#475569', textAlign: 'right' },
    subtituloDoc: { fontSize: 8, color: '#4b5563', marginBottom: 10 },

    // ── Dos columnas (paciente / médico) ──────────────────────────────────────
    dualCol: { flexDirection: 'row', gap: 16, marginBottom: 4 },
    col: { flex: 1 },
    colLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    colNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    colSub: { fontSize: 8, color: '#374151', marginBottom: 1 },
    colDoc: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginBottom: 1 },
    colSubDark: { fontSize: 8, color: '#334155', marginBottom: 1 },

    // ── Sección genérica ──────────────────────────────────────────────────────
    seccionTitulo: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    bodyText: { fontSize: 8.5, color: '#0f172a', lineHeight: 1.5 },

    // ── Antecedentes ──────────────────────────────────────────────────────────
    antRow: { flexDirection: 'row', marginBottom: 5 },
    antCat: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#475569', width: 112, paddingTop: 1 },
    antBullets: { flex: 1 },
    antLine: { flexDirection: 'row', marginBottom: 1.5 },
    antDot: { fontSize: 8, color: '#6b7280', marginRight: 4 },
    antText: { fontSize: 8, color: '#0f172a', flex: 1, lineHeight: 1.4, flexShrink: 1 },

    // ── Encuentro meta ────────────────────────────────────────────────────────
    encMetaRow: { flexDirection: 'row', gap: 24, marginBottom: 10 },
    encMetaCelda: { flex: 1 },
    encMetaLabel: { fontSize: 7, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    encMetaValor: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
    encMetaSub: { fontSize: 8, color: '#374151' },

    // ── Signos vitales ────────────────────────────────────────────────────────
    svLinea: { fontSize: 8.5, color: '#0f172a', lineHeight: 1.6, marginBottom: 1 },

    // ── Tabla clínica (rev / examen) ──────────────────────────────────────────
    tablaHeader: {
      flexDirection: 'row', backgroundColor: '#f8fafc',
      paddingVertical: 5, paddingHorizontal: 6,
      borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#e2e8f0',
    },
    tablaFila: {
      flexDirection: 'row',
      paddingVertical: 5, paddingHorizontal: 6,
      borderBottomWidth: 0.5, borderColor: '#f1f5f9',
    },
    thItem:    { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', flex: 2 },
    thEstado:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', width: 72 },
    thDetalle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', flex: 3 },
    tdItem:    { fontSize: 8.5, color: '#0f172a', flex: 2, flexShrink: 1 },
    tdEstado:  { fontSize: 8, fontFamily: 'Helvetica-Bold', width: 72, flexShrink: 0 },
    tdDetalle: { fontSize: 8, color: '#374151', flex: 3, lineHeight: 1.4, flexShrink: 1 },

    // ── Diagnósticos ──────────────────────────────────────────────────────────
    dxHeader: {
      flexDirection: 'row', backgroundColor: '#f8fafc',
      paddingVertical: 5, paddingHorizontal: 6,
      borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#e2e8f0',
    },
    dxFila: {
      flexDirection: 'row', alignItems: 'flex-start',
      paddingVertical: 5, paddingHorizontal: 6,
      borderBottomWidth: 0.5, borderColor: '#f1f5f9',
    },
    thDxTipo:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', width: 70 },
    thDxCod:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', width: 48 },
    thDxNom:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', flex: 1 },
    thDxClin:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', width: 110, textAlign: 'right' },
    tdDxTipo:  { width: 70, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569' },
    tdDxCod:   { width: 48, fontSize: 8, fontFamily: 'Helvetica-Bold', color: PRIMARY },
    tdDxNom:   { flex: 1, fontSize: 8.5, color: '#0f172a', lineHeight: 1.4, flexShrink: 1 },
    tdDxClin:  { width: 110, fontSize: 8, color: '#374151', textAlign: 'right', flexShrink: 0 },

    // ── Medicamentos ──────────────────────────────────────────────────────────
    med: { marginBottom: 10, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: `${PRIMARY}40` },
    medNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 1.5, flexShrink: 1 },
    medDetalle: { fontSize: 8, color: '#334155', marginBottom: 1, flexShrink: 1 },
    medNota: { fontSize: 7.5, color: '#374151', fontStyle: 'italic', flexShrink: 1 },

    // ── Órdenes de examen ─────────────────────────────────────────────────────
    ordenBloque: { marginBottom: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: `${PRIMARY}40` },
    ordenFecha: { fontSize: 7.5, color: '#374151', marginBottom: 3 },
    ordenItem: { flexDirection: 'row', marginBottom: 2 },
    ordenCups: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: PRIMARY, width: 54, flexShrink: 0 },
    ordenDesc: { fontSize: 8.5, color: '#0f172a', flex: 1, lineHeight: 1.4, flexShrink: 1 },
    ordenInd: { fontSize: 7.5, color: '#374151', fontStyle: 'italic', flexShrink: 1 },
    ordenGeneral: { fontSize: 7.5, color: '#475569', fontStyle: 'italic', marginTop: 3 },

    // ── Firma ─────────────────────────────────────────────────────────────────
    pie: { marginTop: 24, flexDirection: 'row', justifyContent: 'flex-end' },
    firmaBloque: { alignItems: 'center', width: 180 },
    firmaImagen: { width: 140, height: 56, objectFit: 'contain', marginBottom: 4 },
    firmaLinea: { width: 160, borderBottomWidth: 1, borderBottomColor: '#0f172a', marginBottom: 4 },
    firmaNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    firmaTP: { fontSize: 7, color: '#374151', textAlign: 'center' },

    // ── Footer ────────────────────────────────────────────────────────────────
    footer: {
      position: 'absolute', bottom: 16, left: 48, right: 48,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
      borderTopWidth: 0.5, borderTopColor: '#e2e8f0', paddingTop: 4,
    },
    footerLegal: { fontSize: 6.5, color: '#6b7280', flex: 1, lineHeight: 1.35 },
    footerPag: { fontSize: 7, color: '#6b7280', marginLeft: 8 },
  })

  // ── Datos pre-computados ─────────────────────────────────────────────────

  const nombrePaciente = [
    paciente.nombre_primero, paciente.nombre_segundo,
    paciente.apellido_primero, paciente.apellido_segundo,
  ].filter(Boolean).join(' ')

  const contactoConsultorio = [
    medico.ciudad, medico.direccion, medico.telefono, medico.correoElectronico,
  ].filter(Boolean).join(' · ')

  const camposSignos   = campos.filter(c => c.seccion === 'signos_vitales')
  const camposRevision = campos.filter(c => c.seccion === 'revision_sistemas')
  const camposExamen   = campos.filter(c => c.seccion === 'examen_fisico')
  const sv = (encuentro.signos_vitales ?? {}) as Record<string, string>

  // Signos vitales chips
  const rendered = new Set<string>()
  type Chip = { key: string; valor: string; nombre: string; alerta?: string }
  const svChips: Chip[] = []
  for (const c of camposSignos) {
    if (rendered.has(c.clave) || !sv[c.clave]) continue
    rendered.add(c.clave)
    if (c.clave === 'ta_sistolica' && sv['ta_diastolica']) {
      rendered.add('ta_diastolica')
      svChips.push({ key: 'ta', valor: `${sv['ta_sistolica']} / ${sv['ta_diastolica']}`, nombre: 'TA mmHg' })
      continue
    }
    svChips.push({ key: c.clave, valor: `${sv[c.clave]}${c.unidad ? ` ${c.unidad}` : ''}`, nombre: c.nombre })
  }
  const imc = imcDe(sv)
  if (imc) svChips.push({ key: 'imc', valor: `${imc.v} kg/m²`, nombre: 'IMC', alerta: imc.alerta || undefined })

  // Diagnósticos (excluye notas — solo internas)
  const diagnosticos = (encuentro.diagnosticos ?? []).filter(d => d.tipo !== 'nota')

  // Antecedentes con respuestas
  const antConDatos = Object.entries(antecedentes).map(([cat, pregs]) => ({
    cat,
    pregs: pregs.filter(p => {
      if (!p.valor) return false
      return p.tipo_respuesta === 'booleano' ? p.valor === 'true' : !!p.valor.trim()
    }),
  })).filter(x => x.pregs.length > 0)

  // Revisión y examen
  const rs = (encuentro.revision_sistemas ?? {}) as Record<string, unknown>
  const ef = (encuentro.examen_fisico ?? {}) as Record<string, unknown>

  const filasRevision = camposRevision
    .map(c => ({ c, d: extractClinico(rs, c.clave) }))
    .filter(x => x.d !== null) as { c: CampoClinico; d: NonNullable<ReturnType<typeof extractClinico>> }[]

  const filasExamen = camposExamen
    .map(c => {
      if (c.tipo === 'texto') {
        const val = ef[c.clave]
        if (typeof val !== 'string' || !val.trim()) return null
        return { c, estado: '', detalle: val.trim(), isTexto: true }
      }
      const d = extractClinico(ef, c.clave)
      if (!d) return null
      return { c, estado: d.estado, detalle: d.detalle ?? '', isTexto: false }
    })
    .filter(Boolean) as { c: CampoClinico; estado: string; detalle: string; isTexto: boolean }[]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Document>
      <Page size={tamano as any} style={s.page}>

        {logoBase64 && (
          <View fixed style={s.marcaAgua}>
            <Image src={logoBase64} style={s.marcaAguaImg} />
          </View>
        )}

        {/* Footer fijo con paginación — solo texto legal fijo y acotado; los datos
            de contacto del médico (largo variable) van en el encabezado, no aquí,
            para no arriesgar overlap con el paddingBottom reservado de la página */}
        <View fixed style={s.footer}>
          <Text style={s.footerLegal}>
            Documento confidencial · Res. 1995/1999 y 2275/2023 Min. Salud · reproducción requiere autorización del paciente
          </Text>
          <Text style={s.footerPag}
            render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`}
          />
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            {logoBase64
              ? <Image src={logoBase64} style={s.logoImg} />
              : <View style={s.logoPlaceholder} />}
          </View>
          <View style={s.headerInfo}>
            {logoTextoBase64
              ? <Image src={logoTextoBase64} style={{ height: 28, maxWidth: 240, objectFit: 'contain', alignSelf: 'flex-start', marginBottom: 2 }} />
              : <Text style={s.headerConsultorio}>{medico.nombreConsultorio || 'Consultorio Médico'}</Text>
            }
            {medico.especialidad ? <Text style={s.headerSub}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.headerSub}>TP {medico.tarjetaProfesional}</Text> : null}
            {medico.universidad ? <Text style={s.headerSub}>{medico.universidad}</Text> : null}
            {medico.nit ? <Text style={s.headerSub}>NIT {medico.nit}</Text> : null}
            {medico.codPrestador ? <Text style={s.headerSub}>Habilitación {medico.codPrestador}</Text> : null}
            {contactoConsultorio ? <Text style={s.headerSub}>{contactoConsultorio}</Text> : null}
          </View>
        </View>

        <View style={s.dividerAccent} />

        {/* Título */}
        <View style={s.titleRow}>
          <Text style={s.titulo}>HISTORIA CLÍNICA</Text>
          <View>
            <Text style={s.refLabel}>Ref. paciente</Text>
            <Text style={s.refValor}>HC-{paciente.numero_documento}</Text>
          </View>
        </View>
        <Text style={s.subtituloDoc}>
          {`Fecha de atención: ${fmtLarga(encuentro.fecha_atencion)}`}
          {fechaImpresion ? `   ·   Fecha de impresión: ${fechaImpresion}` : ''}
        </Text>

        <View style={s.divider} />

        {/* Paciente + Médico */}
        <View style={s.dualCol}>
          <View style={s.col}>
            <Text style={s.colLabel}>Paciente</Text>
            <Text style={s.colNombre}>{nombrePaciente}</Text>
            <Text style={s.colDoc}>
              {paciente.tipo_documento} {paciente.numero_documento}
              {` · ${paciente.edad} años · ${paciente.genero_nombre}`}
            </Text>
            {(paciente.grupo_sanguineo || paciente.rh_factor)
              ? <Text style={s.colSub}>{[paciente.grupo_sanguineo, paciente.rh_factor ? `Rh${paciente.rh_factor}` : ''].filter(Boolean).join(' ')}</Text>
              : null}
            {paciente.estado_civil_nombre ? <Text style={s.colSub}>{paciente.estado_civil_nombre}</Text> : null}
            {paciente.nivel_escolaridad_nombre ? <Text style={s.colSub}>{paciente.nivel_escolaridad_nombre}</Text> : null}
            {paciente.tipo_usuario_nombre
              ? <Text style={s.colSub}>{paciente.tipo_usuario_nombre}{paciente.codigo_eps ? ` · EPS ${paciente.codigo_eps}` : ''}</Text>
              : null}
            {paciente.codigo_municipio_residencia
              ? <Text style={s.colSub}>{paciente.codigo_municipio_residencia} · Zona {paciente.zona_residencia_nombre}</Text>
              : null}
            {paciente.telefono ? <Text style={s.colSub}>{paciente.telefono}</Text> : null}
            {paciente.correo_electronico ? <Text style={s.colSub}>{paciente.correo_electronico}</Text> : null}
          </View>
          <View style={s.col}>
            <Text style={s.colLabel}>Profesional tratante</Text>
            <Text style={s.colNombre}>{medico.nombre || 'Médico tratante'}</Text>
            {medico.especialidad ? <Text style={s.colSub}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.colSub}>TP {medico.tarjetaProfesional}</Text> : null}
            {paciente.nombre_responsable
              ? <>
                  <Text style={[s.colLabel, { marginTop: 10 }]}>Responsable</Text>
                  <Text style={s.colSubDark}>{paciente.nombre_responsable}</Text>
                  {paciente.parentesco_responsable ? <Text style={s.colSub}>{paciente.parentesco_responsable}</Text> : null}
                  {paciente.telefono_responsable ? <Text style={s.colSub}>{paciente.telefono_responsable}</Text> : null}
                </>
              : null}
          </View>
        </View>

        {/* Antecedentes */}
        {antConDatos.length > 0 ? (
          <>
            <View style={s.divider} />
            <Text style={s.seccionTitulo}>Antecedentes</Text>
            {antConDatos.map(({ cat, pregs }) => (
              <View key={cat} style={s.antRow} wrap={false}>
                <Text style={s.antCat}>{catLabel(cat)}</Text>
                <View style={s.antBullets}>
                  {pregs.map(p => {
                    if (p.tipo_respuesta === 'lista') {
                      let items: Record<string, string>[] = []
                      try { items = JSON.parse(p.valor ?? '[]') } catch {}
                      if (items.length === 0) return null
                      const listaCampos = (Array.isArray(p.opciones) && p.opciones.length > 0 && typeof p.opciones[0] === 'object' && 'campo' in (p.opciones[0] as object))
                        ? (p.opciones as ListaCampo[])
                        : []
                      return (
                        <View key={p.id}>
                          <View style={s.antLine}>
                            <Text style={s.antDot}>·</Text>
                            <Text style={[s.antText, { fontFamily: 'Helvetica-Bold' }]}>{p.texto}:</Text>
                          </View>
                          {items.map((item, i) => (
                            <View key={i} style={[s.antLine, { paddingLeft: 12 }]}>
                              <Text style={s.antDot}>{'–'}</Text>
                              <Text style={s.antText}>
                                {listaCampos.length > 0
                                  ? listaCampos.map(c => item[c.campo]).filter(Boolean).join(' · ')
                                  : Object.values(item).filter(Boolean).join(' · ')}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )
                    }
                    const linea = p.tipo_respuesta === 'booleano'
                      ? (p.detalle?.trim() || p.texto)
                      : `${p.texto}: ${p.valor}${p.detalle?.trim() ? ` — ${p.detalle.trim()}` : ''}`
                    return (
                      <View key={p.id} style={s.antLine}>
                        <Text style={s.antDot}>·</Text>
                        <Text style={s.antText}>{linea}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            ))}
          </>
        ) : null}

        <View style={s.divider} />

        {/* Encuentro — meta */}
        <Text style={s.seccionTitulo}>Consulta</Text>
        <View style={s.encMetaRow}>
          <View style={s.encMetaCelda}>
            <Text style={s.encMetaLabel}>Fecha y hora</Text>
            <Text style={s.encMetaValor}>{fmtCorta(encuentro.fecha_atencion)}</Text>
          </View>
          <View style={s.encMetaCelda}>
            <Text style={s.encMetaLabel}>Finalidad</Text>
            <Text style={s.encMetaValor}>{encuentro.finalidad_consulta_nombre}</Text>
          </View>
          <View style={s.encMetaCelda}>
            <Text style={s.encMetaLabel}>Causa externa</Text>
            <Text style={s.encMetaValor}>{encuentro.causa_externa_nombre}</Text>
          </View>
        </View>

        {/* Motivo */}
        {encuentro.motivo_consulta ? (
          <>
            <Text style={s.seccionTitulo}>Motivo de consulta</Text>
            <View style={{ marginBottom: 6 }}><Text style={s.bodyText}>{encuentro.motivo_consulta}</Text></View>
          </>
        ) : null}

        {/* Descripción general */}
        {encuentro.descripcion_ingreso ? (
          <>
            <Text style={s.seccionTitulo}>Descripción general</Text>
            <View style={{ marginBottom: 6 }}><Text style={s.bodyText}>{encuentro.descripcion_ingreso}</Text></View>
          </>
        ) : null}

        {/* Signos vitales */}
        {svChips.length > 0 ? (
          <>
            <Text style={s.seccionTitulo}>Signos vitales</Text>
            <View style={{ marginBottom: 6 }}>
              {svChips.map(chip => (
                <Text key={chip.key} style={s.svLinea}>
                  {chip.nombre}: {chip.valor}{chip.alerta ? ` (${chip.alerta})` : ''}
                </Text>
              ))}
            </View>
          </>
        ) : null}

        {/* Revisión por sistemas */}
        {filasRevision.length > 0 ? (
          <>
            <Text style={s.seccionTitulo}>Revisión por sistemas</Text>
            <View style={s.tablaHeader}>
              <Text style={s.thItem}>Sistema</Text>
              <Text style={s.thEstado}>Estado</Text>
              <Text style={s.thDetalle}>Hallazgos</Text>
            </View>
            {filasRevision.map(({ c, d }) => (
              <View key={c.clave} style={s.tablaFila}>
                <Text style={s.tdItem}>{c.nombre}</Text>
                <Text style={[s.tdEstado, { color: estadoColor(d.estado) }]}>{d.estado}</Text>
                <Text style={s.tdDetalle}>{d.detalle ?? ''}</Text>
              </View>
            ))}
          </>
        ) : null}

        {/* Examen físico */}
        {filasExamen.length > 0 ? (
          <>
            <Text style={[s.seccionTitulo, { marginTop: 8 }]}>Examen físico</Text>
            <View style={s.tablaHeader}>
              <Text style={s.thItem}>Segmento</Text>
              <Text style={s.thEstado}>Estado</Text>
              <Text style={s.thDetalle}>Hallazgo / Detalle</Text>
            </View>
            {filasExamen.map(({ c, estado, detalle, isTexto }) => (
              <View key={c.clave} style={s.tablaFila}>
                <Text style={s.tdItem}>{c.nombre}</Text>
                <Text style={[s.tdEstado, { color: isTexto ? '#94a3b8' : estadoColor(estado) }]}>
                  {isTexto ? '' : estado}
                </Text>
                <Text style={s.tdDetalle}>{detalle}</Text>
              </View>
            ))}
          </>
        ) : null}

        {/* Análisis */}
        {encuentro.plan_manejo ? (
          <>
            <Text style={[s.seccionTitulo, { marginTop: 8 }]}>Análisis</Text>
            <View style={{ marginBottom: 6 }}><Text style={s.bodyText}>{encuentro.plan_manejo}</Text></View>
          </>
        ) : null}

        {/* Diagnósticos */}
        {diagnosticos.length > 0 ? (
          <>
            <Text style={[s.seccionTitulo, { marginTop: 8 }]}>Diagnósticos</Text>
            <View style={s.dxHeader}>
              <Text style={s.thDxTipo}>Tipo</Text>
              <Text style={s.thDxCod}>Código</Text>
              <Text style={s.thDxNom}>Descripción</Text>
              <Text style={s.thDxClin}>Tipo clínico</Text>
            </View>
            {diagnosticos.map((d, i) => (
              <View key={i} style={s.dxFila}>
                <Text style={s.tdDxTipo}>{DX_TIPO[d.tipo] ?? d.tipo}</Text>
                <Text style={s.tdDxCod}>{d.codigo ?? ''}</Text>
                <Text style={s.tdDxNom}>{d.descripcion}</Text>
                <Text style={s.tdDxClin}>{d.tipo_clinico ? (TIPO_CLINICO[d.tipo_clinico] ?? '') : ''}</Text>
              </View>
            ))}
          </>
        ) : encuentro.codigo_diagnostico_principal ? (
          <>
            <Text style={[s.seccionTitulo, { marginTop: 8 }]}>Diagnóstico principal</Text>
            <View><Text style={s.bodyText}>
              {encuentro.codigo_diagnostico_principal}
              {encuentro.descripcion_diagnostico ? `  ${encuentro.descripcion_diagnostico}` : ''}
            </Text></View>
          </>
        ) : null}

        {/* Fórmula médica */}
        {formulas.length > 0 ? (
          <>
            <Text style={[s.seccionTitulo, { marginTop: 8 }]}>Fórmula médica</Text>
            {formulas.flatMap((f, fi) =>
              f.medicamentos.map((m, mi) => (
                <View key={`${fi}-${mi}`} style={s.med}>
                  <Text style={s.medNombre}>
                    {m.nombre_medicamento}
                    {m.concentracion ? ` ${m.concentracion}` : ''}
                    {m.forma_farmaceutica ? ` — ${m.forma_farmaceutica}` : ''}
                  </Text>
                  <Text style={s.medDetalle}>
                    {[m.dosis, m.frecuencia, m.duracion_tratamiento ? `por ${m.duracion_tratamiento}` : ''].filter(Boolean).join(' · ')}
                    {m.cantidad_dispensar ? `  ·  Cantidad: ${m.cantidad_dispensar}` : ''}
                  </Text>
                  {m.indicaciones ? <Text style={s.medNota}>{m.indicaciones}</Text> : null}
                </View>
              ))
            )}
          </>
        ) : null}

        {/* Órdenes de examen */}
        {ordenes.length > 0 ? (
          <>
            <Text style={[s.seccionTitulo, { marginTop: 8 }]}>Órdenes de exámenes</Text>
            {ordenes.map(orden => (
              <View key={orden.id} style={s.ordenBloque} wrap={false}>
                <Text style={s.ordenFecha}>
                  {new Date(orden.fecha_creacion).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })} · {orden.creado_por}
                </Text>
                {orden.items.map(item => (
                  <View key={item.id} style={s.ordenItem}>
                    {item.codigo_cups
                      ? <Text style={s.ordenCups}>{item.codigo_cups}</Text>
                      : <Text style={s.ordenCups} />}
                    <View style={{ flex: 1 }}>
                      <Text style={s.ordenDesc}>{item.descripcion}</Text>
                      {item.indicaciones
                        ? <Text style={s.ordenInd}>{item.indicaciones}</Text>
                        : null}
                    </View>
                  </View>
                ))}
                {orden.indicaciones_generales
                  ? <Text style={s.ordenGeneral}>Indicaciones: {orden.indicaciones_generales}</Text>
                  : null}
              </View>
            ))}
          </>
        ) : null}

        {/* Firma */}
        <View style={s.pie} wrap={false}>
          <View style={s.firmaBloque}>
            {medico.firmaBase64
              ? <Image src={medico.firmaBase64} style={s.firmaImagen} />
              : <View style={{ height: 56 }} />}
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>{medico.nombre || 'Médico tratante'}</Text>
            {medico.especialidad ? <Text style={s.firmaTP}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.firmaTP}>TP {medico.tarjetaProfesional}</Text> : null}
          </View>
        </View>

      </Page>
    </Document>
  )
}
