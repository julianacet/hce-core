import { useState, useEffect, useRef } from 'react'
import { X, Plus, FileText, Pencil } from 'lucide-react'
import { useBuscarDiagnosticos } from '../api/diagnosticos'
import type { DiagnosticoItem } from '../api/encuentros'
import { DEBOUNCE_MS } from '../utils/constants'

const TIPO_OPTIONS: { value: DiagnosticoItem['tipo']; label: string }[] = [
  { value: 'principal', label: 'Principal' },
  { value: 'relacionado', label: 'Relacionado' },
  { value: 'secundario', label: 'Secundario' },
]

const TIPO_CLINICO_OPTIONS = [
  { value: '01', label: '01 · Impresión' },
  { value: '02', label: '02 · Confirmado nuevo' },
  { value: '03', label: '03 · Confirmado repetido' },
]

export const TIPO_LABEL: Record<string, string> = {
  impresion: 'Impresión diagnóstica',
  principal: 'Principal',
  relacionado: 'Relacionado',
  secundario: 'Secundario',
  nota: 'Nota clínica',
}

const TIPO_CLINICO_LABEL: Record<string, string> = {
  '01': 'Impresión',
  '02': 'Confirmado nuevo',
  '03': 'Confirmado repetido',
}

const SEL_CLS =
  'shrink-0 rounded-lg border border-slate-200 bg-white text-sm px-2 py-1.5 ' +
  'text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--hce-primary)] cursor-pointer'

function CieSearch({ onSelect, autoFocus }: { onSelect: (codigo: string, descripcion: string) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState('')
  const [qD, setQD] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setQD(q), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [q])

  const { data: res = [], isFetching } = useBuscarDiagnosticos(qD)

  useEffect(() => {
    setShowDrop(qD.trim().length >= 2 && res.length > 0)
  }, [res, qD])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setShowDrop(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => qD.length >= 2 && res.length > 0 && setShowDrop(true)}
        placeholder="Buscar CIE-10 o nombre…"
        className="input-hce text-sm w-full"
        autoFocus={autoFocus}
      />
      {isFetching && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">…</span>}
      {showDrop && (
        <div ref={dropRef} className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {res.map(r => (
            <button
              key={r.codigo}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                onSelect(r.codigo, r.nombre)
                setQ('')
                setShowDrop(false)
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-baseline gap-2 text-sm"
            >
              <span className="font-mono text-xs text-slate-500 shrink-0">{r.codigo}</span>
              <span className="text-slate-800">{r.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  value: DiagnosticoItem[]
  onChange: (items: DiagnosticoItem[]) => void
  disabled?: boolean
}

export default function DiagnosticoSearch({ value, onChange, disabled }: Props) {
  function update(i: number, patch: Partial<DiagnosticoItem>) {
    onChange(value.map((d, idx) => idx === i ? { ...d, ...patch } : d))
  }

  function quitar(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  function agregar() {
    const tipo: DiagnosticoItem['tipo'] = value.some(d => d.tipo === 'principal' || d.tipo === 'impresion')
      ? 'relacionado'
      : 'principal'
    onChange([...value, { tipo, tipo_clinico: '01', descripcion: '' }])
  }

  function agregarNota() {
    onChange([...value, { tipo: 'nota', descripcion: '' }])
  }

  if (disabled) {
    return (
      <div className="divide-y divide-slate-100">
        {value.map((d, i) => {
          const tipoCls =
            d.tipo === 'impresion'  ? 'bg-violet-100 text-violet-700' :
            d.tipo === 'principal'  ? 'bg-[var(--hce-primary-soft)] text-[var(--hce-primary)]' :
            d.tipo === 'relacionado'? 'bg-blue-50 text-blue-700' :
            d.tipo === 'secundario' ? 'bg-slate-100 text-slate-600' :
                                      'bg-amber-100 text-amber-700'
          return (
            <div key={i} className="flex items-start gap-2 py-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${tipoCls}`}>
                {TIPO_LABEL[d.tipo] ?? d.tipo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: 'var(--hce-text)' }}>{d.descripcion}</p>
                {d.codigo && <p className="text-xs text-slate-400 font-mono mt-0.5">{d.codigo}</p>}
              </div>
              {d.tipo !== 'nota' && d.tipo_clinico && (
                <span className="text-xs text-slate-400 shrink-0 mt-0.5">{TIPO_CLINICO_LABEL[d.tipo_clinico]}</span>
              )}
            </div>
          )
        })}
        {value.length === 0 && <p className="text-sm text-slate-400">Sin diagnósticos registrados.</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {value.map((d, i) => {
        const isNota = d.tipo === 'nota'
        const hasCodigo = !isNota && !!d.codigo && !!d.descripcion
        const isLastEmpty = !hasCodigo && !isNota && i === value.length - 1

        return (
          <div key={i} className="flex items-center gap-2">
            {isNota ? (
              <input
                type="text"
                value={d.descripcion}
                onChange={e => update(i, { descripcion: e.target.value })}
                placeholder="Nota clínica (sin código CIE-10)…"
                className="input-hce flex-1 text-sm"
              />
            ) : hasCodigo ? (
              <div className="flex-1 min-w-0 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="font-mono text-xs text-slate-500 shrink-0">{d.codigo}</span>
                <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--hce-text)' }}>{d.descripcion}</span>
                <button
                  type="button"
                  onClick={() => update(i, { codigo: undefined, descripcion: '' })}
                  className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                  title="Cambiar diagnóstico"
                >
                  <Pencil size={12} />
                </button>
              </div>
            ) : (
              <CieSearch
                autoFocus={isLastEmpty}
                onSelect={(codigo, desc) => update(i, { codigo, descripcion: desc })}
              />
            )}

            {!isNota && (
              <>
                <select
                  value={d.tipo}
                  onChange={e => update(i, { tipo: e.target.value as DiagnosticoItem['tipo'] })}
                  className={SEL_CLS}
                >
                  {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select
                  value={d.tipo_clinico ?? '01'}
                  onChange={e => update(i, { tipo_clinico: e.target.value })}
                  className={SEL_CLS}
                >
                  {TIPO_CLINICO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </>
            )}

            <button
              type="button"
              onClick={() => quitar(i)}
              className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
              title="Eliminar"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}

      <div className="flex items-center gap-4 pt-1">
        <button
          type="button"
          onClick={agregar}
          className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--hce-primary)' }}
        >
          <Plus size={14} />
          Agregar diagnóstico
        </button>
        <button
          type="button"
          onClick={agregarNota}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
        >
          <FileText size={12} />
          Nota clínica
        </button>
      </div>

      {!value.some(d => d.tipo === 'principal' || d.tipo === 'impresion') && (
        <p className="text-xs text-slate-400">Se requiere al menos un diagnóstico principal.</p>
      )}
    </div>
  )
}
