import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { DatosMedico } from '../../context/MedicoContext'
import type { OrdenExamenItem } from '../../api/ordenes_examen'

type Props = {
  medico: DatosMedico
  paciente: { nombre: string; documento: string; tipoDocumento: string; fechaNacimiento: string }
  diagnostico: string
  items: OrdenExamenItem[]
  indicacionesGenerales: string | null
  fecha: string
  fechaImpresion?: string
  tamano?: string | [number, number]
  colorPrimario?: string
  logoBase64?: string | null
}

export default function OrdenExamenPDF({
  medico, paciente, diagnostico, items,
  indicacionesGenerales, fecha, fechaImpresion,
  tamano = 'LETTER', colorPrimario = '#1d4ed8', logoBase64 = null,
}: Props) {
  const LOGO_W = 60

  const s = StyleSheet.create({
    page: {
      paddingHorizontal: 48, paddingVertical: 40,
      fontFamily: 'Helvetica', fontSize: 10,
      color: '#0f172a', backgroundColor: '#ffffff',
    },
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
    headerConsultorio: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: colorPrimario, marginBottom: 2 },
    headerSub: { fontSize: 8, color: '#374151', marginBottom: 1 },

    dividerAccent: { borderBottomWidth: 2, borderBottomColor: colorPrimario, marginBottom: 12 },
    divider: { borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', marginVertical: 10 },

    titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 2 },
    titulo: { fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 1, color: '#0f172a' },
    fecha: { fontSize: 8, color: '#4b5563' },

    colLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    colNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    colSub: { fontSize: 8.5, color: '#374151', marginBottom: 1 },
    colDoc: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginBottom: 1 },

    diagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    diagLabel: { fontSize: 7, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
    diagChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
    diagCodigo: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: colorPrimario },

    seccionTitulo: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

    itemRow: { marginBottom: 10, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colorPrimario + '40' },
    itemDesc: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    itemCups: { fontSize: 8, color: colorPrimario, marginBottom: 1 },
    itemIndicaciones: { fontSize: 9, color: '#374151', fontStyle: 'italic' },

    indicacionesBox: {
      marginTop: 16, padding: 8,
      borderWidth: 0.5, borderColor: '#e2e8f0', borderRadius: 4,
    },
    indicacionesLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    indicacionesTexto: { fontSize: 9, color: '#1e293b', lineHeight: 1.4 },

    pie: { marginTop: 32, flexDirection: 'row', justifyContent: 'flex-end' },
    firmaBloque: { alignItems: 'center', width: 180 },
    firmaImagen: { width: 140, height: 56, objectFit: 'contain', marginBottom: 4 },
    firmaLinea: { width: 160, borderBottomWidth: 1, borderBottomColor: '#0f172a', marginBottom: 4 },
    firmaNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    firmaTP: { fontSize: 7, color: '#374151', textAlign: 'center' },

    footerLegal: { marginTop: 16, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#e2e8f0' },
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

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            {logoBase64 ? <Image src={logoBase64} style={s.logoImg} /> : <View style={s.logoPlaceholder} />}
          </View>
          <View style={s.headerInfo}>
            <Text style={s.headerConsultorio}>{medico.nombreConsultorio || 'Consultorio Médico'}</Text>
            {medico.especialidad ? <Text style={s.headerSub}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.headerSub}>TP {medico.tarjetaProfesional}</Text> : null}
            {medico.universidad ? <Text style={s.headerSub}>{medico.universidad}</Text> : null}
            {medico.nit ? <Text style={s.headerSub}>NIT {medico.nit}</Text> : null}
          </View>
        </View>

        <View style={s.dividerAccent} />

        {/* Título */}
        <View style={s.titleRow}>
          <Text style={s.titulo}>ORDEN DE EXÁMENES MÉDICOS</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.fecha}>Orden: {medico.ciudad ? `${medico.ciudad}, ` : ''}{fecha}</Text>
            {fechaImpresion && <Text style={s.fecha}>Impresión: {fechaImpresion}</Text>}
          </View>
        </View>

        <View style={s.divider} />

        {/* Paciente */}
        <View style={{ marginBottom: 12 }}>
          <Text style={s.colLabel}>Paciente</Text>
          <Text style={s.colNombre}>{paciente.nombre}</Text>
          <Text style={s.colDoc}>{paciente.tipoDocumento} {paciente.documento}</Text>
          {paciente.fechaNacimiento ? <Text style={s.colSub}>Nacimiento: {paciente.fechaNacimiento}</Text> : null}
        </View>

        {/* Diagnóstico de referencia */}
        {diagnostico ? (
          <View style={s.diagRow}>
            <Text style={s.diagLabel}>Diagnóstico de referencia</Text>
            <View style={s.diagChip}>
              <Text style={s.diagCodigo}>{diagnostico}</Text>
            </View>
          </View>
        ) : null}

        <View style={s.divider} />

        {/* Exámenes */}
        <Text style={s.seccionTitulo}>Exámenes solicitados</Text>
        {items.map((item, i) => (
          <View key={item.id} style={s.itemRow}>
            <Text style={s.itemDesc}>{i + 1}. {item.descripcion}</Text>
            {item.codigo_cups ? <Text style={s.itemCups}>CUPS: {item.codigo_cups}</Text> : null}
            {item.indicaciones ? <Text style={s.itemIndicaciones}>Indicaciones: {item.indicaciones}</Text> : null}
          </View>
        ))}

        {/* Indicaciones generales */}
        {indicacionesGenerales ? (
          <View style={s.indicacionesBox}>
            <Text style={s.indicacionesLabel}>Indicaciones generales</Text>
            <Text style={s.indicacionesTexto}>{indicacionesGenerales}</Text>
          </View>
        ) : null}

        {/* Firma */}
        <View style={s.pie}>
          <View style={s.firmaBloque}>
            {medico.firmaBase64 ? (
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

        {/* Footer: contacto + legal */}
        <View style={s.footerLegal}>
          {[medico.ciudad, medico.direccion, medico.telefono, medico.correoElectronico]
            .filter(Boolean).length > 0 && (
            <Text style={s.footerTexto}>
              {[medico.ciudad, medico.direccion, medico.telefono, medico.correoElectronico].filter(Boolean).join(' · ')}
            </Text>
          )}
          <Text style={s.footerTexto}>Orden médica · válida según normativa vigente</Text>
        </View>

      </Page>
    </Document>
  )
}
