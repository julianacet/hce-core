import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { Breadcrumb } from '../components/Breadcrumb'
import { UserRound, FileEdit } from 'lucide-react'
import { type Paciente, usePaciente } from '../api/pacientes'
import { useBorradorEncuentro, useEncuentro, useEliminarEncuentro, type EncuentroInput } from '../api/encuentros'
import { crearFormulas } from '../api/formulas'
import { crearOrdenExamen } from '../api/ordenes_examen'
import EncuentroForm, { type FormulaData, type OrdenData } from '../components/EncuentroForm'
import { BuscadorPaciente } from '../components/BuscadorPaciente'
import { nombreCompleto, fmtFechaNacimiento } from '../utils/paciente'

export default function NuevaConsulta() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { paciente?: Paciente; documento?: string } | null
  const pacientePreseleccionado: Paciente | null = locationState?.paciente ?? null

  const [paciente, setPaciente] = useState<Paciente | null>(pacientePreseleccionado)

  // Auto-seleccionar paciente cuando se navega desde la lista con solo el documento
  const documentoDesdeEstado = locationState?.documento
  const { data: pacienteDeEstado } = usePaciente(documentoDesdeEstado ?? '')
  useEffect(() => {
    if (pacienteDeEstado && !paciente) setPaciente(pacienteDeEstado)
  }, [pacienteDeEstado])
  const [formKey, setFormKey] = useState(0)
  const [pendingPaciente, setPendingPaciente] = useState<Paciente | null>(null)
  const [showCambiarModal, setShowCambiarModal] = useState(false)
  const [borradorId, setBorradorId] = useState<string | undefined>()
  const [showBorradorModal, setShowBorradorModal] = useState(false)

  const { data: borradorExistente } = useBorradorEncuentro(paciente?.numero_documento ?? '')
  const eliminarBorrador = useEliminarEncuentro(paciente?.numero_documento)

  // Pre-cargar datos completos del borrador (con diagnósticos) para pre-llenar el form
  const { data: borradorCompleto } = useEncuentro(
    paciente?.numero_documento ?? '',
    borradorExistente?.encuentro_id ?? '',
  )

  const borradorData = borradorCompleto ? {
    motivo_consulta:    borradorCompleto.motivo_consulta ?? '',
    descripcion_ingreso: borradorCompleto.descripcion_ingreso ?? '',
    plan_manejo:        borradorCompleto.plan_manejo ?? '',
    finalidad_consulta: borradorCompleto.finalidad_consulta ?? '10',
    causa_externa:      borradorCompleto.causa_externa ?? '13',
    via_ingreso:        borradorCompleto.via_ingreso ?? '02',
    encuentro_padre_id: borradorCompleto.encuentro_padre_id ?? '',
    signos:    (borradorCompleto.signos_vitales as Record<string, string>) ?? {},
    revision:  (borradorCompleto.revision_sistemas as Record<string, unknown>) ?? {},
    examen:    (borradorCompleto.examen_fisico as Record<string, unknown>) ?? {},
    diagnosticos: borradorCompleto.diagnosticos ?? [],
  } : undefined

  function seleccionar(p: Paciente) {
    if (!paciente || paciente.numero_documento === p.numero_documento) {
      setPaciente(p)
      return
    }
    setPendingPaciente(p)
  }

  // Mostrar modal de borrador cuando se detecta uno para el paciente seleccionado
  useEffect(() => {
    if (borradorExistente && !borradorId && paciente) {
      setShowBorradorModal(true)
    }
  }, [borradorExistente, paciente])

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

  async function handleSubmit(_data: EncuentroInput, formulas: FormulaData, orden: OrdenData, encuentroId: string) {
    const doc = paciente!.numero_documento
    await crearFormulas(doc, encuentroId, formulas)
    await crearOrdenExamen(doc, encuentroId, {
      indicaciones_generales: orden.indicaciones_generales.trim() || null,
      items: orden.items
        .filter(i => i.descripcion.trim())
        .map((i, idx) => ({
          codigo_cups: i.codigo_cups,
          descripcion: i.descripcion.trim(),
          indicaciones: i.indicaciones?.trim() || null,
          posicion: idx + 1,
        })),
    })
    navigate(`/pacientes/${doc}/encuentros/${encuentroId}`)
  }

  const selectedDocumento = paciente?.numero_documento ?? null

  return (
    <div className="page-hce">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Consultas', to: '/nueva-consulta' }, { label: 'Nueva consulta' }]} />
      <div className="page-header">
        <div>
          <h2 className="page-title">Nueva consulta</h2>
          <p className="page-desc">Busque al paciente antes de registrar la consulta</p>
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
            fechaNacimiento: fmtFechaNacimiento(paciente.fecha_nacimiento),
          } : undefined}
          borradorId={borradorId}
          borradorData={borradorId ? borradorData : undefined}
          onSubmit={handleSubmit}
          isPending={false}
          onCancelar={limpiarPaciente}
          onBorradorCreado={setBorradorId}
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

      {/* ── Modal: borrador detectado ───────────────────────────────────── */}
      {showBorradorModal && borradorExistente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card-hce w-full max-w-sm p-6 space-y-4" style={{ background: 'var(--hce-card)' }}>
            <div className="flex items-start gap-3">
              <FileEdit size={20} style={{ color: 'var(--hce-primary)', marginTop: 2 }} className="shrink-0" />
              <div>
                <h3 className="card-title text-base">Consulta en borrador</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--hce-text-muted)' }}>
                  Este paciente tiene una consulta sin finalizar del{' '}
                  <span className="font-medium" style={{ color: 'var(--hce-text)' }}>
                    {new Date(borradorExistente.fecha_atencion).toLocaleDateString('es-CO')}
                  </span>.
                  ¿Deseas continuarla o iniciar una nueva?
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setBorradorId(borradorExistente.encuentro_id)
                  setFormKey(k => k + 1)
                  setShowBorradorModal(false)
                }}
                className="btn-primary justify-center"
              >
                Continuar borrador
              </button>
              <button
                onClick={() => { setFormKey(k => k + 1); setBorradorId(undefined); setShowBorradorModal(false) }}
                className="btn-secondary justify-center"
              >
                Iniciar consulta nueva
              </button>
              <button
                onClick={async () => {
                  await eliminarBorrador.mutateAsync({
                    doc: borradorExistente.paciente_documento,
                    encuentroId: borradorExistente.encuentro_id,
                  })
                  setFormKey(k => k + 1)
                  setBorradorId(undefined)
                  setShowBorradorModal(false)
                }}
                disabled={eliminarBorrador.isPending}
                className="text-sm py-2 px-4 rounded-lg transition-colors text-center"
                style={{ color: 'var(--hce-text-muted)' }}
              >
                {eliminarBorrador.isPending ? 'Eliminando…' : 'Descartar borrador'}
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
