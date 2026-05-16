import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'

type Crumb = { label: string; to?: string }

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-xs mb-4 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={11} style={{ color: 'var(--hce-text-muted)', opacity: 0.5 }} />}
          {item.to ? (
            <Link
              to={item.to}
              className="hover:underline transition-colors"
              style={{ color: 'var(--hce-text-muted)' }}
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium" style={{ color: 'var(--hce-text)' }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
