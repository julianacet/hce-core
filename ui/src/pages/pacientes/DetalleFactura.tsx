import { useNavigate, useParams } from 'react-router'
import { Download, Printer, ChevronLeft, FileCode2 } from 'lucide-react'
import { PDFDownloadLink, pdf } from '@react-pdf/renderer'
import { useState } from 'react'
import { useFactura, useCambiarEstadoFactura } from '../../api/facturas'
import { usePaciente } from '../../api/pacientes'
import { useEncuentro } from '../../api/encuentros'
import { useMedico } from '../../context/MedicoContext'
import { useGenerarRips, useRips } from '../../api/rips'
import FacturaPDF from '../../components/pdf/FacturaPDF'

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)
}

const colorEstado: Record<string, string> = {
  borrador: 'bg-amber-100 text-amber-700',
  emitida: 'bg-blue-100 text-blue-700',
  pagada: 'bg-green-100 text-green-700',
  anulada: 'bg-red-100 text-red-700',
}

function descargarJSON(datos: unknown, nombre: string) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export default function DetalleFactura() {
  const { id, encId, facturaId } = useParams()
  const navigate = useNavigate()
  const { medico } = useMedico()
  const [imprimiendo, setImprimiendo] = useState(false)

  const { data: factura, isLoading, isError } = useFactura(id ?? '', encId ?? '', facturaId ?? '')
  const { data: paciente } = usePaciente(id ?? '')
  const { data: encuentro } = useEncuentro(id ?? '', encId ?? '')
  const { data: ripsExistente } = useRips(id ?? '', encId ?? '', facturaId ?? '')

  const generarRips = useGenerarRips(id ?? '', encId ?? '', facturaId ?? '')
  const cambiarEstado = useCambiarEstadoFactura(id ?? '', encId ?? '', facturaId ?? '')

  async function handleCambiarEstado(nuevoEstado: 'emitida' | 'pagada' | 'anulada') {
    if (nuevoEstado === 'anulada') {
      if (!window.confirm('¿Seguro que querés anular esta factura? Esta acción no se puede deshacer.')) return
    }
    await cambiarEstado.mutateAsync(nuevoEstado)
  }

  if (isLoading) return <div className="p-6 text-sm text-slate-400">Cargando factura...</div>
  if (isError || !factura) return <div className="p-6 text-sm text-red-500">Error al cargar la factura.</div>

  const pacienteNombre = paciente
    ? [paciente.nombre_primero, paciente.nombre_segundo, paciente.apellido_primero, paciente.apellido_segundo]
        .filter(Boolean).join(' ')
    : factura.paciente_documento

  const diagnostico = encuentro
    ? [encuentro.codigo_diagnostico_principal, encuentro.descripcion_diagnostico].filter(Boolean).join(' - ')
    : ''

  const docPDF = (
    <FacturaPDF
      medico={medico}
      factura={factura}
      pacienteNombre={pacienteNombre}
      diagnostico={diagnostico}
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

  async function handleGenerarRips() {
    if (!medico.nit || !medico.codPrestador) {
      alert('Configurá el NIT y el código de habilitación en la sección Configuración antes de generar RIPS.')
      return
    }
    const resultado = await generarRips.mutateAsync({
      nit: medico.nit,
      codPrestador: medico.codPrestador,
      tipoDiagnosticoPrincipal: '01',
    })
    descargarJSON(resultado.datos_json, `rips_${factura!.paciente_documento}_${Date.now()}.json`)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">Factura</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorEstado[factura.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                {factura.estado.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(factura.fecha_creacion).toLocaleString('es-CO')} · {pacienteNombre}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {factura.estado === 'borrador' && (
            <>
              <button
                onClick={() => handleCambiarEstado('emitida')}
                disabled={cambiarEstado.isPending}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
              >
                Emitir
              </button>
              <button
                onClick={() => handleCambiarEstado('anulada')}
                disabled={cambiarEstado.isPending}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Anular
              </button>
            </>
          )}
          {factura.estado === 'emitida' && (
            <>
              <button
                onClick={() => handleCambiarEstado('pagada')}
                disabled={cambiarEstado.isPending}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
              >
                Registrar pago
              </button>
              <button
                onClick={() => handleCambiarEstado('anulada')}
                disabled={cambiarEstado.isPending}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Anular
              </button>
            </>
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
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">CUPS</th>
              <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Descripción</th>
              <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Cant.</th>
              <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">V. Unit.</th>
              <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {factura.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-mono text-xs text-blue-700">{item.codigo_cups}</td>
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

      {/* RIPS */}
      <div className="card-hce px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="card-title">RIPS (Res. 2275/2023)</h3>
            {ripsExistente ? (
              <p className="text-xs text-slate-400 mt-0.5">
                Último generado: {new Date(ripsExistente.fecha_generacion).toLocaleString('es-CO')}
                {' · '}<span className="text-amber-600">{ripsExistente.estado}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">
                No hay RIPS generado para esta factura.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {ripsExistente && (
              <button
                onClick={() => descargarJSON(ripsExistente.datos_json, `rips_${factura.paciente_documento}.json`)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Download size={14} />
                Descargar último
              </button>
            )}
            <button
              onClick={handleGenerarRips}
              disabled={generarRips.isPending}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-blue-700 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <FileCode2 size={14} />
              {generarRips.isPending ? 'Generando...' : 'Generar RIPS'}
            </button>
          </div>
        </div>
        {generarRips.isError && (
          <p className="mt-2 text-xs text-red-500">{generarRips.error.message}</p>
        )}
        {!medico.nit || !medico.codPrestador ? (
          <p className="mt-2 text-xs text-amber-600">
            Completá el NIT y el código de habilitación en Configuración para generar RIPS.
          </p>
        ) : null}
      </div>
    </div>
  )
}
