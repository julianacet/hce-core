import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { DatosMedico } from '../../context/MedicoContext'
import type { Factura } from '../../api/facturas'

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
    marginBottom: 16,
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
    letterSpacing: 1.5,
    color: '#1d4ed8',
    marginBottom: 4,
  },
  anulada: {
    textAlign: 'center',
    fontSize: 11,
    color: '#dc2626',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    marginBottom: 16,
  },

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
  etiqueta: { width: 130, fontSize: 9, color: '#64748b' },
  valor: { flex: 1, fontSize: 9 },

  // Tabla
  tabla: { marginBottom: 14 },
  tablaHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  tablaFila: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderColor: '#f1f5f9',
  },
  colCups: { width: 60, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' },
  colDesc: { flex: 1, fontSize: 9 },
  colNum: { width: 45, fontSize: 9, textAlign: 'right' },
  thCups: { width: 60, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b' },
  thDesc: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b' },
  thNum: { width: 45, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b', textAlign: 'right' },

  totalFila: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingRight: 6,
    gap: 16,
  },
  totalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#64748b' },
  totalValor: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a', width: 100, textAlign: 'right' },

  pie: { marginTop: 48, flexDirection: 'row', justifyContent: 'flex-end' },
  firmaBloque: { alignItems: 'center', width: 180 },
  firmaImagen: { width: 140, height: 56, objectFit: 'contain', marginBottom: 4 },
  firmaLinea: { width: 160, borderBottomWidth: 1, borderBottomColor: '#0f172a', marginBottom: 4 },
  firmaNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  firmaTP: { fontSize: 8, color: '#64748b', textAlign: 'center' },
})

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(valor)
}

type Props = {
  medico: DatosMedico
  factura: Factura
  pacienteNombre: string
  diagnostico: string
}

export default function FacturaPDF({ medico, factura, pacienteNombre, diagnostico }: Props) {
  const fecha = new Date(factura.fecha_creacion).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>

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

        {/* Título */}
        <Text style={s.titulo}>FACTURA DE VENTA</Text>
        {factura.estado === 'anulada' && (
          <Text style={s.anulada}>— ANULADA —</Text>
        )}

        {/* Datos */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Información del documento</Text>
          <View style={s.fila}>
            <Text style={s.etiqueta}>Fecha:</Text>
            <Text style={s.valor}>{fecha}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.etiqueta}>Ref. interna:</Text>
            <Text style={s.valor}>{factura.factura_id}</Text>
          </View>
        </View>

        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Datos del paciente</Text>
          <View style={s.fila}>
            <Text style={s.etiqueta}>Nombre:</Text>
            <Text style={s.valor}>{pacienteNombre}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.etiqueta}>Documento:</Text>
            <Text style={s.valor}>{factura.paciente_documento}</Text>
          </View>
          {diagnostico ? (
            <View style={s.fila}>
              <Text style={s.etiqueta}>Diagnóstico:</Text>
              <Text style={s.valor}>{diagnostico}</Text>
            </View>
          ) : null}
        </View>

        {/* Tabla de items */}
        <View style={s.tabla}>
          <Text style={s.seccionTitulo}>Procedimientos</Text>
          <View style={s.tablaHeader}>
            <Text style={s.thCups}>CUPS</Text>
            <Text style={s.thDesc}>Descripción</Text>
            <Text style={s.thNum}>Cant.</Text>
            <Text style={s.thNum}>V. Unit.</Text>
            <Text style={s.thNum}>Subtotal</Text>
          </View>
          {factura.items.map((item) => (
            <View key={item.id} style={s.tablaFila}>
              <Text style={s.colCups}>{item.codigo_cups}</Text>
              <Text style={s.colDesc}>{item.descripcion}</Text>
              <Text style={s.colNum}>{item.cantidad}</Text>
              <Text style={s.colNum}>{formatCOP(item.valor_unitario)}</Text>
              <Text style={s.colNum}>{formatCOP(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={s.totalFila}>
          <Text style={s.totalLabel}>TOTAL</Text>
          <Text style={s.totalValor}>{formatCOP(factura.total)}</Text>
        </View>

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
            <Text style={s.firmaTP}>{medico.especialidad || ''}</Text>
            <Text style={s.firmaTP}>TP: {medico.tarjetaProfesional || '—'}</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}
