import { useEffect, useState } from 'react'
import { useBlocker } from 'react-router'

interface Props {
  when: boolean
  onSaveAndProceed?: () => Promise<void>
}

export function NavigationGuard({ when, onSaveAndProceed }: Props) {
  const [saving, setSaving] = useState(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!when) return
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [when])

  if (blocker.state !== 'blocked') return null

  async function handleSaveAndProceed() {
    if (!onSaveAndProceed) return
    setSaving(true)
    try {
      await onSaveAndProceed?.()
      blocker.proceed?.()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <div className="rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" style={{ background: 'var(--hce-card)' }}>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--hce-text)' }}>¿Qué deseas hacer?</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--hce-text-muted)' }}>
          Tienes cambios que aún no se han guardado como borrador.
        </p>
        <div className="flex flex-col gap-2">
          {onSaveAndProceed && (
            <button
              type="button"
              onClick={handleSaveAndProceed}
              disabled={saving}
              className="btn-primary justify-center"
            >
              {saving ? 'Guardando…' : 'Guardar borrador y salir'}
            </button>
          )}
          <button
            type="button"
            onClick={() => blocker.reset()}
            className="btn-secondary justify-center"
          >
            Seguir editando
          </button>
          <button
            type="button"
            onClick={() => blocker.proceed()}
            className="text-sm py-2 px-4 rounded-lg transition-colors"
            style={{ color: 'var(--hce-text-muted)' }}
          >
            Salir sin guardar
          </button>
        </div>
      </div>
    </div>
  )
}
