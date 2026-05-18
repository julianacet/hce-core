import { useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { useExamenesPredefinidos, CATEGORIAS_EXAMEN, type ExamenPredefinido } from '../api/examenes_predefinidos'

export type ItemOrden = {
  _key: number
  codigo_cups: string | null
  descripcion: string
  indicaciones: string | null
}

const CATEGORIA_BADGE: Record<string, string> = {
  laboratorio: 'bg-blue-100 text-blue-700',
  imagen:      'bg-purple-100 text-purple-700',
  patologia:   'bg-rose-100 text-rose-700',
  otro:        'bg-slate-100 text-slate-600',
}

let _nextKey = 1

function BuscadorExamen({ onAgregar }: { onAgregar: (e: ExamenPredefinido) => void }) {
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const { data: resultados = [], isFetching } = useExamenesPredefinidos(
    q.length >= 2 ? q : undefined,
    categoria || undefined,
  )
  const mostrar = q.length >= 2 || categoria !== ''

  return (
    <div className="relative space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            className="input-hce pl-8 text-sm"
            placeholder="Buscar examen…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <select
          className="input-hce text-sm w-44"
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIAS_EXAMEN).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {mostrar && (
        <div
          className="absolute z-20 top-full mt-1 w-full rounded-lg border shadow-lg overflow-hidden"
          style={{ background: 'var(--hce-card)', borderColor: 'var(--hce-border)' }}
        >
          {isFetching ? (
            <p className="px-3 py-2 text-sm" style={{ color: 'var(--hce-text-muted)' }}>Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-2 text-sm" style={{ color: 'var(--hce-text-muted)' }}>Sin resultados</p>
          ) : (
            <ul className="max-h-52 overflow-y-auto divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              {resultados.map(e => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => { onAgregar(e); setQ('') }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--hce-bg)] transition-colors"
                  >
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${CATEGORIA_BADGE[e.categoria]}`}>
                      {CATEGORIAS_EXAMEN[e.categoria]}
                    </span>
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--hce-text)' }}>{e.nombre}</span>
                    {e.codigo_cups && (
                      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--hce-text-muted)' }}>
                        {e.codigo_cups}
                      </span>
                    )}
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

type Props = {
  items: ItemOrden[]
  setItems: React.Dispatch<React.SetStateAction<ItemOrden[]>>
  indicaciones: string
  setIndicaciones: React.Dispatch<React.SetStateAction<string>>
}

export default function ExamenesTab({ items, setItems, indicaciones, setIndicaciones }: Props) {
  function agregar(e: ExamenPredefinido) {
    setItems(prev => [...prev, {
      _key: _nextKey++,
      codigo_cups: e.codigo_cups ?? null,
      descripcion: e.nombre,
      indicaciones: null,
    }])
  }

  function agregarLibre() {
    setItems(prev => [...prev, { _key: _nextKey++, codigo_cups: null, descripcion: '', indicaciones: null }])
  }

  function actualizar(key: number, campo: 'descripcion' | 'indicaciones', valor: string | null) {
    setItems(prev => prev.map(i => i._key === key ? { ...i, [campo]: valor } : i))
  }

  function quitar(key: number) {
    setItems(prev => prev.filter(i => i._key !== key))
  }

  return (
    <div className="space-y-4">
      <BuscadorExamen onAgregar={agregar} />

      {items.length > 0 && (
        <div className="space-y-2 pt-1">
          {items.map((item, idx) => (
            <div key={item._key} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-5 text-right shrink-0">{idx + 1}.</span>
              {item.codigo_cups && (
                <span className="font-mono text-xs font-semibold shrink-0 w-16"
                      style={{ color: 'var(--hce-primary)' }}>{item.codigo_cups}</span>
              )}
              <input
                className="input-hce text-sm flex-1"
                placeholder="Nombre del examen"
                value={item.descripcion}
                onChange={e => actualizar(item._key, 'descripcion', e.target.value)}
              />
              <input
                className="input-hce text-sm w-44"
                placeholder="Indicaciones (opcional)"
                value={item.indicaciones ?? ''}
                onChange={e => actualizar(item._key, 'indicaciones', e.target.value || null)}
              />
              <button
                type="button"
                onClick={() => quitar(item._key)}
                className="text-slate-400 hover:text-red-500 shrink-0 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={agregarLibre}
        className="flex items-center gap-1.5 text-sm"
        style={{ color: 'var(--hce-primary)' }}
      >
        <Plus className="w-3.5 h-3.5" /> Agregar examen sin código CUPS
      </button>

      <div>
        <label className="label-hce">
          Indicaciones generales <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          className="input-hce text-sm resize-none"
          rows={2}
          placeholder="Ej: Ayuno de 8 horas. Llevar resultados a la próxima consulta."
          value={indicaciones}
          onChange={e => setIndicaciones(e.target.value)}
        />
      </div>
    </div>
  )
}
