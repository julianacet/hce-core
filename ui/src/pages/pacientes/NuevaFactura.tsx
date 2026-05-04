import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Search, Plus, Trash2, ChevronLeft } from 'lucide-react'
import { useCups, type CupsCodigo } from '../../api/cups'
import { useCrearFactura, type FacturaItemInput } from '../../api/facturas'
import { useEncuentro } from '../../api/encuentros'
import { usePaciente } from '../../api/pacientes'

type ItemFormulario = FacturaItemInput & { _key: number }

let nextKey = 1

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)
}

export default function NuevaFactura() {
  const { id, encId } = useParams()
  const navigate = useNavigate()

  const { data: paciente } = usePaciente(id ?? '')
  const { data: encuentro } = useEncuentro(id ?? '', encId ?? '')
  const crear = useCrearFactura(id ?? '', encId ?? '')

  const [busqueda, setBusqueda] = useState('')
  const [items, setItems] = useState<ItemFormulario[]>([])

  const { data: resultadosCups = [], isFetching } = useCups(busqueda)

  const nombrePaciente = paciente
    ? [paciente.nombre_primero, paciente.apellido_primero, paciente.apellido_segundo].filter(Boolean).join(' ')
    : id

  const diagnostico = encuentro
    ? [encuentro.codigo_diagnostico_principal, encuentro.descripcion_diagnostico].filter(Boolean).join(' - ')
    : ''

  function agregarCups(cups: CupsCodigo) {
    setItems((prev) => [...prev, {
      _key: nextKey++,
      codigo_cups: cups.codigo,
      descripcion: cups.descripcion,
      cantidad: 1,
      valor_unitario: 0,
    }])
    setBusqueda('')
  }

  function actualizarItem(key: number, campo: keyof FacturaItemInput, valor: string | number) {
    setItems((prev) => prev.map((item) =>
      item._key === key ? { ...item, [campo]: valor } : item
    ))
  }

  function quitarItem(key: number) {
    setItems((prev) => prev.filter((item) => item._key !== key))
  }

  const total = items.reduce((acc, item) => acc + item.cantidad * item.valor_unitario, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const factura = await crear.mutateAsync({ items })
    navigate(`/pacientes/${id}/encuentros/${encId}/facturas/${factura.factura_id}`)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="card-hce px-5 py-4">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
          <ChevronLeft size={14} /> Volver al encuentro
        </button>
        <h3 className="card-title">Nueva factura</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {nombrePaciente}{diagnostico ? ` · ${diagnostico}` : ''}
        </p>
      </div>

      {/* Buscador CUPS */}
      <div className="card-hce p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Agregar procedimiento CUPS</p>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o descripción (mín. 2 caracteres)"
            className="input-hce pl-9"
          />
        </div>

        {busqueda.length >= 2 && (
          <div className="border border-slate-200 rounded-md overflow-hidden">
            {isFetching && (
              <p className="px-4 py-3 text-sm text-slate-400">Buscando...</p>
            )}
            {!isFetching && resultadosCups.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">Sin resultados para "{busqueda}"</p>
            )}
            {resultadosCups.map((cups) => (
              <button
                key={cups.codigo}
                type="button"
                onClick={() => agregarCups(cups)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left border-b border-slate-100 last:border-0"
              >
                <span className="text-xs font-mono font-medium text-blue-700 shrink-0">{cups.codigo}</span>
                <span className="text-sm text-slate-700 truncate">{cups.descripcion}</span>
                <Plus size={14} className="text-slate-400 shrink-0 ml-auto" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabla de items */}
      {items.length > 0 && (
        <form onSubmit={handleSubmit}>
          <div className="card-hce overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">CUPS</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Descripción</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium w-20">Cant.</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium w-36">Valor unit.</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium w-32">Subtotal</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item._key}>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">{item.codigo_cups}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) => actualizarItem(item._key, 'descripcion', e.target.value)}
                        className="input-hce"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(item._key, 'cantidad', parseInt(e.target.value) || 1)}
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={item.valor_unitario}
                        onChange={(e) => actualizarItem(item._key, 'valor_unitario', parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700">
                      {formatCOP(item.cantidad * item.valor_unitario)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" onClick={() => quitarItem(item._key)}
                        className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-700 text-right">Total</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-800">{formatCOP(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>

            {crear.isError && (
              <p className="form-error">
                {(crear.error as Error)?.message ?? 'Error al guardar la factura.'}
              </p>
            )}

            <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => navigate(-1)} disabled={crear.isPending}
                className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={crear.isPending || total === 0}
                className="btn-primary">
                {crear.isPending ? 'Guardando...' : 'Guardar factura'}
              </button>
            </div>
          </div>
        </form>
      )}

      {items.length === 0 && (
        <p className="text-center text-sm text-slate-400 py-4">
          Usa el buscador para agregar procedimientos a la factura.
        </p>
      )}
    </div>
  )
}
