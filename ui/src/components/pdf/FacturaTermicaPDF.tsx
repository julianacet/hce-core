import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { DatosMedico } from '../../context/MedicoContext'
import type { Factura } from '../../api/facturas'
import type { TamanoTermica } from '../../utils/impresion'
import { TAMANO_TERMICA } from '../../utils/impresion'

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(valor)
}

type PacienteInfo = {
  tipo_documento?: string
  numero_documento?: string
  edad?: number
}

type Props = {
  medico: DatosMedico
  factura: Factura
  pacienteNombre: string
  paciente?: PacienteInfo
  diagnostico?: string
  logoBase64?: string | null
  tamanoTermica?: TamanoTermica
}

export default function FacturaTermicaPDF({
  medico, factura, pacienteNombre, paciente, diagnostico,
  logoBase64 = null,
  tamanoTermica = 'Termica80',
}: Props) {
  const [anchoPage] = TAMANO_TERMICA[tamanoTermica]
  const pad = 10
  const ancho = anchoPage - pad * 2
  const anulada = factura.estado === 'anulada'

  const fechaObj = new Date(factura.fecha_creacion)
  const fecha = fechaObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const hora  = fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
  const ref   = factura.factura_id.slice(0, 8).toUpperCase()

  const s = StyleSheet.create({
    page: {
      paddingHorizontal: pad,
      paddingTop: 14,
      paddingBottom: 20,
      fontFamily: 'Courier',
      fontSize: 7,
      color: '#000000',
      backgroundColor: '#ffffff',
    },

    // ── Separadores ──────────────────────────────────────────────────────────
    sep: {
      borderBottomWidth: 0.5, borderBottomColor: '#000',
      borderStyle: 'dashed', marginVertical: 5,
    },

    // ── Centro ───────────────────────────────────────────────────────────────
    c:    { textAlign: 'center', marginBottom: 1 },
    bold: { fontFamily: 'Courier-Bold' },

    // ── Logo ─────────────────────────────────────────────────────────────────
    logoWrap: { alignItems: 'center', marginBottom: 4 },
    logoImg:  { width: 28, height: 28, objectFit: 'contain' },

    // ── Título del doc ────────────────────────────────────────────────────────
    tituloDoc: {
      textAlign: 'center', fontFamily: 'Courier-Bold',
      fontSize: 8, letterSpacing: 0.5, marginBottom: 1,
    },
    fechaDoc: { textAlign: 'center', fontSize: 6.5, marginBottom: 1 },

    // ── Anulada ───────────────────────────────────────────────────────────────
    anuladaBox: {
      borderWidth: 1, borderColor: '#000', borderStyle: 'dashed',
      marginVertical: 4, paddingVertical: 2,
    },
    anuladaText: {
      textAlign: 'center', fontFamily: 'Courier-Bold',
      fontSize: 12, letterSpacing: 6,
    },

    // ── Secciones ─────────────────────────────────────────────────────────────
    label: { fontFamily: 'Courier-Bold', fontSize: 6, letterSpacing: 0.5, marginBottom: 2 },

    // ── Items ────────────────────────────────────────────────────────────────
    itemRow:  { flexDirection: 'row', marginBottom: 4 },
    itemCode: { width: 40, fontFamily: 'Courier-Bold', fontSize: 6 },
    itemDesc: { flex: 1, fontSize: 6.5, lineHeight: 1.3 },
    itemVal:  { width: 46, textAlign: 'right', fontSize: 6.5 },

    // ── Totales ───────────────────────────────────────────────────────────────
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    totalGranLabel: { fontFamily: 'Courier-Bold', fontSize: 9 },
    totalGranValor: { fontFamily: 'Courier-Bold', fontSize: 9 },

    // ── Firma ────────────────────────────────────────────────────────────────
    firmaLinea: {
      borderBottomWidth: 0.5, borderBottomColor: '#000',
      width: ancho * 0.65, alignSelf: 'center', marginBottom: 3,
    },
    firmaImg: { width: ancho * 0.5, height: 28, objectFit: 'contain', alignSelf: 'center', marginBottom: 2 },

    // ── Pie ───────────────────────────────────────────────────────────────────
    pieTexto: { textAlign: 'center', fontSize: 6, color: '#444', marginBottom: 1 },

    // ── Corte ────────────────────────────────────────────────────────────────
    corteWrap: { marginTop: 10, alignItems: 'center' },
    corteLine: { borderBottomWidth: 0.5, borderBottomColor: '#000', borderStyle: 'dashed', width: '100%' },
    corteText: { fontSize: 6, color: '#888', marginTop: 2, letterSpacing: 0.5 },

    // ── Marca de agua ─────────────────────────────────────────────────────────
    watermark: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center',
    },
    watermarkText: {
      fontSize: 38, fontFamily: 'Courier-Bold',
      color: '#f0a0a0', letterSpacing: 4,
      transform: 'rotate(-35deg)',
    },
  })

  return (
    <Document>
      <Page size={TAMANO_TERMICA[tamanoTermica]} style={s.page}>

        {/* Logo */}
        {logoBase64 && (
          <View style={s.logoWrap}>
            <Image src={logoBase64} style={s.logoImg} />
          </View>
        )}

        {/* Encabezado consultorio */}
        <Text style={[s.c, s.bold, { fontSize: 6.5 }]}>
          {medico.nombreConsultorio || 'Consultorio Médico'}
        </Text>
        {medico.especialidad ? <Text style={[s.c, { fontSize: 6 }]}>{medico.especialidad}</Text> : null}
        {(medico.direccion || medico.ciudad) ? (
          <Text style={[s.c, { fontSize: 6 }]}>
            {[medico.direccion, medico.ciudad].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {medico.telefono ? <Text style={[s.c, { fontSize: 6 }]}>{medico.telefono}</Text> : null}
        {medico.nit ? <Text style={[s.c, { fontSize: 6 }]}>NIT {medico.nit}</Text> : null}

        <View style={s.sep} />

        {/* Título */}
        <Text style={s.tituloDoc}>FACTURA DE VENTA</Text>
        <Text style={[s.c, { fontSize: 6 }]}>Documento equivalente · servicios de salud</Text>
        <Text style={[s.c, { fontSize: 6, color: '#555' }]}>Ref. {ref}</Text>
        <Text style={s.fechaDoc}>{fecha} · {hora}</Text>

        {/* Anulada */}
        {anulada && (
          <View style={s.anuladaBox}>
            <Text style={s.anuladaText}>ANULADA</Text>
          </View>
        )}

        <View style={s.sep} />

        {/* Paciente */}
        <Text style={s.label}>PACIENTE</Text>
        <Text style={{ marginBottom: 1 }}>{pacienteNombre}</Text>
        {paciente?.tipo_documento && paciente?.numero_documento ? (
          <Text style={{ fontSize: 6, marginBottom: 1 }}>
            {paciente.tipo_documento} {paciente.numero_documento}
            {paciente.edad ? ` · ${paciente.edad} años` : ''}
          </Text>
        ) : null}
        {diagnostico ? (
          <Text style={{ fontSize: 6, marginBottom: 1 }}>Dx: {diagnostico}</Text>
        ) : null}

        <View style={s.sep} />

        {/* Items */}
        {factura.items.map((item) => (
          <View key={item.id} style={s.itemRow}>
            <Text style={s.itemCode}>{item.codigo_cups || '—'}</Text>
            <Text style={s.itemDesc}>
              {item.descripcion}
              {'\n'}
              <Text style={{ fontSize: 6, color: '#555' }}>
                {item.cantidad > 1 ? `${item.cantidad} × ${formatCOP(item.valor_unitario)}` : formatCOP(item.valor_unitario)}
              </Text>
            </Text>
            <Text style={s.itemVal}>{formatCOP(item.subtotal)}</Text>
          </View>
        ))}

        <View style={s.sep} />

        {/* Totales */}
        <View style={s.totalRow}>
          <Text>Subtotal</Text>
          <Text>{formatCOP(factura.total)}</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={{ fontSize: 6 }}>IVA (excluido · Art. 476 E.T.)</Text>
          <Text style={{ fontSize: 6 }}>$ 0</Text>
        </View>
        <View style={s.sep} />
        <View style={s.totalRow}>
          <Text style={s.totalGranLabel}>TOTAL</Text>
          <Text style={s.totalGranValor}>{formatCOP(factura.total)}</Text>
        </View>

        <View style={s.sep} />

        {/* Responsable */}
        <View style={s.totalRow}>
          <Text style={{ fontSize: 6 }}>Responsable de pago</Text>
          <Text style={{ fontSize: 6 }}>Particular</Text>
        </View>

        <View style={[s.sep, { marginTop: 10 }]} />

        {/* Firma médico */}
        {medico.firmaBase64
          ? <Image src={medico.firmaBase64} style={s.firmaImg} />
          : <View style={{ height: 20 }} />}
        <View style={s.firmaLinea} />
        <Text style={[s.c, s.bold, { fontSize: 6.5 }]}>{medico.nombre}</Text>
        {medico.especialidad ? <Text style={[s.c, { fontSize: 6 }]}>{medico.especialidad}</Text> : null}
        {medico.tarjetaProfesional ? <Text style={[s.c, { fontSize: 6 }]}>TP {medico.tarjetaProfesional}</Text> : null}

        <View style={s.sep} />

        {/* Pie */}
        <Text style={[s.pieTexto, s.bold]}>Gracias por su confianza.</Text>
        <Text style={s.pieTexto}>Conserve este recibo · no enmendaduras</Text>
        <Text style={s.pieTexto}>Excluido de IVA · Art. 476 num. 1 E.T.</Text>

        {/* Cortar aquí */}
        <View style={s.corteWrap}>
          <View style={s.corteLine} />
          <Text style={s.corteText}>✂  CORTAR AQUÍ</Text>
        </View>

        {/* Marca de agua anulada, fija: se repite en todas las páginas */}
        {anulada && (
          <View fixed style={s.watermark}>
            <Text style={s.watermarkText}>ANULADA</Text>
          </View>
        )}

      </Page>
    </Document>
  )
}
