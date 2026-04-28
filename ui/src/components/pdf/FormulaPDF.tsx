import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { DatosMedico } from '../../context/MedicoContext'

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 48,
    paddingVertical: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },

  // Banner / encabezado
  banner: {
    borderBottomWidth: 2,
    borderBottomColor: '#1d4ed8',
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerIzq: { flex: 1 },
  consultorio: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1d4ed8', marginBottom: 3 },
  medico: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 1 },
  especialidad: { fontSize: 9, color: '#64748b', marginBottom: 1 },
  tp: { fontSize: 9, color: '#64748b' },
  bannerDer: { alignItems: 'flex-end' },
  contacto: { fontSize: 9, color: '#64748b', marginBottom: 1 },

  // Título
  titulo: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: '#1d4ed8',
    marginBottom: 16,
  },

  // Datos del paciente
  seccion: { marginBottom: 14 },
  seccionTitulo: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 3,
  },
  fila: { flexDirection: 'row', marginBottom: 4 },
  etiqueta: { width: 120, fontSize: 9, color: '#64748b' },
  valor: { flex: 1, fontSize: 9, color: '#0f172a' },

  // Medicamentos
  rp: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
    marginBottom: 10,
  },
  medicamento: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#bfdbfe',
  },
  medNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  medDetalle: { fontSize: 9, color: '#334155', marginBottom: 1 },
  medIndicaciones: { fontSize: 9, color: '#64748b', fontStyle: 'italic' },

  // Pie con firma
  pie: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  firmaBloque: { alignItems: 'center', width: 180 },
  firmaImagen: { width: 140, height: 56, objectFit: 'contain', marginBottom: 4 },
  firmaLinea: { width: 160, borderBottomWidth: 1, borderBottomColor: '#0f172a', marginBottom: 4 },
  firmaNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  firmaTP: { fontSize: 8, color: '#64748b', textAlign: 'center' },

  // Fecha
  fecha: { fontSize: 9, color: '#64748b', textAlign: 'right', marginBottom: 16 },
})

export type Medicamento = {
  nombre: string
  concentracion: string
  formaFarmaceutica: string
  dosis: string
  frecuencia: string
  duracion: string
  cantidad: string
  indicaciones: string
}

type Props = {
  medico: DatosMedico
  paciente: { nombre: string; documento: string; tipoDocumento: string; fechaNacimiento: string }
  diagnostico: string
  medicamentos: Medicamento[]
  incluirFirma: boolean
  fecha: string
}

export default function FormulaPDF({ medico, paciente, diagnostico, medicamentos, incluirFirma, fecha }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerIzq}>
            <Text style={s.consultorio}>{medico.nombreConsultorio || 'Consultorio Médico'}</Text>
            <Text style={s.medico}>{medico.nombre || 'Nombre del médico'}</Text>
            <Text style={s.especialidad}>{medico.especialidad || 'Especialidad'}</Text>
            <Text style={s.tp}>TP: {medico.tarjetaProfesional || '—'}</Text>
          </View>
          <View style={s.bannerDer}>
            <Text style={s.contacto}>{medico.ciudad || 'Ciudad'}</Text>
            <Text style={s.contacto}>{medico.direccion || 'Dirección del consultorio'}</Text>
            <Text style={s.contacto}>Tel: {medico.telefono || '—'}</Text>
          </View>
        </View>

        {/* Título y fecha */}
        <Text style={s.titulo}>FÓRMULA MÉDICA</Text>
        <Text style={s.fecha}>{medico.ciudad || 'Ciudad'}, {fecha}</Text>

        {/* Datos del paciente */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Datos del paciente</Text>
          <View style={s.fila}>
            <Text style={s.etiqueta}>Nombre:</Text>
            <Text style={s.valor}>{paciente.nombre}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.etiqueta}>Documento:</Text>
            <Text style={s.valor}>{paciente.tipoDocumento} {paciente.documento}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.etiqueta}>Fecha de nacimiento:</Text>
            <Text style={s.valor}>{paciente.fechaNacimiento}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.etiqueta}>Diagnóstico:</Text>
            <Text style={s.valor}>{diagnostico}</Text>
          </View>
        </View>

        {/* Medicamentos */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Prescripción</Text>
          <Text style={s.rp}>Rp/</Text>
          {medicamentos.map((m, i) => (
            <View key={i} style={s.medicamento}>
              <Text style={s.medNombre}>
                {i + 1}. {m.nombre} {m.concentracion} — {m.formaFarmaceutica}
              </Text>
              <Text style={s.medDetalle}>
                {m.dosis} · {m.frecuencia} · por {m.duracion}
              </Text>
              <Text style={s.medDetalle}>Cantidad: {m.cantidad}</Text>
              {m.indicaciones ? (
                <Text style={s.medIndicaciones}>Nota: {m.indicaciones}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Firma */}
        <View style={s.pie}>
          <View style={s.firmaBloque}>
            {incluirFirma && medico.firmaBase64 ? (
              <Image src={medico.firmaBase64} style={s.firmaImagen} />
            ) : (
              <View style={{ height: 60 }} />
            )}
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>{medico.nombre || 'Nombre del médico'}</Text>
            <Text style={s.firmaTP}>{medico.especialidad || ''}</Text>
            <Text style={s.firmaTP}>TP: {medico.tarjetaProfesional || '—'}</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}
