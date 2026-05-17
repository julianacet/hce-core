import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { DatosMedico } from '../../context/MedicoContext'

type Props = {
  medico: DatosMedico
  pacienteNombre: string
  pacienteDocumento: string
  tipoDocumento: string
  contenidoRenderizado: string
  fecha: string
  tamano?: string | [number, number]
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

    dividerAccent: { borderBottomWidth: 2, borderBottomColor: colorPrimario, marginBottom: 16 },

    // ── Título ────────────────────────────────────────────────────────────────
    titulo: {
      textAlign: 'center',
      fontSize: 13,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 1,
      color: colorPrimario,
      marginBottom: 8,
    },
    fecha: { fontSize: 9, color: '#64748b', textAlign: 'right', marginBottom: 20 },

    // ── Contenido ─────────────────────────────────────────────────────────────
    contenido: {
      fontSize: 10,
      lineHeight: 1.7,
      color: '#0f172a',
      marginBottom: 40,
    },

    // ── Firmas ────────────────────────────────────────────────────────────────
    firmasBloque: {
      marginTop: 48,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    firmaItem: { alignItems: 'center', width: 180 },
    firmaLinea: { width: 160, borderBottomWidth: 1, borderBottomColor: '#0f172a', marginBottom: 4 },
    firmaNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    firmaLabel: { fontSize: 8, color: '#64748b', textAlign: 'center' },
    firmaImagen: { width: 120, height: 48, objectFit: 'contain', marginBottom: 4 },
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
          </View>
        </View>

        <View style={s.dividerAccent} />

        <Text style={s.titulo}>CONSENTIMIENTO INFORMADO</Text>
        <Text style={s.fecha}>{medico.ciudad || 'Ciudad'}, {fecha}</Text>

        <Text style={s.contenido}>{contenidoRenderizado}</Text>

        {/* Firmas */}
        <View style={s.firmasBloque}>
          <View style={s.firmaItem}>
            <View style={{ height: 48 }} />
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>{pacienteNombre}</Text>
            <Text style={s.firmaLabel}>{tipoDocumento} {pacienteDocumento}</Text>
            <Text style={s.firmaLabel}>Paciente o representante legal</Text>
          </View>

          <View style={s.firmaItem}>
            {medico.firmaBase64 ? (
              <Image src={medico.firmaBase64} style={s.firmaImagen} />
            ) : (
              <View style={{ height: 48 }} />
            )}
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>{medico.nombre || 'Médico tratante'}</Text>
            {medico.especialidad ? <Text style={s.firmaLabel}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.firmaLabel}>TP {medico.tarjetaProfesional}</Text> : null}
          </View>
        </View>

      </Page>
    </Document>
  )
}
