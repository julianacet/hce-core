import { useState, useRef, useEffect } from 'react'
import { useBuscarOcupaciones } from '../api/ocupaciones'

interface Props {
  value: string       // código CNO almacenado
  nombre: string      // nombre visible (para mostrar en el input)
  onChange: (codigo: string, nombre: string) => void
  required?: boolean
}

export function SelectorOcupacion({ value, nombre, onChange, required }: Props) {
  const [query, setQuery] = useState(nombre)
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const { data: resultados = [], isFetching } = useBuscarOcupaciones(query)

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
        // Si el usuario salió sin seleccionar, restaura el nombre previo
        if (value) setQuery(nombre)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [value, nombre])

  function handleInput(texto: string) {
    setQuery(texto)
    setAbierto(true)
    if (!texto) onChange('', '')
  }

  function seleccionar(codigo: string, nombreOcup: string) {
    onChange(codigo, nombreOcup)
    setQuery(nombreOcup)
    setAbierto(false)
  }

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => query.length >= 2 && setAbierto(true)}
        placeholder="Buscar ocupación..."
        required={required && !value}
        className="input-hce"
        autoComplete="off"
      />
      {/* Campo oculto para que el form capture el código */}
      <input type="hidden" value={value} />

      {abierto && query.length >= 2 && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-56 overflow-y-auto text-sm">
          {isFetching && (
            <li className="px-3 py-2 text-slate-400">Buscando...</li>
          )}
          {!isFetching && resultados.length === 0 && (
            <li className="px-3 py-2 text-slate-400">Sin resultados</li>
          )}
          {resultados.map(o => (
            <li
              key={o.codigo}
              onMouseDown={() => seleccionar(o.codigo, o.nombre)}
              className={`px-3 py-2 cursor-pointer hover:bg-slate-50 ${o.codigo === value ? 'bg-blue-50 text-blue-700' : ''}`}
            >
              <span className="font-mono text-xs text-slate-400 mr-2">{o.codigo}</span>
              {o.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
