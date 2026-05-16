import { ReactNode } from 'react'

interface TableEmptyStateProps {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  colSpan: number
  hayBusqueda?: boolean
  textoVacio?: string
  textoSinResultados?: string
  textoError?: string
  icon?: ReactNode
}

export function TableEmptyState({
  isLoading, isError, isEmpty, colSpan,
  hayBusqueda = false,
  textoVacio = 'Sin resultados.',
  textoSinResultados = 'No se encontraron resultados con ese criterio.',
  textoError = 'Error al cargar. Intenta de nuevo.',
  icon,
}: TableEmptyStateProps) {
  if (!isLoading && !isError && !isEmpty) return null

  let content: ReactNode

  if (isLoading) {
    content = <span className="text-slate-400">Cargando...</span>
  } else if (isError) {
    content = <span className="text-red-500">{textoError}</span>
  } else {
    content = (
      <>
        {icon && <div className="mb-2 flex justify-center">{icon}</div>}
        <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
          {hayBusqueda ? textoSinResultados : textoVacio}
        </p>
      </>
    )
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm">
        {content}
      </td>
    </tr>
  )
}
