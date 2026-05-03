import { useState } from 'react'
import { useDepartamentos, useMunicipios } from '../api/divipola'
import { PAISES } from '../data/paises'

const selectCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed'
const labelCls = 'block text-xs text-slate-500 mb-1'

interface SelectorMunicipioColProps {
  value: string
  onChange: (codigo: string) => void
  required?: boolean
}

// Renders as two sibling divs — place directly inside a grid grid-cols-2 container
export function SelectorMunicipioCol({ value, onChange, required }: SelectorMunicipioColProps) {
  const [dep, setDep] = useState(() => value.length === 5 ? value.slice(0, 2) : '')
  const { data: departamentos = [], isLoading: loadingDeps } = useDepartamentos()
  const { data: municipios = [], isLoading: loadingMuns } = useMunicipios(dep)

  function handleDep(nuevoDep: string) {
    setDep(nuevoDep)
    onChange('')
  }

  return (
    <>
      <div>
        <label className={labelCls}>
          Departamento{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <select
          value={dep}
          onChange={e => handleDep(e.target.value)}
          className={selectCls}
          disabled={loadingDeps}
        >
          <option value="">{loadingDeps ? 'Cargando...' : '— Seleccionar —'}</option>
          {departamentos.map(d => (
            <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>
          Municipio{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={selectCls}
          required={required}
          disabled={!dep || loadingMuns}
        >
          <option value="">{loadingMuns ? 'Cargando...' : '— Seleccionar —'}</option>
          {municipios.map(m => (
            <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
          ))}
        </select>
      </div>
    </>
  )
}

interface SelectorPaisProps {
  value: string
  onChange: (codigo: string) => void
  required?: boolean
  className?: string
}

export function SelectorPais({ value, onChange, required, className }: SelectorPaisProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={className ?? selectCls}
      required={required}
    >
      {PAISES.map(p => (
        <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
      ))}
    </select>
  )
}
