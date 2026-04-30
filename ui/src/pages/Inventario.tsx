import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, RefreshCw, X, PackageOpen } from 'lucide-react'
import {
  useInsumos, useMovimientos,
  useCrearInsumo, useActualizarInsumo, useDesactivarInsumo, useRegistrarMovimiento,
} from '../api/insumos'
import type { Insumo, InsumoInput, MovimientoInput } from '../api/insumos'

// ── Helpers ───────────────────────────────────────────────────────────────────

function estadoExistencias(insumo: Insumo) {
  if (insumo.stock_actual === 0) return 'agotado'
  if (insumo.stock_actual <= insumo.stock_minimo) return 'bajo'
  return 'ok'
}

const BADGE: Record<string, string> = {
  agotado: 'bg-red-100 text-red-700',
  bajo: 'bg-amber-100 text-amber-700',
  ok: 'bg-green-100 text-green-700',
}
const BADGE_LABEL: Record<string, string> = {
  agotado: 'Agotado',
  bajo: 'Existencias bajas',
  ok: 'Ok',
}

const TIPO_ICON: Record<string, React.ElementType> = {
  entrada: ArrowDownCircle,
  salida: ArrowUpCircle,
  ajuste: RefreshCw,
}
const TIPO_COLOR: Record<string, string> = {
  entrada: 'text-green-600',
  salida: 'text-red-500',
  ajuste: 'text-blue-600',
}

