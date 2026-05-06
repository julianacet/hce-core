import { useState } from 'react'
import { useDepartamentos, useMunicipios } from '../api/divipola'
import { PAISES } from '../data/paises'
import { SelectorBuscable } from './SelectorBuscable'

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
        <label className="label-hce">
          Departamento{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <SelectorBuscable
          opciones={departamentos}
          value={dep}
          onChange={handleDep}
          placeholder={loadingDeps ? 'Cargando...' : 'Buscar departamento...'}
          disabled={loadingDeps}
          required={required}
        />
      </div>
      <div>
        <label className="label-hce">
          Municipio{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <SelectorBuscable
          key={dep}
          opciones={municipios}
          value={value}
          onChange={onChange}
          placeholder={loadingMuns ? 'Cargando...' : dep ? 'Buscar municipio...' : '— Seleccione departamento —'}
          disabled={!dep || loadingMuns}
          required={required}
        />
      </div>
    </>
  )
}

interface SelectorPaisProps {
  value: string
  onChange: (codigo: string) => void
  required?: boolean
}

export function SelectorPais({ value, onChange, required }: SelectorPaisProps) {
  return (
    <SelectorBuscable
      opciones={PAISES}
      value={value}
      onChange={onChange}
      placeholder="Buscar país..."
      required={required}
    />
  )
}
