import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { DatosMedico } from '../../context/MedicoContext'

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 48,
    paddingVertical: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  banner: {
    borderBottomWidth: 2,
    borderBottomColor: '#1d4ed8',
    paddingBottom: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerIzq: { flex: 1 },
  consultorio: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1d4ed8', marginBottom: 3 },
  medico: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  sub: { fontSize: 9, color: '#64748b', marginBottom: 1 },
  bannerDer: { alignItems: 'flex-end' },
  titulo: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    color: '#1d4ed8',
    marginBottom: 20,
  },
  contenido: {
    fontSize: 10,
    lineHeight: 1.7,
    color: '#0f172a',
    marginBottom: 40,
    whiteSpace: 'pre-wrap',
  },
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
  fecha: { fontSize: 9, color: '#64748b', textAlign: 'right', marginBottom: 24 },
})

type Props = {
  medico: DatosMedico
  pacienteNombre: string
  pacienteDocumento: string
  tipoDocumento: string
  contenidoRenderizado: string
  fecha: string
  tamano?: string | [number, number]
}

export default function ConsentimientoPDF({
  medico,
  pacienteNombre,
  pacienteDocumento,
  tipoDocumento,
  contenidoRenderizado,
  fecha,
  tamano = 'A4',
}: Props) {
  return (
    <Document>
      <Page size={tamano} style={s.page}>

        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerIzq}>
            <Text style={s.consultorio}>{medico.nombreConsultorio || 'Consultorio Médico'}</Text>
            <Text style={s.medico}>{medico.nombre || 'Nombre del médico'}</Text>
            <Text style={s.sub}>{medico.especialidad || ''}</Text>
            <Text style={s.sub}>TP: {medico.tarjetaProfesional || '—'}</Text>
          </View>
          <View style={s.bannerDer}>
            <Text style={s.sub}>{medico.ciudad || ''}</Text>
            <Text style={s.sub}>{medico.direccion || ''}</Text>
            <Text style={s.sub}>Tel: {medico.telefono || '—'}</Text>
          </View>
        </View>

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
            <Text style={s.firmaLabel}>{medico.especialidad || ''}</Text>
            <Text style={s.firmaLabel}>TP: {medico.tarjetaProfesional || '—'}</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}