// ── Formulario de insumo ──────────────────────────────────────────────────────

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
    descripcion: inicial?.descripcion ?? '',
    unidad: inicial?.unidad ?? '',
    stock_minimo: inicial?.stock_minimo ?? 0,
  })

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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-hce">Descripción <span className="text-slate-400">(opcional)</span></label>
          <input
            className="input-hce"
            value={form.descripcion ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          />
        </div>
        <div>
          <label className="label-hce">Existencias mínimas</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input-hce"
            value={form.stock_minimo}
            onChange={(e) => setForm((f) => ({ ...f, stock_minimo: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancelar}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={cargando || !form.nombre.trim() || !form.unidad.trim()}
          onClick={() => onGuardar(form)}
          className="text-sm px-3 py-1.5 rounded-md bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40"
        >
          {cargando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Panel de detalle ──────────────────────────────────────────────────────────

function DetalleInsumo({ insumo, onCerrar }: { insumo: Insumo; onCerrar: () => void }) {
  const [editando, setEditando] = useState(false)
  const [tipoMov, setTipoMov] = useState<'entrada' | 'salida' | 'ajuste'>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [notas, setNotas] = useState('')
  const [errorMov, setErrorMov] = useState('')

  const { data: movimientos = [] } = useMovimientos(insumo.id)
  const actualizar = useActualizarInsumo(insumo.id)
  const desactivar = useDesactivarInsumo()
  const registrar = useRegistrarMovimiento(insumo.id)

  const estado = estadoExistencias(insumo)

  async function handleMovimiento() {
    const cant = parseFloat(cantidad)
    if (!cant || cant <= 0) { setErrorMov('Ingresa una cantidad válida'); return }
    setErrorMov('')
    try {
      const input: MovimientoInput = {
        tipo: tipoMov,
        cantidad: cant,
        notas: notas.trim() || undefined,
      }
      await registrar.mutateAsync(input)
      setCantidad('')
      setNotas('')
    } catch (e: unknown) {
      setErrorMov(e instanceof Error ? e.message : 'Error al registrar movimiento')
    }
  }

  async function handleDesactivar() {
    if (!confirm(`¿Eliminar el insumo "${insumo.nombre}"? Esta acción no se puede deshacer.`)) return
    await desactivar.mutateAsync(insumo.id)
    onCerrar()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">

      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{insumo.nombre}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[estado]}`}>
              {BADGE_LABEL[estado]}
            </span>
          </div>
          {insumo.descripcion && <p className="text-xs text-slate-400 mt-0.5">{insumo.descripcion}</p>}
        </div>
        <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Existencias */}
      <div className="px-5 py-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-slate-800">{insumo.stock_actual}</p>
          <p className="text-xs text-slate-400 mt-0.5">Existencias actuales</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-500">{insumo.stock_minimo}</p>
          <p className="text-xs text-slate-400 mt-0.5">Existencias mínimas</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-600">{insumo.unidad}</p>
          <p className="text-xs text-slate-400 mt-0.5">Unidad</p>
        </div>
      </div>

      {/* Editar insumo */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Datos del insumo</p>
          <div className="flex gap-2">
            <button
              onClick={() => setEditando((v) => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700"
            >
              <Pencil size={12} />
              Editar
            </button>
            <button
              onClick={handleDesactivar}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
            >
              <Trash2 size={12} />
              Eliminar
            </button>
          </div>
        </div>
        {editando && (
          <FormInsumo
            inicial={insumo}
            onGuardar={async (v) => {
              await actualizar.mutateAsync(v)
              setEditando(false)
            }}
            onCancelar={() => setEditando(false)}
            cargando={actualizar.isPending}
            error={actualizar.error?.message}
          />
        )}
      </div>

      {/* Registrar movimiento */}
      <div className="px-5 py-4 space-y-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Registrar movimiento</p>

        <div className="flex gap-2">
          {(['entrada', 'salida', 'ajuste'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipoMov(t)}
              className={`flex-1 text-xs py-1.5 rounded-md border font-medium capitalize transition-colors ${
                tipoMov === t
                  ? 'border-blue-700 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400">
          {tipoMov === 'entrada' && 'Suma al total de existencias.'}
          {tipoMov === 'salida' && 'Resta del total de existencias.'}
          {tipoMov === 'ajuste' && 'Establece el total de existencias directamente.'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-hce">
              {tipoMov === 'ajuste' ? 'Nueva cantidad' : 'Cantidad'}
            </label>
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

        {errorMov && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{errorMov}</p>
        )}

        <button
          onClick={handleMovimiento}
          disabled={registrar.isPending || !cantidad}
          className="w-full text-sm py-2 rounded-md bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40 transition-colors"
        >
          {registrar.isPending ? 'Registrando...' : `Registrar ${tipoMov}`}
        </button>
      </div>

      {/* Historial de movimientos */}
      <div className="px-5 py-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Historial</p>
        {movimientos.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Sin movimientos registrados.</p>
        ) : (
          <div className="space-y-2">
            {movimientos.map((m) => {
              const Icon = TIPO_ICON[m.tipo] ?? RefreshCw
              return (
                <div key={m.id} className="flex items-start gap-3 text-xs">
                  <Icon size={14} className={`mt-0.5 shrink-0 ${TIPO_COLOR[m.tipo] ?? 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-700 capitalize">{m.tipo}</span>
                    <span className="text-slate-500"> · {m.cantidad} {insumo.unidad}</span>
                    <span className="text-slate-400"> → {m.stock_resultante} en total</span>
                    {m.notas && <p className="text-slate-400 truncate mt-0.5">{m.notas}</p>}
                  </div>
                  <div className="text-right shrink-0 text-slate-400">
                    <p>{new Date(m.fecha_movimiento).toLocaleDateString('es-CO')}</p>
                    <p>{m.creado_por}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Inventario() {
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [seleccionado, setSeleccionado] = useState<Insumo | null>(null)

  const { data: insumos = [], isLoading } = useInsumos(busqueda)
  const crear = useCrearInsumo()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Inventario de insumos</h2>
          <p className="text-sm text-slate-400 mt-0.5">Control de existencias del consultorio</p>
        </div>
        <button
          onClick={() => { setCreando(true); setSeleccionado(null) }}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={15} />
          Nuevo insumo
        </button>
      </div>

      <div className="grid grid-cols-5 gap-6 items-start">

        {/* Columna izquierda — lista */}
        <div className="col-span-2 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar insumo..."
              className="input-hce pl-8"
            />
          </div>

          {/* Formulario de creación */}
          {creando && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Nuevo insumo</p>
              <FormInsumo
                onGuardar={async (v) => {
                  await crear.mutateAsync(v)
                  setCreando(false)
                }}
                onCancelar={() => setCreando(false)}
                cargando={crear.isPending}
                error={crear.error?.message}
              />
            </div>
          )}

          {/* Lista */}
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {isLoading && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Cargando...</div>
            )}
            {!isLoading && insumos.length === 0 && (
              <div className="px-5 py-10 text-center">
                <PackageOpen size={32} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">
                  {busqueda ? 'Sin resultados.' : 'Aún no hay insumos registrados.'}
                </p>
              </div>
            )}
            {insumos.map((insumo) => {
              const estado = estadoExistencias(insumo)
              const activo = seleccionado?.id === insumo.id
              return (
                <button
                  key={insumo.id}
                  onClick={() => { setSeleccionado(insumo); setCreando(false) }}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors ${activo ? 'bg-blue-50' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{insumo.nombre}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {insumo.stock_actual} {insumo.unidad}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${BADGE[estado]}`}>
                    {BADGE_LABEL[estado]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Columna derecha — detalle */}
        <div className="col-span-3">
          {seleccionado ? (
            <DetalleInsumo
              key={seleccionado.id}
              insumo={seleccionado}
              onCerrar={() => setSeleccionado(null)}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-center">
              <PackageOpen size={40} className="text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">Selecciona un insumo para ver su detalle</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
