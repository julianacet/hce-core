import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react'

interface ExportButtonsProps {
  onCsv: () => void
  onExcel: () => void
  descargando: 'csv' | 'xlsx' | null
  disabled?: boolean
}

export function ExportButtons({ onCsv, onExcel, descargando, disabled = false }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onCsv}
        disabled={disabled || descargando !== null}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 bg-white hover:bg-sky-50 border-slate-200 hover:border-sky-300 text-slate-500 hover:text-sky-700"
      >
        {descargando === 'csv'
          ? <Loader2 size={13} className="animate-spin" />
          : <span className="w-4 h-4 rounded bg-sky-100 flex items-center justify-center shrink-0">
              <FileDown size={9} className="text-sky-600" />
            </span>
        }
        {descargando === 'csv' ? 'Generando…' : 'CSV'}
      </button>
      <button
        onClick={onExcel}
        disabled={disabled || descargando !== null}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 text-slate-500 hover:text-emerald-700"
      >
        {descargando === 'xlsx'
          ? <Loader2 size={13} className="animate-spin" />
          : <span className="w-4 h-4 rounded bg-emerald-100 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={9} className="text-emerald-600" />
            </span>
        }
        {descargando === 'xlsx' ? 'Generando…' : 'Excel'}
      </button>
    </div>
  )
}
