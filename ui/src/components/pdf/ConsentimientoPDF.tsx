import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { DatosMedico } from '../../context/MedicoContext'

type Props = {
  medico: DatosMedico
  pacienteNombre: string
  pacienteDocumento: string
  tipoDocumento: string
  contenidoRenderizado: string
  fecha: string
  fechaImpresion?: string
  tamano?: string | [number, number]
  colorPrimario?: string
  logoBase64?: string | null
  logoTextoBase64?: string | null
}

export default function ConsentimientoPDF({
  medico,
  pacienteNombre,
  pacienteDocumento,
  tipoDocumento,
  contenidoRenderizado,
  fecha, fechaImpresion,
  tamano = 'LETTER',
  colorPrimario = '#1d4ed8',
  logoBase64 = null, logoTextoBase64 = null,
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
    headerConsultorio: {
      fontSize: 12, fontFamily: 'Helvetica-Bold',
      color: colorPrimario, marginBottom: 2,
    },
    headerSub: { fontSize: 8, color: '#374151', marginBottom: 1 },

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
    fecha: { fontSize: 8, color: '#4b5563' },

    // ── Sección paciente ──────────────────────────────────────────────────────
    colLabel: {
      fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
    },
    colNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    colSub: { fontSize: 8.5, color: '#374151', marginBottom: 1 },
    colDoc: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginBottom: 1 },

    // ── Contenido ─────────────────────────────────────────────────────────────
    seccionTitulo: {
      fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280',
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
    firmaLabel: { fontSize: 7, color: '#374151', textAlign: 'center' },

    // ── Footer legal ──────────────────────────────────────────────────────────
    footerLegal: {
      marginTop: 16, paddingTop: 8,
      borderTopWidth: 0.5, borderTopColor: '#e2e8f0',
    },
    footerTexto: { fontSize: 7, color: '#6b7280', marginBottom: 1 },
  })

  return (
    <Document>
      <Page size={tamano as any} style={s.page}>

        {logoBase64 && (
          <View fixed style={s.marcaAgua}>
            <Image src={logoBase64} style={s.marcaAguaImg} />
          </View>
        )}

        {/* Header: logo + info consultorio */}
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
          </View>
        </View>

        <View style={s.dividerAccent} />

        {/* Título + fecha */}
        <View style={s.titleRow}>
          <Text style={s.titulo}>CONSENTIMIENTO INFORMADO</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.fecha}>Consentimiento: {medico.ciudad ? `${medico.ciudad}, ` : ''}{fecha}</Text>
            {fechaImpresion && <Text style={s.fecha}>Impresión: {fechaImpresion}</Text>}
          </View>
        </View>

        <View style={s.divider} />

        {/* Paciente */}
        <View style={{ marginBottom: 12 }}>
          <Text style={s.colLabel}>Paciente</Text>
          <Text style={s.colNombre}>{pacienteNombre}</Text>
          <Text style={s.colDoc}>{tipoDocumento} {pacienteDocumento}</Text>
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

        {/* Footer: contacto + legal */}
        <View style={s.footerLegal}>
          {[medico.ciudad, medico.direccion, medico.telefono, medico.correoElectronico]
            .filter(Boolean).length > 0 && (
            <Text style={s.footerTexto}>
              {[medico.ciudad, medico.direccion, medico.telefono, medico.correoElectronico].filter(Boolean).join(' · ')}
            </Text>
          )}
          <Text style={s.footerTexto}>
            Consentimiento informado · elaborado conforme a la Resolución 13437/1991 y Ley 23/1981
          </Text>
        </View>

      </Page>
    </Document>
  )
}
