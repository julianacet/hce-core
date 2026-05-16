import { Download } from 'lucide-react'

interface ExportButtonsProps {
  onCsv: () => void
  onExcel: () => void
  descargando: 'csv' | 'xlsx' | null
  disabled?: boolean
}

export function ExportButtons({ onCsv, onExcel, descargando, disabled = false }: ExportButtonsProps) {
  return (
    <>
      <button
        onClick={onCsv}
        disabled={disabled || descargando !== null}
        className="btn-secondary flex items-center gap-1.5 disabled:opacity-40"
      >
        <Download size={14} />
        {descargando === 'csv' ? 'Generando…' : 'CSV'}
      </button>
      <button
        onClick={onExcel}
        disabled={disabled || descargando !== null}
        className="btn-secondary flex items-center gap-1.5 disabled:opacity-40"
      >
        <Download size={14} />
        {descargando === 'xlsx' ? 'Generando…' : 'Excel'}
      </button>
    </>
  )
}
