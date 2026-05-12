import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Search, Filter, Trash2, Check, UserRound, ChevronRight } from 'lucide-react'
import { usePacientesPaginados, type Paciente } from '../api/pacientes'
import { useCrearEncuentro, type EncuentroInput } from '../api/encuentros'
import EncuentroForm from '../components/EncuentroForm'
import { SelectorEps } from '../components/SelectorEps'

const TIPOS_USUARIO = [
  { value: '', label: 'Todos los tipos' },
  { value: '01', label: 'Contributivo' },
  { value: '02', label: 'Subsidiado' },
  { value: '03', label: 'Vinculado' },
  { value: '04', label: 'Particular' },
  { value: '05', label: 'Indígena' },
  { value: '06', label: 'No asegurado' },
]

function nombreCompleto(p: Paciente) {
  return [p.nombre_primero, p.nombre_segundo, p.apellido_primero, p.apellido_segundo]
    .filter(Boolean).join(' ')
}

export default function NuevaConsulta() {
  const navigate = useNavigate()

  // ── Búsqueda ─────────────────────────────────────────────────────────────
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [filtros, setFiltros] = useState({
    tipo_usuario: '', genero: '', zona_residencia: '', eps: '', telefono: '',
    min_atencion: '', max_atencion: '',
  })
  const [filtrosDebounced, setFiltrosDebounced] = useState(filtros)
  const [epsResetKey, setEpsResetKey] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => { setQDebounced(q) }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const t = setTimeout(() => setFiltrosDebounced(filtros), 400)
    return () => clearTimeout(t)
  }, [filtros])

  function setFiltro<K extends keyof typeof filtros>(key: K, value: string) {
    setFiltros(f => ({ ...f, [key]: value }))
  }

  function limpiarFiltros() {
    setFiltros({ tipo_usuario: '', genero: '', zona_residencia: '', eps: '', telefono: '', min_atencion: '', max_atencion: '' })
    setEpsResetKey(k => k + 1)
  }

  function toggleModo() {
    if (filtrosAbiertos) {
      limpiarFiltros()
      setFiltrosAbiertos(false)
    } else {
      setQ('')
      setQDebounced('')
      setFiltrosAbiertos(true)
    }
  }

  const hayFiltros = Object.values(filtros).some(v => v !== '')

  const { data, isLoading, isError } = usePacientesPaginados({
    q: qDebounced,
    page: 1,
    limit: 30,
    orden: 'nombre',
    dir: 'asc',
    ...filtrosDebounced,
  })

  const resultados = data?.pacientes ?? []
  const total = data?.total ?? 0

  // ── Paciente seleccionado ─────────────────────────────────────────────────
  const [paciente, setPaciente] = useState<Paciente | null>(null)
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

  async function handleSubmit(data: EncuentroInput) {
    const encuentro = await crear.mutateAsync(data)
    navigate(`/pacientes/${paciente!.numero_documento}/encuentros/${encuentro.encuentro_id}`)
  }

  const selectedDocumento = paciente?.numero_documento ?? null

  return (
    <div className="page-hce">
      <div className="page-header">
        <div>
          <h2 className="page-title">Nueva consulta</h2>
          <p className="page-desc">Buscá al paciente antes de registrar el encuentro</p>
        </div>
      </div>

      {/* ── Búsqueda de paciente ─────────────────────────────────────────── */}
      {!paciente && <div className="card-hce overflow-hidden mb-4">
        <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: 'var(--hce-border)' }}>
          <div className="flex gap-2">
            {!filtrosAbiertos && (
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Nombre, apellido, documento o teléfono…"
                  className="input-hce pl-9"
                  autoFocus
                />
              </div>
            )}
            {filtrosAbiertos && <div className="flex-1" />}
            <button
              onClick={toggleModo}
              className={`btn-secondary flex items-center gap-1.5 shrink-0 ${filtrosAbiertos ? 'bg-slate-100' : ''}`}
            >
              <Filter size={14} />
              {filtrosAbiertos ? 'Búsqueda simple' : 'Filtros avanzados'}
              {hayFiltros && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
            </button>
          </div>

          {filtrosAbiertos && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label-hce">Tipo de usuario</label>
                  <select className="input-hce" value={filtros.tipo_usuario} onChange={e => setFiltro('tipo_usuario', e.target.value)}>
                    {TIPOS_USUARIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-hce">Género</label>
                  <select className="input-hce" value={filtros.genero} onChange={e => setFiltro('genero', e.target.value)}>
                    <option value="">Todos</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="X">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="label-hce">Zona de residencia</label>
                  <select className="input-hce" value={filtros.zona_residencia} onChange={e => setFiltro('zona_residencia', e.target.value)}>
                    <option value="">Todas</option>
                    <option value="U">Urbana</option>
                    <option value="R">Rural</option>
                  </select>
                </div>
                <SelectorEps
                  key={epsResetKey}
                  value={filtros.eps}
                  onChange={v => setFiltro('eps', v)}
                />
                <div>
                  <label className="label-hce">Teléfono</label>
                  <input className="input-hce" placeholder="Buscar por teléfono..." value={filtros.telefono} onChange={e => setFiltro('telefono', e.target.value)} />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <div className="border rounded-md p-3 space-y-2" style={{ borderColor: 'var(--hce-border)', background: 'var(--hce-bg)' }}>
                    <p className="label-hce mb-0">Última atención</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="label-hce">Desde</p>
                        <input className="input-hce" type="date" value={filtros.min_atencion} onChange={e => setFiltro('min_atencion', e.target.value)} />
                      </div>
                      <span className="text-slate-300 text-sm shrink-0 mt-4">—</span>
                      <div className="flex-1">
                        <p className="label-hce">Hasta</p>
                        <input className="input-hce" type="date" value={filtros.max_atencion} onChange={e => setFiltro('max_atencion', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button className="btn-ghost text-xs text-slate-400 hover:text-slate-600" onClick={limpiarFiltros}>
                <Trash2 size={13} />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="border-t" style={{ borderColor: 'var(--hce-border)' }}>
          <div className="px-5 py-2 flex items-center justify-between" style={{ background: 'var(--hce-bg)' }}>
            <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
              {isLoading ? 'Buscando…' : `${total} paciente${total !== 1 ? 's' : ''} — haz clic en uno para seleccionarlo`}
            </p>
          </div>
          <div className="overflow-y-auto divide-y" style={{ maxHeight: '14rem', borderColor: 'var(--hce-border)' }}>
            {isError && (
              <div className="px-5 py-6 text-center text-sm text-red-500">Error al cargar. Intenta de nuevo.</div>
            )}
            {!isLoading && !isError && resultados.length === 0 && (
              <div className="px-5 py-6 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>
                {(qDebounced || hayFiltros) ? 'Sin resultados para esa búsqueda.' : 'Escribe para buscar un paciente.'}
              </div>
            )}
            {resultados.map(p => {
              const seleccionado = selectedDocumento === p.numero_documento
              return (
                <button
                  key={p.numero_documento}
                  onClick={() => seleccionar(p)}
                  className="w-full px-5 py-3 flex items-center gap-3 text-left transition-colors"
                  style={{ background: seleccionado ? 'var(--hce-primary)' : undefined }}
                  onMouseEnter={e => { if (!seleccionado) (e.currentTarget as HTMLElement).style.background = 'var(--hce-bg)' }}
                  onMouseLeave={e => { if (!seleccionado) (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: seleccionado ? '#fff' : 'var(--hce-text)' }}>
                      {nombreCompleto(p)}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: seleccionado ? 'rgba(255,255,255,0.75)' : 'var(--hce-text-muted)' }}>
                      {p.tipo_documento} {p.numero_documento}
                      {p.telefono ? ` · ${p.telefono}` : ''}
                      {p.edad != null ? ` · ${p.edad} años` : ''}
                    </p>
                  </div>
                  {seleccionado
                    ? <Check size={15} className="shrink-0" style={{ color: '#fff' }} />
                    : <ChevronRight size={14} className="shrink-0 text-slate-300" />
                  }
                </button>
              )
            })}
          </div>
          {total > 30 && (
            <p className="px-5 py-2 text-xs text-center border-t" style={{ borderColor: 'var(--hce-border)', color: 'var(--hce-text-muted)' }}>
              Mostrando 30 de {total} — refina la búsqueda para ver más
            </p>
          )}
        </div>
      </div>}

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
          onSubmit={handleSubmit}
          isPending={crear.isPending}
          submitLabel="Crear encuentro"
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
