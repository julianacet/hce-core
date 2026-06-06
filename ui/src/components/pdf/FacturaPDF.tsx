import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { DatosMedico } from '../../context/MedicoContext'
import type { Factura } from '../../api/facturas'

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(valor)
}

type PacienteInfo = {
  tipo_documento?: string
  numero_documento?: string
  direccion?: string | null
  telefono?: string | null
  correo_electronico?: string | null
  edad?: number
}

type Props = {
  medico: DatosMedico
  factura: Factura
  pacienteNombre: string
  paciente?: PacienteInfo
  diagnostico: string
  fechaImpresion?: string
  colorPrimario?: string
  logoBase64?: string | null
  tamano?: string | [number, number]
}

export default function FacturaPDF({
  medico, factura, pacienteNombre, paciente, diagnostico, fechaImpresion,
  colorPrimario = '#1d4ed8', logoBase64 = null,
  tamano = [396, 612],
}: Props) {
  const fecha = new Date(factura.fecha_creacion).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const pagada = factura.estado !== 'anulada'
  const LOGO_W = 60

  const s = StyleSheet.create({
    page: {
      paddingHorizontal: 48,
      paddingVertical: 36,
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#0f172a',
      backgroundColor: '#ffffff',
    },

    // ── Header ──────────────────────────────────────────────────────────────
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
    estadoBadge: {
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: pagada ? '#dcfce7' : '#fee2e2',
    },
    estadoTexto: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5,
      color: pagada ? '#166534' : '#991b1b',
    },

    dividerAccent: { borderBottomWidth: 2, borderBottomColor: colorPrimario, marginBottom: 12 },
    divider: { borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', marginVertical: 10 },

    // ── Marca de agua ────────────────────────────────────────────────────────
    marcaAgua: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center', justifyContent: 'center', opacity: 0.07,
    },
    marcaAguaImg: { width: 320, height: 320, objectFit: 'contain' },
    watermark: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center',
    },
    watermarkText: {
      fontSize: 64, fontFamily: 'Helvetica-Bold',
      color: '#fca5a5', letterSpacing: 8,
      transform: 'rotate(-35deg)',
    },

    // ── Título ───────────────────────────────────────────────────────────────
    titleRow: {
      flexDirection: 'row', alignItems: 'flex-end',
      justifyContent: 'space-between', marginBottom: 2,
    },
    titulo: {
      fontSize: 11, fontFamily: 'Helvetica-Bold',
      letterSpacing: 1, color: '#0f172a',
    },
    subtituloDoc: { fontSize: 8, color: '#4b5563', marginBottom: 10 },
    refLabel: {
      fontSize: 7, color: '#6b7280',
      textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right',
    },
    refValor: { fontSize: 7, color: '#475569', textAlign: 'right' },

    // ── Meta ─────────────────────────────────────────────────────────────────
    metaRow: { flexDirection: 'row', gap: 24, marginBottom: 12 },
    metaCelda: { flex: 1 },
    metaLabel: {
      fontSize: 7, color: '#6b7280',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
    },
    metaValor: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

    // ── Dos columnas ─────────────────────────────────────────────────────────
    dualCol: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    col: { flex: 1 },
    colLabel: {
      fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
    },
    colNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    colSub: { fontSize: 8.5, color: '#374151', marginBottom: 1 },
    colDoc: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginBottom: 1 },

    // ── Diagnóstico ───────────────────────────────────────────────────────────
    diagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    diagLabel: {
      fontSize: 7, color: '#6b7280',
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
    diagChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: '#f1f5f9', paddingHorizontal: 6,
      paddingVertical: 2, borderRadius: 3,
    },
    diagDesc: { fontSize: 8, color: '#334155' },

    // ── Tabla ────────────────────────────────────────────────────────────────
    seccionTitulo: {
      fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
    },
    tablaHeader: {
      flexDirection: 'row',
      backgroundColor: '#f8fafc',
      paddingVertical: 5, paddingHorizontal: 6,
      borderTopWidth: 0.5, borderBottomWidth: 0.5,
      borderColor: '#e2e8f0',
    },
    tablaFila: {
      flexDirection: 'row',
      paddingVertical: 5, paddingHorizontal: 6,
      borderBottomWidth: 0.5, borderColor: '#f1f5f9',
    },
    colCups: { width: 56, fontSize: 8, fontFamily: 'Helvetica-Bold', color: colorPrimario },
    colDesc: { flex: 1, fontSize: 8 },
    colNum:  { width: 44, fontSize: 8, textAlign: 'right' },
    thCups:  { width: 56, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280' },
    thDesc:  { flex: 1,  fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280' },
    thNum:   { width: 44, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', textAlign: 'right' },

    // ── Totales ───────────────────────────────────────────────────────────────
    totalesBloque: { alignItems: 'flex-end', marginTop: 10, marginBottom: 16 },
    totalFila: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginBottom: 3 },
    totalLabel: { fontSize: 8, color: '#374151', width: 160, textAlign: 'right' },
    totalValor: { fontSize: 8, color: '#374151', width: 80, textAlign: 'right' },
    totalDivider: {
      width: 264, borderBottomWidth: 0.5,
      borderBottomColor: '#e2e8f0', marginBottom: 6,
    },
    totalPrincipalLabel: {
      fontSize: 10, fontFamily: 'Helvetica-Bold',
      width: 160, textAlign: 'right',
    },
    totalPrincipalValor: {
      fontSize: 11, fontFamily: 'Helvetica-Bold',
      color: '#0f172a', width: 80, textAlign: 'right',
    },

    // ── Footer legal ──────────────────────────────────────────────────────────
    footerLegal: {
      marginTop: 16, paddingTop: 8,
      borderTopWidth: 0.5, borderTopColor: '#e2e8f0',
    },
    footerTexto: { fontSize: 7, color: '#6b7280', marginBottom: 1 },

    // ── Firma ─────────────────────────────────────────────────────────────────
    pie: { marginTop: 24, flexDirection: 'row', justifyContent: 'flex-end' },
    firmaBloque: { alignItems: 'center', width: 180 },
    firmaImagen: { width: 140, height: 56, objectFit: 'contain', marginBottom: 4 },
    firmaLinea: {
      width: 160, borderBottomWidth: 1,
      borderBottomColor: '#0f172a', marginBottom: 4,
    },
    firmaNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    firmaTP: { fontSize: 7, color: '#374151', textAlign: 'center' },
  })

  return (
    <Document>
      <Page size={tamano as any} style={s.page}>

        {logoBase64 && (
          <View fixed style={s.marcaAgua}>
            <Image src={logoBase64} style={s.marcaAguaImg} />
          </View>
        )}

        {/* Header: logo + info consultorio + badge estado */}
        <View style={s.header}>
          <View style={s.logoBox}>
            {logoBase64
              ? <Image src={logoBase64} style={s.logoImg} />
              : <View style={s.logoPlaceholder} />}
          </View>
          <View style={s.headerInfo}>
            <Text style={s.headerConsultorio}>{medico.nombreConsultorio || 'Consultorio Médico'}</Text>
            {medico.especialidad ? <Text style={s.headerSub}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.headerSub}>TP {medico.tarjetaProfesional}</Text> : null}
            {medico.universidad ? <Text style={s.headerSub}>{medico.universidad}</Text> : null}
            {medico.nit ? <Text style={s.headerSub}>NIT {medico.nit}</Text> : null}
          </View>
          <View style={s.estadoBadge}>
            <Text style={s.estadoTexto}>{pagada ? 'PAGADA' : 'ANULADA'}</Text>
          </View>
        </View>

        <View style={s.dividerAccent} />

        {/* Título + ref interna */}
        <View style={s.titleRow}>
          <Text style={s.titulo}>FACTURA DE VENTA</Text>
          <View>
            <Text style={s.refLabel}>Ref. interna</Text>
            <Text style={s.refValor}>{factura.factura_id}</Text>
          </View>
        </View>
        <Text style={s.subtituloDoc}>
          Documento equivalente para servicios de salud · excluido de IVA · Art. 476 num. 1 E.T.
        </Text>

        {/* Meta */}
        <View style={s.metaRow}>
          <View style={s.metaCelda}>
            <Text style={s.metaLabel}>Fecha de emisión</Text>
            <Text style={s.metaValor}>{fecha}</Text>
          </View>
          {fechaImpresion && (
            <View style={s.metaCelda}>
              <Text style={s.metaLabel}>Fecha de impresión</Text>
              <Text style={s.metaValor}>{fechaImpresion}</Text>
            </View>
          )}
          <View style={s.metaCelda}>
            <Text style={s.metaLabel}>Responsable de pago</Text>
            <Text style={s.metaValor}>Particular (paciente)</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Adquiriente / Profesional tratante */}
        <View style={s.dualCol}>
          <View style={s.col}>
            <Text style={s.colLabel}>Adquiriente / Paciente</Text>
            <Text style={s.colNombre}>{pacienteNombre}</Text>
            {paciente?.tipo_documento && paciente?.numero_documento ? (
              <Text style={s.colDoc}>
                {paciente.tipo_documento} {paciente.numero_documento}
                {paciente.edad ? ` · ${paciente.edad} años` : ''}
              </Text>
            ) : (
              <Text style={s.colDoc}>{factura.paciente_documento}</Text>
            )}
            {paciente?.direccion ? <Text style={s.colSub}>{paciente.direccion}</Text> : null}
            {paciente?.telefono ? <Text style={s.colSub}>{paciente.telefono}</Text> : null}
            {paciente?.correo_electronico ? <Text style={s.colSub}>{paciente.correo_electronico}</Text> : null}
          </View>
          <View style={s.col}>
            <Text style={s.colLabel}>Profesional tratante</Text>
            <Text style={s.colNombre}>{medico.nombre || 'Nombre del médico'}</Text>
            {medico.especialidad ? <Text style={s.colSub}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.colSub}>TP {medico.tarjetaProfesional}</Text> : null}
          </View>
        </View>

        {/* Diagnóstico */}
        {diagnostico ? (
          <View style={s.diagRow}>
            <Text style={s.diagLabel}>Diagnóstico principal</Text>
            <View style={s.diagChip}>
              <Text style={s.diagDesc}>{diagnostico}</Text>
            </View>
          </View>
        ) : null}

        {/* Tabla de procedimientos */}
        <Text style={s.seccionTitulo}>Procedimientos y servicios</Text>
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

        {/* Totales */}
        <View style={s.totalesBloque}>
          <View style={s.totalFila}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValor}>{formatCOP(factura.total)}</Text>
          </View>
          <View style={s.totalFila}>
            <Text style={s.totalLabel}>IVA (excluido · Art. 476 E.T.)</Text>
            <Text style={s.totalValor}>{formatCOP(0)}</Text>
          </View>
          <View style={s.totalDivider} />
          <View style={s.totalFila}>
            <Text style={s.totalPrincipalLabel}>Total a pagar</Text>
            <Text style={s.totalPrincipalValor}>{formatCOP(factura.total)}</Text>
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
            Servicio de salud excluido de IVA · Art. 476 num. 1 del Estatuto Tributario
          </Text>
          <Text style={s.footerTexto}>
            Documento de soporte de pago de operaciones que no generan crédito fiscal para el adquiriente
          </Text>
        </View>

        {/* Firma */}
        <View style={s.pie}>
          <View style={s.firmaBloque}>
            {medico.firmaBase64
              ? <Image src={medico.firmaBase64} style={s.firmaImagen} />
              : <View style={{ height: 56 }} />}
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>{medico.nombre || 'Nombre del médico'}</Text>
            {medico.especialidad ? <Text style={s.firmaTP}>{medico.especialidad}</Text> : null}
            {medico.tarjetaProfesional ? <Text style={s.firmaTP}>TP {medico.tarjetaProfesional}</Text> : null}
          </View>
        </View>

        {/* Marca de agua — último hijo para quedar encima de todo */}
        {!pagada && (
          <View style={s.watermark}>
            <Text style={s.watermarkText}>ANULADA</Text>
          </View>
        )}

      </Page>
    </Document>
  )
}
