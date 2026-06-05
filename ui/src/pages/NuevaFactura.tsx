import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search, Plus, Trash2, UserRound } from 'lucide-react'
import { Breadcrumb } from '../components/Breadcrumb'
import { type Paciente } from '../api/pacientes'
import { useCups, type CupsCodigo } from '../api/cups'
import { useCrearFactura, type FacturaItemInput } from '../api/facturas'
import { useTarifas } from '../api/tarifas'
import { nombreCompleto } from '../utils/paciente'
import { BuscadorPaciente } from '../components/BuscadorPaciente'

type ItemFormulario = FacturaItemInput & { _key: number }

let nextKey = 1

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)
}

export default function NuevaFactura() {
  const navigate = useNavigate()
  const crear = useCrearFactura()

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [busquedaCups, setBusquedaCups] = useState('')
  const [items, setItems] = useState<ItemFormulario[]>([])
  const [fechaFactura, setFechaFactura] = useState('')

  const { data: resultadosCups = [], isFetching: cargandoCups } = useCups(busquedaCups)
  const { data: todasLasTarifas = [] } = useTarifas()

  const mapaPrecios = useMemo(() =>
    new Map(todasLasTarifas.map(t => [t.codigo_cups, t.valor])),
    [todasLasTarifas]
  )

  const total = items.reduce((acc, item) => acc + item.cantidad * item.valor_unitario, 0)

  function seleccionarPaciente(p: Paciente) {
    setPaciente(p)
  }

  function agregarCups(cups: CupsCodigo) {
    setItems((prev) => [...prev, {
      _key: nextKey++,
      codigo_cups: cups.codigo,
      descripcion: cups.descripcion,
      cantidad: 1,
      valor_unitario: mapaPrecios.get(cups.codigo) ?? 0,
    }])
    setBusquedaCups('')
  }

  function actualizarItem(key: number, campo: keyof FacturaItemInput, valor: string | number) {
    setItems((prev) => prev.map((item) =>
      item._key === key ? { ...item, [campo]: valor } : item
    ))
  }

  function quitarItem(key: number) {
    setItems((prev) => prev.filter((item) => item._key !== key))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!paciente) return
    const factura = await crear.mutateAsync({
      paciente_documento: paciente.numero_documento,
      fecha_creacion: fechaFactura,
      items,
    })
    navigate(`/facturas/${factura.factura_id}`)
  }

  return (
    <div className="page-hce">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Facturación', to: '/facturas' }, { label: 'Nueva factura' }]} />
      <div className="page-header">
        <div>
          <h2 className="page-title">Nueva factura</h2>
          <p className="page-desc">Seleccione el paciente y agregue los procedimientos</p>
        </div>
        <button onClick={() => navigate('/facturas')} className="btn-secondary">
          Cancelar
        </button>
      </div>

      <div className="space-y-4">
        {/* Selección de paciente */}
        <div
          className="card-hce px-5 py-4 flex items-center gap-4"
          style={{
            borderColor: paciente ? 'var(--hce-primary)' : 'var(--hce-border)',
            borderLeftWidth: '4px',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: paciente ? 'var(--hce-primary)' : 'var(--hce-bg)' }}
          >
            <UserRound size={18} style={{ color: paciente ? '#fff' : 'var(--hce-text-muted)' }} />
          </div>
          {paciente ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--hce-text)' }}>
                  {nombreCompleto(paciente)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
                  {paciente.tipo_documento} {paciente.numero_documento}
                  {paciente.edad != null ? ` · ${paciente.edad} años` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setPaciente(null); setItems([]) }}
                className="btn-secondary text-xs shrink-0"
              >
                Cambiar paciente
              </button>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
              Selecciona un paciente para habilitar la factura
            </p>
          )}
        </div>

        {!paciente && (
          <BuscadorPaciente
            selectedDocumento={null}
            onSelect={seleccionarPaciente}
          />
        )}

        {/* Buscador CUPS — solo si hay paciente */}
        {paciente && (
          <>
            <div className="card-hce p-5 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Agregar procedimiento CUPS</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={busquedaCups}
                  onChange={(e) => setBusquedaCups(e.target.value)}
                  placeholder="Buscar por código o descripción (mín. 2 caracteres)"
                  className="input-hce pl-9"
                />
              </div>

              {busquedaCups.length >= 2 && (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  {cargandoCups && <p className="px-4 py-3 text-sm text-slate-400">Buscando...</p>}
                  {!cargandoCups && resultadosCups.length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-400">Sin resultados para "{busquedaCups}"</p>
                  )}
                  {resultadosCups.map((cups) => (
                    <button
                      key={cups.codigo}
                      type="button"
                      onClick={() => agregarCups(cups)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--hce-primary-soft)] transition-colors text-left border-b border-slate-100 last:border-0"
                    >
                      <span className="text-xs font-mono font-medium shrink-0" style={{ color: 'var(--hce-primary)' }}>{cups.codigo}</span>
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
                    <thead className="thead-sticky border-b" style={{ borderColor: 'var(--hce-border)' }}>
                      <tr>
                        <th className="th-hce">CUPS</th>
                        <th className="th-hce">Descripción</th>
                        <th className="th-hce th-hce--right w-28">Cant.</th>
                        <th className="th-hce th-hce--right w-36">Valor unit.</th>
                        <th className="th-hce th-hce--right w-32">Subtotal</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr key={item._key}>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--hce-primary)' }}>{item.codigo_cups}</td>
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
                              className="input-hce text-right"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              step={100}
                              value={item.valor_unitario}
                              onChange={(e) => actualizarItem(item._key, 'valor_unitario', parseFloat(e.target.value) || 0)}
                              className="input-hce text-right"
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

                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <label className="label-hce mb-0 whitespace-nowrap text-sm">Fecha de factura</label>
                      <input
                        type="date"
                        value={fechaFactura}
                        onChange={e => setFechaFactura(e.target.value)}
                        className="input-hce w-40"
                      />
                    </div>
                    <button type="submit" disabled={crear.isPending || total === 0 || !fechaFactura} className="btn-primary">
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
          </>
        )}
      </div>
    </div>
  )
}
