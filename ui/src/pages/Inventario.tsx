import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, RefreshCw, X, PackageOpen } from 'lucide-react'
import { Breadcrumb } from '../components/Breadcrumb'
import {
  useInsumos, useMovimientos,
  useCrearInsumo, useActualizarInsumo, useDesactivarInsumo, useRegistrarMovimiento,
} from '../api/insumos'
import { useConfirmar } from '../components/ModalConfirmar'
import type { Insumo, InsumoInput } from '../api/insumos'

// ── Helpers ───────────────────────────────────────────────────────────────────


const TIPO_ICON = { entrada: ArrowDownCircle, salida: ArrowUpCircle, ajuste: RefreshCw }
const TIPO_COLOR: Record<string, string> = {
  entrada: 'text-green-600',
  salida: 'text-red-500',
  ajuste: 'text-[var(--hce-primary)]',
}

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// ── Modal envoltorio ──────────────────────────────────────────────────────────

function Modal({
  titulo,
  ancho = 'max-w-lg',
  onCerrar,
  children,
}: {
  titulo: string
  ancho?: string
  onCerrar: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCerrar}
    >
      <div
        className={`card-hce w-full ${ancho} max-h-[90vh] overflow-y-auto shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--hce-border)' }}>
          <h3 className="card-title">{titulo}</h3>
          <button onClick={onCerrar} className="btn-icon"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Formulario insumo ─────────────────────────────────────────────────────────

function FormInsumo({
  inicial,
  onGuardar,
  onCancelar,
  cargando,
  error,
}: {
  inicial?: Insumo
  onGuardar: (v: InsumoInput) => void
  onCancelar: () => void
  cargando: boolean
  error?: string
}) {
  const [form, setForm] = useState<InsumoInput>({
    nombre: inicial?.nombre ?? '',
    descripcion: inicial?.descripcion ?? undefined,
    unidad: inicial?.unidad ?? '',
    stock_minimo: 0,
    lote: inicial?.lote ?? undefined,
    registro_invima: inicial?.registro_invima ?? undefined,
    fecha_compra: inicial?.fecha_compra ? inicial.fecha_compra.slice(0, 10) : undefined,
    fecha_vencimiento: inicial?.fecha_vencimiento ? inicial.fecha_vencimiento.slice(0, 10) : undefined,
  })

  const setOpt = (k: keyof InsumoInput, v: string) =>
    setForm((f) => ({ ...f, [k]: v || undefined }))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-hce">Nombre *</label>
          <input
            className="input-hce"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Guantes de látex"
          />
        </div>
        <div>
          <label className="label-hce">Unidad *</label>
          <input
            className="input-hce"
            value={form.unidad}
            onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
            placeholder="caja, unidad, ml..."
          />
        </div>
      </div>

      <div>
        <label className="label-hce">Descripción <span className="text-slate-400">(opcional)</span></label>
        <input
          className="input-hce"
          value={form.descripcion ?? ''}
          onChange={(e) => setOpt('descripcion', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-hce">Lote <span className="text-slate-400">(opcional)</span></label>
          <input
            className="input-hce"
            value={form.lote ?? ''}
            onChange={(e) => setOpt('lote', e.target.value)}
          />
        </div>
        <div>
          <label className="label-hce">Registro INVIMA <span className="text-slate-400">(opcional)</span></label>
          <input
            className="input-hce"
            value={form.registro_invima ?? ''}
            onChange={(e) => setOpt('registro_invima', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-hce">Fecha de compra <span className="text-slate-400">(opcional)</span></label>
          <input
            type="date"
            className="input-hce"
            value={form.fecha_compra ?? ''}
            onChange={(e) => setOpt('fecha_compra', e.target.value)}
          />
        </div>
        <div>
          <label className="label-hce">Fecha de vencimiento <span className="text-slate-400">(opcional)</span></label>
          <input
            type="date"
            className="input-hce"
            value={form.fecha_vencimiento ?? ''}
            onChange={(e) => setOpt('fecha_vencimiento', e.target.value)}
          />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancelar} className="btn-secondary">
          Cancelar
        </button>
        <button
          type="button"
          disabled={cargando || !form.nombre.trim() || !form.unidad.trim()}
          onClick={() => onGuardar(form)}
          className="btn-primary"
        >
          {cargando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Modal de movimientos ──────────────────────────────────────────────────────

function ModalMovimiento({ insumo, onCerrar }: { insumo: Insumo; onCerrar: () => void }) {
  const [tipoMov, setTipoMov] = useState<'entrada' | 'salida' | 'ajuste'>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [notas, setNotas] = useState('')
  const [errorMov, setErrorMov] = useState('')

  const { data: movimientos = [] } = useMovimientos(insumo.id)
  const registrar = useRegistrarMovimiento(insumo.id)

  async function handleMovimiento() {
    const cant = parseFloat(cantidad)
    if (!cant || cant <= 0) { setErrorMov('Ingrese una cantidad válida'); return }
    setErrorMov('')
    try {
      await registrar.mutateAsync({ tipo: tipoMov, cantidad: cant, notas: notas.trim() || undefined })
      setCantidad('')
      setNotas('')
    } catch (e) {
      setErrorMov(e instanceof Error ? e.message : 'Error al registrar movimiento')
    }
  }

  return (
    <Modal titulo={`Movimiento — ${insumo.nombre}`} ancho="max-w-xl" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="flex items-center gap-6 rounded-lg px-4 py-2.5 text-sm" style={{ backgroundColor: 'var(--hce-bg)' }}>
          <span style={{ color: 'var(--hce-text-muted)' }}>Stock actual:</span>
          <span className="font-semibold" style={{ color: 'var(--hce-text)' }}>
            {insumo.stock_actual} {insumo.unidad}
          </span>
        </div>

        <div className="flex gap-2">
          {(['entrada', 'salida', 'ajuste'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipoMov(t)}
              className={`flex-1 text-xs py-1.5 rounded-md border font-medium capitalize transition-colors ${
                tipoMov === t
                  ? 'border-[var(--hce-primary)] bg-[var(--hce-primary-soft)] text-[var(--hce-primary)]'
                  : 'border-[var(--hce-border)] text-[var(--hce-text-muted)] hover:border-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
          {tipoMov === 'entrada' && 'Suma al total de existencias.'}
          {tipoMov === 'salida' && 'Resta del total de existencias.'}
          {tipoMov === 'ajuste' && 'Establece el total de existencias directamente.'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-hce">{tipoMov === 'ajuste' ? 'Nueva cantidad' : 'Cantidad'}</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="0"
              className="input-hce"
            />
          </div>
          <div>
            <label className="label-hce">Notas <span className="text-slate-400">(opcional)</span></label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Compra, vencimiento..."
              className="input-hce"
            />
          </div>
        </div>

        {errorMov && <p className="form-error">{errorMov}</p>}

        <button
          onClick={handleMovimiento}
          disabled={registrar.isPending || !cantidad}
          className="btn-primary w-full justify-center"
        >
          {registrar.isPending ? 'Registrando...' : `Registrar ${tipoMov}`}
        </button>

        {movimientos.length > 0 && (
          <div className="pt-2">
            <p className="section-title">Historial</p>
            <div className="space-y-2">
              {movimientos.map((m) => {
                const Icon = TIPO_ICON[m.tipo as keyof typeof TIPO_ICON] ?? RefreshCw
                return (
                  <div key={m.id} className="flex items-start gap-3 text-xs">
                    <Icon size={13} className={`mt-0.5 shrink-0 ${TIPO_COLOR[m.tipo] ?? 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium capitalize" style={{ color: 'var(--hce-text)' }}>{m.tipo}</span>
                      <span style={{ color: 'var(--hce-text-muted)' }}>
                        {' · '}{m.cantidad} {insumo.unidad} → {m.stock_resultante} total
                      </span>
                      {m.notas && (
                        <p className="truncate mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>{m.notas}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0" style={{ color: 'var(--hce-text-muted)' }}>
                      <p>{new Date(m.fecha_movimiento).toLocaleDateString('es-CO')}</p>
                      <p>{m.creado_por}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Inventario() {
  const [busqueda, setBusqueda] = useState('')
  const [modalCrear, setModalCrear] = useState(false)
  const [editando, setEditando] = useState<Insumo | null>(null)
  const [movimiento, setMovimiento] = useState<Insumo | null>(null)
  const { confirmar, modal: modalConfirmar } = useConfirmar()

  const { data: insumos = [], isLoading } = useInsumos(busqueda)
  const crear = useCrearInsumo()
  const actualizar = useActualizarInsumo(editando?.id ?? '')
  const desactivar = useDesactivarInsumo()

  return (
    <div className="page-hce space-y-6">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Inventario' }]} />
      <div className="page-header">
        <div>
          <h2 className="page-title">Inventario de insumos</h2>
          <p className="page-desc">Control de existencias del consultorio</p>
        </div>
        <button onClick={() => setModalCrear(true)} className="btn-primary">
          <Plus size={15} />
          Nuevo insumo
        </button>
      </div>

      <div className="relative w-72">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar insumo..."
          className="input-hce pl-8"
        />
      </div>

      <div className="card-hce overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>
            Cargando...
          </div>
        ) : insumos.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <PackageOpen size={36} className="mx-auto mb-2" style={{ color: 'var(--hce-border)' }} />
            <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
              {busqueda ? 'Sin resultados.' : 'Aún no hay insumos registrados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b" style={{ borderColor: 'var(--hce-border)', backgroundColor: 'var(--hce-bg)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--hce-text-muted)' }}>Insumo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--hce-text-muted)' }}>Lote</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--hce-text-muted)' }}>Reg. INVIMA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--hce-text-muted)' }}>Unidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--hce-text-muted)' }}>F. Compra</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--hce-text-muted)' }}>F. Vencimiento</th>
                  <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--hce-text-muted)' }}>Existencias</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {insumos.map((insumo) => (
                    <tr key={insumo.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--hce-text)' }}>{insumo.nombre}</p>
                        {insumo.descripcion && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>{insumo.descripcion}</p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                        {insumo.lote ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                        {insumo.registro_invima ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                        {insumo.unidad}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                        {fmtFecha(insumo.fecha_compra)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                        {fmtFecha(insumo.fecha_vencimiento)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold" style={{ color: 'var(--hce-text)' }}>
                          {insumo.stock_actual}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            title="Registrar movimiento"
                            onClick={() => setMovimiento(insumo)}
                            className="btn-icon"
                          >
                            <ArrowDownCircle size={14} />
                          </button>
                          <button
                            title="Editar"
                            onClick={() => setEditando(insumo)}
                            className="btn-icon"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            title="Eliminar"
                            onClick={() =>
                              confirmar(
                                `¿Eliminar el insumo "${insumo.nombre}"? Esta acción no se puede deshacer.`,
                                () => desactivar.mutateAsync(insumo.id),
                              )
                            }
                            className="btn-icon"
                            style={{ color: 'var(--hce-danger)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalCrear && (
        <Modal titulo="Nuevo insumo" onCerrar={() => setModalCrear(false)}>
          <FormInsumo
            onGuardar={async (v) => { await crear.mutateAsync(v); setModalCrear(false) }}
            onCancelar={() => setModalCrear(false)}
            cargando={crear.isPending}
            error={crear.error?.message}
          />
        </Modal>
      )}

      {editando && (
        <Modal titulo="Editar insumo" onCerrar={() => setEditando(null)}>
          <FormInsumo
            inicial={editando}
            onGuardar={async (v) => { await actualizar.mutateAsync(v); setEditando(null) }}
            onCancelar={() => setEditando(null)}
            cargando={actualizar.isPending}
            error={actualizar.error?.message}
          />
        </Modal>
      )}

      {movimiento && (
        <ModalMovimiento
          key={movimiento.id}
          insumo={movimiento}
          onCerrar={() => setMovimiento(null)}
        />
      )}

      {modalConfirmar}
    </div>
  )
}
