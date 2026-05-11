import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Loader2 } from 'lucide-react'

export type RowMenuItem = {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

export function RowMenu({ items, loading = false }: { items: RowMenuItem[]; loading?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // Close menu when a mutation completes (loading goes false)
  useEffect(() => {
    if (!loading) setOpen(false)
  }, [loading])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
        title="Acciones"
      >
        {loading
          ? <Loader2 size={15} className="animate-spin" />
          : <MoreVertical size={15} />}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg shadow-lg border bg-white py-1"
          style={{ borderColor: 'var(--hce-border)' }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false) }}
              disabled={item.disabled || loading}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors disabled:opacity-40 ${
                item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="shrink-0 opacity-70">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
