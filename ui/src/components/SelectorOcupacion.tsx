import { useState } from 'react'
import { useBuscarOcupaciones } from '../api/ocupaciones'
import { SelectorBuscable } from './SelectorBuscable'

interface Props {
  value: string
  nombre: string
  onChange: (codigo: string, nombre: string) => void
  required?: boolean
}

export function SelectorOcupacion({ value, nombre, onChange, required }: Props) {
  const [query, setQuery] = useState('')
  const { data: resultados = [], isFetching } = useBuscarOcupaciones(query.length >= 2 ? query : '')

  return (
    <SelectorBuscable
      opciones={resultados}
      value={value}
      initialLabel={nombre}
      onChange={onChange}
      onSearch={setQuery}
      loading={isFetching && query.length >= 2}
      minLength={2}
      placeholder="Buscar ocupación..."
      required={required}
    />
  )
}
