import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { UserRound } from 'lucide-react'
import { type Paciente } from '../api/pacientes'
import { useCrearEncuentro, type EncuentroInput } from '../api/encuentros'
import { crearFormulas } from '../api/formulas'
import EncuentroForm, { type FormulaData } from '../components/EncuentroForm'
import { BuscadorPaciente } from '../components/BuscadorPaciente'
import { nombreCompleto } from '../utils/paciente'

export default function NuevaConsulta() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { paciente?: Paciente } | null
  const pacientePreseleccionado: Paciente | null = locationState?.paciente ?? null

  const [paciente, setPaciente] = useState<Paciente | null>(pacientePreseleccionado)
  const [formKey, setFormKey] = useState(0)
  const [pendingPaciente, setPendingPaciente] = useState<Paciente | null>(null)
  const [showCambiarModal, setShowCambiarModal] = useState(false)
  const crear = useCrearEncuentro(paciente?.numero_documento ?? '')

  function seleccionar(p: Paciente) {
    if (!paciente || paciente.numero_documento === p.numero_documento) {
      setPaciente(p)
      return
    }
    setPendingPaciente(p)
  }

  function confirmarCambio(limpiarForm: boolean) {
    if (!pendingPaciente) return
    setPaciente(pendingPaciente)
    if (limpiarForm) setFormKey(k => k + 1)
    setPendingPaciente(null)
  }

  function confirmarCambiarPaciente(limpiarForm: boolean) {
    setPaciente(null)
    if (limpiarForm) setFormKey(k => k + 1)
    setShowCambiarModal(false)
  }

  function limpiarPaciente() {
    setPaciente(null)
    setFormKey(k => k + 1)
  }

  async function handleSubmit(data: EncuentroInput, formulas: FormulaData) {
    const encuentro = await crear.mutateAsync(data)
    const doc = paciente!.numero_documento
    await crearFormulas(doc, encuentro.encuentro_id, formulas)
    navigate(`/pacientes/${doc}/encuentros/${encuentro.encuentro_id}`)
  }

  const selectedDocumento = paciente?.numero_documento ?? null

  return (
    <div className="page-hce">
      <div className="page-header">
        <div>
          <h2 className="page-title">Nueva consulta</h2>
          <p className="page-desc">Buscá al paciente antes de registrar la consulta</p>
        </div>
      </div>

      {/* ── Búsqueda de paciente ─────────────────────────────────────────── */}
      {!paciente && (
        <BuscadorPaciente selectedDocumento={selectedDocumento} onSelect={seleccionar} />
      )}

      {/* ── Contexto del paciente seleccionado ──────────────────────────── */}
      <div
        className="card-hce px-5 py-4 flex items-center gap-4 mb-1"
        style={{
          borderColor: paciente ? 'var(--hce-primary)' : 'var(--hce-border)',
          borderLeftWidth: '4px',
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: paciente ? 'var(--hce-primary)' : 'var(--hce-bg)' }}
        >
          <UserRound size={18} style={{ color: paciente ? '#fff' : 'var(--hce-text-muted)' }} />
        </div>
        {paciente ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--hce-text)' }}>
                {nombreCompleto(paciente)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
                {paciente.tipo_documento} {paciente.numero_documento}
                {paciente.edad != null ? ` · ${paciente.edad} años` : ''}
                {paciente.tipo_usuario_nombre ? ` · ${paciente.tipo_usuario_nombre}` : ''}
              </p>
            </div>
            <button
              onClick={() => setShowCambiarModal(true)}
              className="btn-secondary text-xs shrink-0"
              type="button"
            >
              Cambiar paciente
            </button>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
            Selecciona un paciente de la lista para habilitar el formulario
          </p>
        )}
      </div>

      {/* ── Formulario del encuentro ─────────────────────────────────────── */}
      <div
        className={!paciente ? 'pointer-events-none opacity-40 select-none' : ''}
        aria-hidden={!paciente}
      >
        <EncuentroForm
          key={formKey}
          documento={paciente?.numero_documento ?? ''}
          genero={paciente?.genero}
          paciente={paciente ? {
            nombre: nombreCompleto(paciente),
            documento: paciente.numero_documento,
            tipoDocumento: paciente.tipo_documento,
            fechaNacimiento: new Date(paciente.fecha_nacimiento).toLocaleDateString('es-CO'),
          } : undefined}
          onSubmit={handleSubmit}
          isPending={crear.isPending}
          onCancelar={limpiarPaciente}
        />
      </div>

      {/* ── Modal: volver al buscador desde la ficha ────────────────────── */}
      {showCambiarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card-hce w-full max-w-sm p-6 space-y-4" style={{ background: 'var(--hce-card)' }}>
            <div>
              <h3 className="card-title text-base">Cambiar paciente</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--hce-text-muted)' }}>
                ¿Qué deseas hacer con los datos que llevas diligenciados?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => confirmarCambiarPaciente(false)} className="btn-primary justify-center">
                Conservar los datos del formulario
              </button>
              <button onClick={() => confirmarCambiarPaciente(true)} className="btn-secondary justify-center">
                Limpiar el formulario
              </button>
              <button onClick={() => setShowCambiarModal(false)} className="btn-ghost justify-center" style={{ color: 'var(--hce-text-muted)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: cambio al seleccionar otro paciente de la lista ───────── */}
      {pendingPaciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card-hce w-full max-w-sm p-6 space-y-4" style={{ background: 'var(--hce-card)' }}>
            <div>
              <h3 className="card-title text-base">Cambiar paciente</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--hce-text-muted)' }}>
                Estás cambiando a <span className="font-medium" style={{ color: 'var(--hce-text)' }}>{nombreCompleto(pendingPaciente)}</span>.
                ¿Qué deseas hacer con los datos que llevas diligenciados?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => confirmarCambio(false)} className="btn-primary justify-center">
                Conservar los datos del formulario
              </button>
              <button onClick={() => confirmarCambio(true)} className="btn-secondary justify-center">
                Limpiar el formulario
              </button>
              <button onClick={() => setPendingPaciente(null)} className="btn-ghost justify-center" style={{ color: 'var(--hce-text-muted)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
