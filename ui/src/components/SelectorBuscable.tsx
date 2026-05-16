import { useState, useRef, useEffect } from 'react'

interface Opcion {
  codigo: string
  nombre: string
}

interface Props {
  opciones: Opcion[]
  value: string
  onChange: (codigo: string, nombre: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  // Async / server-side search mode
  onSearch?: (query: string) => void
  loading?: boolean
  minLength?: number
  initialLabel?: string
}

export function SelectorBuscable({
  opciones, value, onChange, placeholder, disabled, required,
  onSearch, loading, minLength = 0, initialLabel,
}: Props) {
  const nombreActual = opciones.find(o => o.codigo === value)?.nombre ?? initialLabel ?? ''
  const [query, setQuery] = useState('')
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value && nombreActual) setQuery(nombreActual)
  }, [value, nombreActual])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
        setQuery(value ? nombreActual : '')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value, nombreActual])

  function handleInput(texto: string) {
    setQuery(texto)
    setAbierto(texto.length >= minLength)
    if (onSearch) onSearch(texto)
    if (!texto) onChange('', '')
  }

  function seleccionar(op: Opcion) {
    onChange(op.codigo, op.nombre)
    setQuery(op.nombre)
    setAbierto(false)
  }

  // In async mode opciones are already server-filtered; in client mode filter locally.
  const filtradas = onSearch
    ? opciones
    : (query && query !== nombreActual
        ? opciones.filter(o =>
            o.nombre.toLowerCase().includes(query.toLowerCase()) ||
            o.codigo.toLowerCase().includes(query.toLowerCase())
          )
        : opciones)

  const mostrarDropdown = abierto && !disabled && query.length >= minLength

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => { if (query.length >= minLength) setAbierto(true) }}
        placeholder={placeholder ?? 'Buscar...'}
        required={required && !value}
        disabled={disabled}
        className="input-hce"
        autoComplete="off"
      />
      <input type="hidden" value={value} />

      {mostrarDropdown && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-56 overflow-y-auto text-sm">
          {loading ? (
            <li className="px-3 py-2 text-slate-400">Buscando...</li>
          ) : filtradas.length === 0 ? (
            <li className="px-3 py-2 text-slate-400">Sin resultados</li>
          ) : (
            filtradas.map(o => (
              <li
                key={o.codigo}
                onMouseDown={() => seleccionar(o)}
                className={`px-3 py-2 cursor-pointer hover:bg-slate-50 ${o.codigo === value ? 'bg-[var(--hce-primary-soft)] text-[var(--hce-primary)]' : ''}`}
              >
                <span className="font-mono text-xs text-slate-400 mr-2">{o.codigo}</span>
                {o.nombre}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
