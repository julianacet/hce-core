import { useNavigate, useParams } from 'react-router'
import { Download, Printer, ChevronLeft } from 'lucide-react'
import { Breadcrumb } from '../components/Breadcrumb'
import { PDFDownloadLink, pdf } from '@react-pdf/renderer'
import { useState } from 'react'
import { useFactura, useAnularFactura } from '../api/facturas'
import { usePaciente } from '../api/pacientes'
import { useMedico } from '../context/MedicoContext'
import FacturaPDF from '../components/pdf/FacturaPDF'

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)
}

export default function DetalleFactura() {
  const { facturaId } = useParams()
  const navigate = useNavigate()
  const { medico } = useMedico()
  const [imprimiendo, setImprimiendo] = useState(false)

  const { data: factura, isLoading, isError } = useFactura(facturaId ?? '')
  const { data: paciente } = usePaciente(factura?.paciente_documento ?? '')
  const anular = useAnularFactura(facturaId ?? '')

  async function handleAnular() {
    if (!window.confirm('¿Está seguro de que desea anular esta factura? Esta acción no se puede deshacer.')) return
    await anular.mutateAsync()
    navigate('/facturas')
  }

  if (isLoading) return <div className="p-6 text-sm text-slate-400">Cargando factura...</div>
  if (isError || !factura) return <div className="p-6 text-sm text-red-500">Error al cargar la factura.</div>

  const pacienteNombre = paciente
    ? [paciente.nombre_primero, paciente.nombre_segundo, paciente.apellido_primero, paciente.apellido_segundo]
        .filter(Boolean).join(' ')
    : factura.paciente_nombre ?? factura.paciente_documento

  const docPDF = (
    <FacturaPDF
      medico={medico}
      factura={factura}
      pacienteNombre={pacienteNombre}
      diagnostico=""
    />
  )

  async function imprimir() {
    setImprimiendo(true)
    try {
      const blob = await pdf(docPDF).toBlob()
      const url = URL.createObjectURL(blob)
      const ventana = window.open(url)
      if (ventana) {
        ventana.addEventListener('load', () => {
          ventana.focus()
          ventana.print()
          ventana.addEventListener('afterprint', () => URL.revokeObjectURL(url))
        })
      }
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <div className="page-hce">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Facturación', to: '/facturas' }, { label: 'Factura' }]} />
      <div className="space-y-4 max-w-2xl">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/facturas')}
              className="text-slate-400 hover:text-slate-700 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="card-title">Factura</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(factura.fecha_creacion).toLocaleString('es-CO')} · {pacienteNombre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {factura.estado === 'activa' && (
              <button
                onClick={handleAnular}
                disabled={anular.isPending}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Anular
              </button>
            )}
            <button onClick={imprimir} disabled={imprimiendo}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
              <Printer size={14} />
              {imprimiendo ? 'Preparando...' : 'Imprimir'}
            </button>
            <PDFDownloadLink
              document={docPDF}
              fileName={`factura_${factura.paciente_documento}_${Date.now()}.pdf`}
            >
              {({ loading }) => (
                <button disabled={loading} className="btn-primary disabled:opacity-50">
                  <Download size={14} />
                  {loading ? 'Generando...' : 'Descargar PDF'}
                </button>
              )}
            </PDFDownloadLink>
          </div>
        </div>

        {/* Tabla de items */}
        <div className="card-hce overflow-hidden">
          <table className="w-full text-sm">
            <thead className="thead-sticky border-b" style={{ borderColor: 'var(--hce-border)' }}>
              <tr>
                <th className="th-hce">CUPS</th>
                <th className="th-hce">Descripción</th>
                <th className="th-hce th-hce--right">Cant.</th>
                <th className="th-hce th-hce--right">V. Unit.</th>
                <th className="th-hce th-hce--right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {factura.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--hce-primary)' }}>{item.codigo_cups}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{item.descripcion}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">{item.cantidad}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">{formatCOP(item.valor_unitario)}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-800">{formatCOP(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-700 text-right">Total</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-slate-800">{formatCOP(factura.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
