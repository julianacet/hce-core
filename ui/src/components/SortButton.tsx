import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'

export type SortDir = 'asc' | 'desc'

export function SortButton({
  children, activo, dir, onClick,
}: {
  children: React.ReactNode
  activo: boolean
  dir: SortDir
  onClick: () => void
}) {
  return (
    <button
      className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 hover:text-slate-700"
      onClick={onClick}
    >
      {children}
      {activo
        ? dir === 'asc'
          ? <ChevronUp size={12} className="text-slate-600 shrink-0" />
          : <ChevronDown size={12} className="text-slate-600 shrink-0" />
        : <ArrowUpDown size={12} className="text-slate-300 shrink-0" />}
    </button>
  )
}
