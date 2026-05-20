import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { PageSize } from '@react-pdf/renderer'
import type { DatosMedico } from '../../context/MedicoContext'

type Props = {
  medico: DatosMedico
  pacienteNombre: string
  pacienteDocumento: string
  tipoDocumento: string
  contenidoRenderizado: string
  fecha: string
  tamano?: PageSize
  colorPrimario?: string
  logoBase64?: string | null
}

export default function ConsentimientoPDF({
  medico,
  pacienteNombre,
  pacienteDocumento,
  tipoDocumento,
  contenidoRenderizado,
  fecha,
  tamano = 'A4',
  colorPrimario = '#1d4ed8',
  logoBase64 = null,
}: Props) {
  const LOGO_W = 60

  const s = StyleSheet.create({
    page: {
      paddingHorizontal: 48,
      paddingVertical: 40,
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#0f172a',
      backgroundColor: '#ffffff',
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    logoBox: { width: LOGO_W, marginRight: 12 },
    logoImg: { width: LOGO_W, height: LOGO_W, objectFit: 'contain' },
    logoPlaceholder: {
      width: LOGO_W, height: LOGO_W,
      borderWidth: 1, borderColor: '#e2e8f0',
      borderStyle: 'dashed', borderRadius: 4,
    },
    headerInfo: { flex: 1 },
    headerConsultorio: {
      fontSize: 12, fontFamily: 'Helvetica-Bold',
      color: colorPrimario, marginBottom: 2,
    },
    headerNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    headerSub: { fontSize: 8, color: '#64748b', marginBottom: 1 },

    dividerAccent: { borderBottomWidth: 2, borderBottomColor: colorPrimario, marginBottom: 12 },
    divider: { borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', marginVertical: 10 },

    // ── Título + fecha (fila) ─────────────────────────────────────────────────
    titleRow: {
      flexDirection: 'row', alignItems: 'flex-end',
      justifyContent: 'space-between', marginBottom: 2,
    },
    titulo: {
      fontSize: 11, fontFamily: 'Helvetica-Bold',
      letterSpacing: 1, color: '#0f172a',
    },
    fecha: { fontSize: 8, color: '#64748b' },

    // ── Sección paciente ──────────────────────────────────────────────────────
    colLabel: {
      fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
    },
    colNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    colSub: { fontSize: 8, color: '#64748b', marginBottom: 1 },

    // ── Contenido ─────────────────────────────────────────────────────────────
    seccionTitulo: {
      fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    },
    contenido: {
      fontSize: 10,
      lineHeight: 1.7,
      color: '#0f172a',
    },

    // ── Firmas ────────────────────────────────────────────────────────────────
    firmasBloque: {
      marginTop: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    firmaItem: { alignItems: 'center', width: 180 },
    firmaLinea: {
      width: 160, borderBottomWidth: 1,
      borderBottomColor: '#0f172a', marginBottom: 4,
    },
    firmaImagen: { width: 140, height: 56, objectFit: 'contain', marginBottom: 4 },
    firmaNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    firmaLabel: { fontSize: 7, color: '#64748b', textAlign: 'center' },

    // ── Footer legal ──────────────────────────────────────────────────────────
    footerLegal: {
      marginTop: 16, paddingTop: 8,
      borderTopWidth: 0.5, borderTopColor: '#e2e8f0',
    },
    footerTexto: { fontSize: 7, color: '#94a3b8', marginBottom: 1 },
  })

  return (
    <Document>
      <Page size={tamano} style={s.page}>

        {/* Header: logo + info consultorio */}
        <View style={s.header}>
          <View style={s.logoBox}>
            {logoBase64
              ? <Image src={logoBase64} style={s.logoImg} />
              : <View style={s.logoPlaceholder} />}
          </View>
          <View style={s.headerInfo}>
            <Text style={s.headerConsultorio}>{medico.nombreConsultorio || 'Consultorio Médico'}</Text>
            <Text style={s.headerNombre}>{medico.nombre || 'Nombre del médico'}</Text>
            {medico.especialidad ? <Text style={s.headerSub}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.headerSub}>TP {medico.tarjetaProfesional}</Text> : null}
            {(medico.ciudad || medico.direccion) ? (
              <Text style={s.headerSub}>
                {[medico.ciudad, medico.direccion].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            {medico.telefono ? <Text style={s.headerSub}>{medico.telefono}</Text> : null}
            {medico.nit ? <Text style={s.headerSub}>NIT {medico.nit}</Text> : null}
          </View>
        </View>

        <View style={s.dividerAccent} />

        {/* Título + fecha */}
        <View style={s.titleRow}>
          <Text style={s.titulo}>CONSENTIMIENTO INFORMADO</Text>
          <Text style={s.fecha}>
            {medico.ciudad || ''}{medico.ciudad ? ', ' : ''}{fecha}
          </Text>
        </View>

        <View style={s.divider} />

        {/* Paciente */}
        <View style={{ marginBottom: 12 }}>
          <Text style={s.colLabel}>Paciente</Text>
          <Text style={s.colNombre}>{pacienteNombre}</Text>
          <Text style={s.colSub}>{tipoDocumento} {pacienteDocumento}</Text>
        </View>

        <View style={s.divider} />

        {/* Contenido */}
        <Text style={s.seccionTitulo}>Declaración de consentimiento</Text>
        <Text style={s.contenido}>{contenidoRenderizado}</Text>

        {/* Firmas */}
        <View style={s.firmasBloque}>
          <View style={s.firmaItem}>
            <View style={{ height: 56 }} />
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>{pacienteNombre}</Text>
            <Text style={s.firmaLabel}>{tipoDocumento} {pacienteDocumento}</Text>
            <Text style={s.firmaLabel}>Paciente o representante legal</Text>
          </View>

          <View style={s.firmaItem}>
            {medico.firmaBase64 ? (
              <Image src={medico.firmaBase64} style={s.firmaImagen} />
            ) : (
              <View style={{ height: 56 }} />
            )}
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>{medico.nombre || 'Médico tratante'}</Text>
            {medico.especialidad ? <Text style={s.firmaLabel}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.firmaLabel}>TP {medico.tarjetaProfesional}</Text> : null}
          </View>
        </View>

        {/* Footer legal */}
        <View style={s.footerLegal}>
          <Text style={s.footerTexto}>
            Consentimiento informado · elaborado conforme a la Resolución 13437/1991 y Ley 23/1981
          </Text>
        </View>

      </Page>
    </Document>
  )
}
