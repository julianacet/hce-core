import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  useEffect(() => {
    if (!loading) setOpen(false)
  }, [loading])

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(o => !o)
  }

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        onClick={handleToggle}
        disabled={loading}
        className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
        title="Acciones"
      >
        {loading
          ? <Loader2 size={15} className="animate-spin" />
          : <MoreVertical size={15} />}
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 w-48 rounded-lg shadow-lg border bg-white py-1"
          style={{ top: pos.top, right: pos.right, borderColor: 'var(--hce-border)' }}
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
        </div>,
        document.body
      )}
    </div>
  )
}
