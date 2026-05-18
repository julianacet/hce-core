import { useState, useRef } from 'react'
import { DollarSign, Plus, Search, Pencil, X, Check, Power, Trash2 } from 'lucide-react'
import { Breadcrumb } from '../components/Breadcrumb'
import { useCups, type CupsCodigo } from '../api/cups'
import {
  useTarifas,
  useCrearTarifa,
  useActualizarTarifa,
  useToggleTarifa,
  useEliminarTarifa,
  type Tarifa,
  type TarifaInput,
} from '../api/tarifas'
import { RowMenu } from '../components/RowMenu'

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(valor)
}

// ── Buscador de CUPS para seleccionar al crear ────────────────────────────────

function SelectorCups({ onSeleccionar }: { onSeleccionar: (c: CupsCodigo) => void }) {
  const [q, setQ] = useState('')
  const { data: resultados = [], isFetching } = useCups(q)
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
        <input
          ref={ref}
          className="input-hce pl-8"
          placeholder="Buscar código o nombre del procedimiento…"
          value={q}
          onChange={e => setQ(e.target.value)}
          autoFocus
        />
      </div>
      {q.length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border shadow-lg overflow-hidden"
             style={{ background: 'var(--hce-card)', borderColor: 'var(--hce-border)' }}>
          {isFetching ? (
            <p className="px-3 py-2 text-sm" style={{ color: 'var(--hce-text-muted)' }}>Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-2 text-sm" style={{ color: 'var(--hce-text-muted)' }}>Sin resultados</p>
          ) : (
            <ul className="max-h-56 overflow-y-auto divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              {resultados.map(c => (
                <li key={c.codigo}>
                  <button
                    type="button"
                    onClick={() => { onSeleccionar(c); setQ('') }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--hce-bg)] transition-colors"
                  >
                    <span className="text-xs font-mono font-semibold shrink-0"
                          style={{ color: 'var(--hce-primary)' }}>{c.codigo}</span>
                    <span className="text-sm truncate" style={{ color: 'var(--hce-text)' }}>{c.descripcion}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ── Formulario de nueva tarifa ────────────────────────────────────────────────

function FormNuevaTarifa({ onCancelar }: { onCancelar: () => void }) {
  const crear = useCrearTarifa()
  const [cups, setCups] = useState<CupsCodigo | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [valor, setValor] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cups) { setError('Selecciona un procedimiento CUPS'); return }
    const v = parseFloat(valor)
    if (isNaN(v) || v < 0) { setError('El valor debe ser un número mayor o igual a cero'); return }
    setError('')
    try {
      const input: TarifaInput = {
        codigo_cups: cups.codigo,
        descripcion: descripcion.trim() || null,
        valor: v,
        notas: notas.trim() || null,
      }
      await crear.mutateAsync(input)
      onCancelar()
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear la tarifa')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-hce p-5 space-y-4">
      <h3 className="card-title">Nueva tarifa</h3>

      {!cups ? (
        <div>
          <label className="label-hce">Procedimiento CUPS *</label>
          <SelectorCups onSeleccionar={c => { setCups(c); setDescripcion('') }} />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg"
             style={{ background: 'var(--hce-bg)', border: '1px solid var(--hce-border)' }}>
          <div>
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--hce-primary)' }}>
              {cups.codigo}
            </span>
            <p className="text-sm mt-0.5" style={{ color: 'var(--hce-text)' }}>{cups.descripcion}</p>
          </div>
          <button type="button" onClick={() => setCups(null)}
                  className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label-hce">Nombre en factura <span className="font-normal text-xs">(opcional — si difiere del nombre CUPS)</span></label>
          <input className="input-hce" value={descripcion}
                 onChange={e => setDescripcion(e.target.value)}
                 placeholder={cups?.descripcion ?? 'Ej: Consulta médica general'} />
        </div>
        <div>
          <label className="label-hce">Valor (COP) *</label>
          <input className="input-hce" type="number" min="0" step="1000" required
                 value={valor} onChange={e => setValor(e.target.value)}
                 placeholder="50000" />
        </div>
        <div>
          <label className="label-hce">Notas internas</label>
          <input className="input-hce" value={notas}
                 onChange={e => setNotas(e.target.value)}
                 placeholder="Ej: incluye IVA" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={crear.isPending} className="btn-primary">
          {crear.isPending ? 'Guardando…' : 'Guardar tarifa'}
        </button>
      </div>
    </form>
  )
}

// ── Fila editable inline ──────────────────────────────────────────────────────

function FilaTarifa({ t, isAdmin }: { t: Tarifa; isAdmin: boolean }) {
  const actualizar = useActualizarTarifa(t.id)
  const toggle = useToggleTarifa(t.id)
  const eliminar = useEliminarTarifa()

  const [editando, setEditando] = useState(false)
  const [descripcion, setDescripcion] = useState(t.descripcion ?? '')
  const [valor, setValor] = useState(String(t.valor))
  const [notas, setNotas] = useState(t.notas ?? '')

  async function guardar() {
    const v = parseFloat(valor)
    if (isNaN(v) || v < 0) return
    await actualizar.mutateAsync({
      codigo_cups: t.codigo_cups,
      descripcion: descripcion.trim() || null,
      valor: v,
      notas: notas.trim() || null,
    })
    setEditando(false)
  }

  function cancelar() {
    setDescripcion(t.descripcion ?? '')
    setValor(String(t.valor))
    setNotas(t.notas ?? '')
    setEditando(false)
  }

  async function handleEliminar() {
    if (!confirm(`¿Eliminar la tarifa de ${t.codigo_cups}? Esta acción no se puede deshacer.`)) return
    await eliminar.mutateAsync(t.id)
  }

  if (editando) {
    return (
      <tr style={{ background: 'var(--hce-bg)' }}>
        <td className="px-4 py-2">
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--hce-primary)' }}>
            {t.codigo_cups}
          </span>
          <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--hce-text-muted)' }}>
            {t.descripcion_cups}
          </p>
        </td>
        <td className="px-4 py-2">
          <input className="input-hce text-sm py-1"
                 value={descripcion} onChange={e => setDescripcion(e.target.value)}
                 placeholder={t.descripcion_cups} />
        </td>
        <td className="px-4 py-2">
          <input className="input-hce text-sm py-1 w-32" type="number" min="0" step="1000"
                 value={valor} onChange={e => setValor(e.target.value)} />
        </td>
        <td className="px-4 py-2">
          <input className="input-hce text-sm py-1"
                 value={notas} onChange={e => setNotas(e.target.value)} />
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-1">
            <button onClick={guardar} disabled={actualizar.isPending}
                    className="p-1.5 rounded text-green-600 hover:bg-green-50" title="Guardar">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={cancelar}
                    className="p-1.5 rounded text-slate-500 hover:bg-slate-100" title="Cancelar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={!t.esta_activo ? 'opacity-50' : undefined}>
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--hce-primary)' }}>
          {t.codigo_cups}
        </span>
        <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--hce-text-muted)' }}>
          {t.descripcion_cups}
        </p>
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--hce-text)' }}>
        {t.descripcion || <span style={{ color: 'var(--hce-text-muted)' }}>—</span>}
      </td>
      <td className="px-4 py-3 text-sm font-medium tabular-nums" style={{ color: 'var(--hce-text)' }}>
        {formatCOP(t.valor)}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--hce-text-muted)' }}>
        {t.notas || '—'}
      </td>
      <td className="px-4 py-3">
        <RowMenu
          items={[
            { label: 'Editar', icon: <Pencil className="w-3.5 h-3.5" />, onClick: () => setEditando(true) },
            {
              label: t.esta_activo ? 'Desactivar' : 'Activar',
              icon: <Power className="w-3.5 h-3.5" />,
              onClick: () => toggle.mutate(),
            },
            ...(isAdmin ? [{
              label: 'Eliminar',
              icon: <Trash2 className="w-3.5 h-3.5" />,
              onClick: handleEliminar,
              danger: true,
            }] : []),
          ]}
          loading={toggle.isPending || eliminar.isPending}
        />
      </td>
    </tr>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Tarifas() {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarInactivas, setMostrarInactivas] = useState(false)
  const [creando, setCreando] = useState(false)

  // TODO: leer rol desde contexto cuando esté disponible
  const isAdmin = true

  const { data: tarifas = [], isLoading } = useTarifas(
    busqueda || undefined,
    mostrarInactivas || undefined,
  )

  return (
    <div className="page-hce space-y-5">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Tarifas' }]} />

      <div className="page-header">
        <div>
          <h2 className="page-title">Tarifas de procedimientos</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
            Valor por código CUPS — se sugiere automáticamente al facturar
          </p>
        </div>
        <button onClick={() => setCreando(true)} disabled={creando} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva tarifa
        </button>
      </div>

      {creando && <FormNuevaTarifa onCancelar={() => setCreando(false)} />}

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <input className="input-hce pl-8" placeholder="Buscar por código o nombre…"
                 value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none"
               style={{ color: 'var(--hce-text-muted)' }}>
          <input type="checkbox" className="rounded"
                 checked={mostrarInactivas} onChange={e => setMostrarInactivas(e.target.checked)} />
          Mostrar inactivas
        </label>
        {tarifas.length > 0 && (
          <span className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
            {tarifas.length} {tarifas.length === 1 ? 'tarifa' : 'tarifas'}
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="card-hce overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>
            Cargando…
          </div>
        ) : tarifas.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
              {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay tarifas registradas aún.'}
            </p>
            {!busqueda && !creando && (
              <button onClick={() => setCreando(true)} className="btn-primary mt-4">
                <Plus className="w-4 h-4" /> Agregar primera tarifa
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--hce-border)' }}>
                  <th className="th-hce">Código CUPS</th>
                  <th className="th-hce">Nombre en factura</th>
                  <th className="th-hce">Valor</th>
                  <th className="th-hce">Notas</th>
                  <th className="th-hce w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--hce-border)' }}>
                {tarifas.map(t => (
                  <FilaTarifa key={t.id} t={t} isAdmin={isAdmin} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
