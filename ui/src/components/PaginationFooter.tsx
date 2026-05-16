import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationFooterProps {
  page: number
  totalPages: number
  total: number
  limit: number
  isLoading?: boolean
  isFetching?: boolean
  onPageChange: (page: number) => void
  entityLabel: string
}

export function PaginationFooter({
  page, totalPages, total, limit,
  isLoading = false, isFetching = false,
  onPageChange, entityLabel,
}: PaginationFooterProps) {
  const desde = total === 0 ? 0 : (page - 1) * limit + 1
  const hasta = Math.min(page * limit, total)

  return (
    <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--hce-border)' }}>
      <p className="text-xs text-slate-400">
        {isLoading
          ? 'Cargando…'
          : total > 0
          ? `Mostrando ${desde}–${hasta} de ${total} ${entityLabel}`
          : 'Sin resultados'}
        {isFetching && !isLoading && <span className="ml-2">Actualizando…</span>}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1 || isLoading}
          className="p-1.5 rounded border text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--hce-border)' }}
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs text-slate-500 min-w-[90px] text-center">
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || isLoading}
          className="p-1.5 rounded border text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--hce-border)' }}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
