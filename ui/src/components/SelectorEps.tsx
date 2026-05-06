import { useState, useEffect } from 'react'
import { useRegimenes, useEps, useEpsInfo } from '../api/eps'
import { SelectorBuscable } from './SelectorBuscable'

interface Props {
  value: string
  onChange: (codigo: string) => void
  required?: boolean
}

// Renders as two sibling divs — place directly inside a grid grid-cols-2 container
export function SelectorEps({ value, onChange, required }: Props) {
  const [regimen, setRegimen] = useState('')
  const { data: regimenes = [], isLoading: loadingReg } = useRegimenes()
  const { data: entidades = [], isLoading: loadingEps } = useEps(regimen)
  const { data: epsInfo } = useEpsInfo(value)

  useEffect(() => {
    if (epsInfo?.regimen && !regimen) setRegimen(epsInfo.regimen)
  }, [epsInfo])

  function handleRegimen(nuevoRegimen: string) {
    setRegimen(nuevoRegimen)
    onChange('')
  }

  return (
    <>
      <div>
        <label className="label-hce">Régimen</label>
        <select
          value={regimen}
          onChange={e => handleRegimen(e.target.value)}
          className="input-hce"
          disabled={loadingReg}
        >
          <option value="">{loadingReg ? 'Cargando...' : '— Seleccionar —'}</option>
          {regimenes.map(r => (
            <option key={r.codigo} value={r.codigo}>{r.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-hce">
          EPS / Aseguradora{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <SelectorBuscable
          key={regimen}
          opciones={entidades}
          value={value}
          onChange={onChange}
          placeholder={loadingEps ? 'Cargando...' : regimen ? 'Buscar EPS...' : '— Seleccione régimen primero —'}
          disabled={!regimen || loadingEps}
          required={required}
        />
      </div>
    </>
  )
}
