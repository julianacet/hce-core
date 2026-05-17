import { useEffect } from 'react'
import { useBlocker } from 'react-router'

export function NavigationGuard({ when }: { when: boolean }) {
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="font-semibold text-slate-800 mb-2">¿Salir sin guardar?</h3>
        <p className="text-sm text-slate-500 mb-5">
          Tiene cambios sin guardar. Si sale ahora, se perderán.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => blocker.reset()}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Seguir editando
          </button>
          <button
            type="button"
            onClick={() => blocker.proceed()}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Salir sin guardar
          </button>
        </div>
      </div>
    </div>
  )
}
