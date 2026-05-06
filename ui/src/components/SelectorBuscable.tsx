import { useState, useRef, useEffect } from 'react'

interface Opcion {
  codigo: string
  nombre: string
}

interface Props {
  opciones: Opcion[]
  value: string
  onChange: (codigo: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export function SelectorBuscable({ opciones, value, onChange, placeholder, disabled, required }: Props) {
  const nombreActual = opciones.find(o => o.codigo === value)?.nombre ?? ''
  const [query, setQuery] = useState('')
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Inicializa el texto cuando carga el valor (ej: al editar)
  useEffect(() => {
    if (value && nombreActual) setQuery(nombreActual)
  }, [value, nombreActual])

  // Cierra al hacer clic fuera y restaura el nombre si hay selección
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
    setAbierto(true)
    if (!texto) onChange('')
  }

  function seleccionar(op: Opcion) {
    onChange(op.codigo)
    setQuery(op.nombre)
    setAbierto(false)
  }

  // Filtra si el usuario está escribiendo algo distinto al nombre ya seleccionado
  const filtradas = query && query !== nombreActual
    ? opciones.filter(o =>
        o.nombre.toLowerCase().includes(query.toLowerCase()) ||
        o.codigo.toLowerCase().includes(query.toLowerCase())
      )
    : opciones

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setAbierto(true)}
        placeholder={placeholder ?? 'Buscar...'}
        required={required && !value}
        disabled={disabled}
        className="input-hce"
        autoComplete="off"
      />
      <input type="hidden" value={value} />

      {abierto && !disabled && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-56 overflow-y-auto text-sm">
          {filtradas.length === 0 ? (
            <li className="px-3 py-2 text-slate-400">Sin resultados</li>
          ) : (
            filtradas.map(o => (
              <li
                key={o.codigo}
                onMouseDown={() => seleccionar(o)}
                className={`px-3 py-2 cursor-pointer hover:bg-slate-50 ${o.codigo === value ? 'bg-blue-50 text-blue-700' : ''}`}
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
