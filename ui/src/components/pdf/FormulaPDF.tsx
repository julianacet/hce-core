import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { DatosMedico } from '../../context/MedicoContext'

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

export const medVacio: Medicamento = {
  nombre: '', concentracion: '', formaFarmaceutica: '',
  dosis: '', frecuencia: '', duracion: '', cantidad: '', indicaciones: '',
}

type Props = {
  medico: DatosMedico
  paciente: { nombre: string; documento: string; tipoDocumento: string; fechaNacimiento: string }
  diagnostico: string
  medicamentos: Medicamento[]
  incluirFirma: boolean
  fecha: string
  tipo?: 'pos' | 'no_pos'
  tamano?: string | [number, number]
  colorPrimario?: string
  logoBase64?: string | null
}

export default function FormulaPDF({
  medico, paciente, diagnostico, medicamentos, incluirFirma, fecha,
  tipo: _tipo, tamano = 'A4',
  colorPrimario = '#1d4ed8', logoBase64 = null,
}: Props) {
  const tituloFormula = 'FÓRMULA MÉDICA'
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

    // ── Título ────────────────────────────────────────────────────────────────
    titleRow: {
      flexDirection: 'row', alignItems: 'flex-end',
      justifyContent: 'space-between', marginBottom: 2,
    },
    titulo: {
      fontSize: 11, fontFamily: 'Helvetica-Bold',
      letterSpacing: 1, color: '#0f172a',
    },
    fecha: { fontSize: 8, color: '#64748b' },

    // ── Secciones ─────────────────────────────────────────────────────────────
    colLabel: {
      fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
    },
    colNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    colSub: { fontSize: 8, color: '#64748b', marginBottom: 1 },

    // ── Diagnóstico ───────────────────────────────────────────────────────────
    diagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    diagLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
    diagChip: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#f1f5f9', paddingHorizontal: 6,
      paddingVertical: 2, borderRadius: 3,
    },
    diagCodigo: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: colorPrimario },

    // ── Medicamentos ──────────────────────────────────────────────────────────
    seccionTitulo: {
      fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    },
    rp: {
      fontSize: 11, fontFamily: 'Helvetica-Bold',
      color: colorPrimario, marginBottom: 10,
    },
    medicamento: {
      marginBottom: 12, paddingLeft: 8,
      borderLeftWidth: 2, borderLeftColor: colorPrimario + '40',
    },
    medNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    medDetalle: { fontSize: 9, color: '#334155', marginBottom: 1 },
    medIndicaciones: { fontSize: 9, color: '#64748b', fontStyle: 'italic' },

    // ── Firma ─────────────────────────────────────────────────────────────────
    pie: { marginTop: 32, flexDirection: 'row', justifyContent: 'flex-end' },
    firmaBloque: { alignItems: 'center', width: 180 },
    firmaImagen: { width: 140, height: 56, objectFit: 'contain', marginBottom: 4 },
    firmaLinea: {
      width: 160, borderBottomWidth: 1,
      borderBottomColor: '#0f172a', marginBottom: 4,
    },
    firmaNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    firmaTP: { fontSize: 7, color: '#64748b', textAlign: 'center' },

    // ── Footer legal ──────────────────────────────────────────────────────────
    footerLegal: {
      marginTop: 16, paddingTop: 8,
      borderTopWidth: 0.5, borderTopColor: '#e2e8f0',
    },
    footerTexto: { fontSize: 7, color: '#94a3b8', marginBottom: 1 },
  })

  return (
    <Document>
      <Page size={tamano as any} style={s.page}>

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
          <Text style={s.titulo}>{tituloFormula}</Text>
          <Text style={s.fecha}>{medico.ciudad || ''}{medico.ciudad ? ', ' : ''}{fecha}</Text>
        </View>

        <View style={s.divider} />

        {/* Paciente */}
        <View style={{ marginBottom: 12 }}>
          <Text style={s.colLabel}>Paciente</Text>
          <Text style={s.colNombre}>{paciente.nombre}</Text>
          <Text style={s.colSub}>{paciente.tipoDocumento} {paciente.documento}</Text>
          {paciente.fechaNacimiento
            ? <Text style={s.colSub}>Nacimiento: {paciente.fechaNacimiento}</Text>
            : null}
        </View>

        {/* Diagnóstico */}
        {diagnostico ? (
          <View style={s.diagRow}>
            <Text style={s.diagLabel}>Diagnóstico</Text>
            <View style={s.diagChip}>
              <Text style={s.diagCodigo}>{diagnostico}</Text>
            </View>
          </View>
        ) : null}

        <View style={s.divider} />

        {/* Medicamentos */}
        <Text style={s.seccionTitulo}>Prescripción</Text>
        <Text style={s.rp}>Rp/</Text>
        {medicamentos.map((m, i) => (
          <View key={i} style={s.medicamento}>
            <Text style={s.medNombre}>
              {i + 1}. {m.nombre}{m.concentracion ? ` ${m.concentracion}` : ''}{m.formaFarmaceutica ? ` — ${m.formaFarmaceutica}` : ''}
            </Text>
            <Text style={s.medDetalle}>
              {[m.dosis, m.frecuencia, m.duracion ? `por ${m.duracion}` : ''].filter(Boolean).join(' · ')}
            </Text>
            {m.cantidad ? <Text style={s.medDetalle}>Cantidad: {m.cantidad}</Text> : null}
            {m.indicaciones ? (
              <Text style={s.medIndicaciones}>Nota: {m.indicaciones}</Text>
            ) : null}
          </View>
        ))}

        {/* Footer legal */}
        <View style={s.footerLegal}>
          <Text style={s.footerTexto}>
            Prescripción médica · válida según Res. 1995/1999 y Res. 1552/2013
          </Text>
        </View>

        {/* Firma */}
        <View style={s.pie}>
          <View style={s.firmaBloque}>
            {incluirFirma && medico.firmaBase64 ? (
              <Image src={medico.firmaBase64} style={s.firmaImagen} />
            ) : (
              <View style={{ height: 56 }} />
            )}
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>{medico.nombre || 'Nombre del médico'}</Text>
            {medico.especialidad ? <Text style={s.firmaTP}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.firmaTP}>TP {medico.tarjetaProfesional}</Text> : null}
          </View>
        </View>

      </Page>
    </Document>
  )
}
