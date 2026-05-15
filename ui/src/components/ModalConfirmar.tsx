import { useState } from 'react'

interface ModalConfirmarProps {
  mensaje: string
  onConfirmar: () => void
  onCancelar: () => void
}

export function ModalConfirmar({ mensaje, onConfirmar, onCancelar }: ModalConfirmarProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancelar}
    >
      <div
        className="card-hce p-6 w-full max-w-sm space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm" style={{ color: 'var(--hce-text)' }}>{mensaje}</p>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancelar} className="btn-secondary text-sm">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} className="btn-danger text-sm">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

interface Pendiente {
  mensaje: string
  onConfirmar: () => void
}

export function useConfirmar() {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)

  function confirmar(mensaje: string, onConfirmar: () => void) {
    setPendiente({ mensaje, onConfirmar })
  }

  const modal = pendiente ? (
    <ModalConfirmar
      mensaje={pendiente.mensaje}
      onConfirmar={() => { pendiente.onConfirmar(); setPendiente(null) }}
      onCancelar={() => setPendiente(null)}
    />
  ) : null

  return { confirmar, modal }
}
