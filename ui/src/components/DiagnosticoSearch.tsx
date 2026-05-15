import { useState, useEffect, useRef } from 'react'
import { X, Plus, FileText } from 'lucide-react'
import { useBuscarDiagnosticos } from '../api/diagnosticos'
import type { DiagnosticoItem } from '../api/encuentros'
import { DEBOUNCE_MS } from '../utils/constants'

interface Props {
  value: DiagnosticoItem[]
  onChange: (items: DiagnosticoItem[]) => void
  disabled?: boolean
}

const TIPO_LABEL: Record<string, string> = {
  impresion: 'Impresión diagnóstica',
  principal: 'Principal',
  secundario: 'Secundario',
  nota: 'Nota clínica',
}

const TIPO_STYLE: Record<string, string> = {
  impresion: 'bg-violet-50 border-violet-200 text-violet-800',
  principal: 'bg-blue-50 border-blue-200 text-blue-800',
  secundario: 'bg-slate-50 border-slate-200 text-slate-700',
  nota: 'bg-amber-50 border-amber-200 text-amber-800',
}

export default function DiagnosticoSearch({ value, onChange, disabled }: Props) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [notaText, setNotaText] = useState('')
  const [mostrarNota, setMostrarNota] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  const { data: resultados = [], isFetching } = useBuscarDiagnosticos(debouncedQuery)

  useEffect(() => {
    setShowDropdown(debouncedQuery.trim().length >= 2 && resultados.length > 0)
  }, [resultados, debouncedQuery])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function agregar(codigo: string, descripcion: string) {
    const tipo: DiagnosticoItem['tipo'] = value.some(x => x.tipo === 'principal') ? 'secundario' : 'principal'
    onChange([...value, { tipo, codigo, descripcion }])
    setQuery('')
    setDebouncedQuery('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  function agregarNota() {
    if (!notaText.trim()) return
    onChange([...value, { tipo: 'nota', descripcion: notaText.trim() }])
    setNotaText('')
    setMostrarNota(false)
  }

  function quitar(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  function cambiarTipo(i: number, tipo: DiagnosticoItem['tipo']) {
    onChange(value.map((d, idx) => (idx === i ? { ...d, tipo } : d)))
  }

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => !disabled && debouncedQuery.length >= 2 && resultados.length > 0 && setShowDropdown(true)}
          placeholder="Buscar por código CIE-10 o nombre…"
          disabled={disabled}
          className="input-hce pr-8"
        />
        {isFetching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">…</span>
        )}

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {resultados.map((r) => (
              <button
                key={r.codigo}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); agregar(r.codigo, r.nombre) }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-baseline gap-2 text-sm"
              >
                <span className="font-mono text-xs text-slate-500 shrink-0">{r.codigo}</span>
                <span className="text-slate-800">{r.nombre}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de diagnósticos agregados */}
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((d, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${TIPO_STYLE[d.tipo]}`}
            >
              <div className="flex-1 min-w-0">
                {d.codigo && (
                  <span className="font-mono text-xs mr-2 opacity-70">{d.codigo}</span>
                )}
                <span>{d.descripcion}</span>
              </div>
              {!disabled && (
                <select
                  value={d.tipo}
                  onChange={(e) => cambiarTipo(i, e.target.value as DiagnosticoItem['tipo'])}
                  className="text-xs bg-transparent border-none outline-none cursor-pointer shrink-0"
                >
                  <option value="principal">Principal</option>
                  <option value="secundario">Secundario</option>
                  {d.tipo === 'nota' && <option value="nota">Nota clínica</option>}
                </select>
              )}
              {disabled && (
                <span className="text-xs shrink-0 opacity-60">{TIPO_LABEL[d.tipo]}</span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => quitar(i)}
                  className="shrink-0 opacity-60 hover:opacity-100"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nota clínica sin código */}
      {!disabled && !mostrarNota ? (
        <button
          type="button"
          onClick={() => setMostrarNota(true)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
        >
          <FileText size={12} />
          Agregar nota clínica sin código
        </button>
      ) : (
        <div className="flex gap-2 items-start">
          <textarea
            value={notaText}
            onChange={(e) => setNotaText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), agregarNota())}
            placeholder="Nota clínica (sin código CIE-10)…"
            rows={2}
            className="input-hce flex-1 resize-none text-sm"
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={agregarNota}
              disabled={!notaText.trim()}
              className="btn-primary py-1.5 px-2"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => { setMostrarNota(false); setNotaText('') }}
              className="btn-secondary py-1.5 px-2"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {value.length === 0 && (
        <p className="text-xs text-slate-400">
          Se requiere al menos un diagnóstico principal.
        </p>
      )}
    </div>
  )
}

export { TIPO_LABEL }
