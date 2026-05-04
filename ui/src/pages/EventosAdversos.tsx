import { useState } from 'react'
import { AlertTriangle, Plus, ChevronRight, X, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import {
  useTiposEventoAdverso,
  useEventosAdversos,
  useCrearEventoAdverso,
  useActualizarSeguimiento,
  type EventoAdverso,
  type FactoresContribuyentes,
} from '../api/eventos_adversos'

// ── Helpers de presentación ───────────────────────────────────────────────────

const CLASIFICACION_LABEL: Record<string, string> = {
  incidente: 'Incidente (near miss)',
  adverso_prevenible: 'Adverso prevenible',
  adverso_no_prevenible: 'Adverso no prevenible',
  centinela: 'Evento centinela',
}

const DANIO_LABEL: Record<string, string> = {
  sin_danio: 'Sin daño',
  leve: 'Leve',
  moderado: 'Moderado',
  grave: 'Grave',
  muerte: 'Muerte',
}

const DANIO_BADGE: Record<string, string> = {
  sin_danio: 'bg-slate-100 text-slate-600',
  leve: 'bg-yellow-100 text-yellow-700',
  moderado: 'bg-orange-100 text-orange-700',
  grave: 'bg-red-100 text-red-700',
  muerte: 'bg-red-900 text-white',
}

const ESTADO_BADGE: Record<string, string> = {
  abierto: 'bg-red-100 text-red-700',
  en_seguimiento: 'bg-yellow-100 text-yellow-700',
  cerrado: 'bg-green-100 text-green-700',
}

const ESTADO_LABEL: Record<string, string> = {
  abierto: 'Abierto',
  en_seguimiento: 'En seguimiento',
  cerrado: 'Cerrado',
}

const ESTADO_ICON: Record<string, React.ElementType> = {
  abierto: AlertCircle,
  en_seguimiento: Clock,
  cerrado: CheckCircle,
}

function hoy() {
  return new Date().toISOString().slice(0, 16)
}

// ── Formulario de nuevo reporte ───────────────────────────────────────────────

function FormNuevoReporte({ onExito }: { onExito: () => void }) {
  const { data: tipos = [] } = useTiposEventoAdverso()
  const crear = useCrearEventoAdverso()

  const [tipoId, setTipoId] = useState('')
  const [fechaEvento, setFechaEvento] = useState(hoy())
  const [pacienteDoc, setPacienteDoc] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [clasificacion, setClasificacion] = useState('')
  const [categoriaDanio, setCategoriaDanio] = useState('')
  const [seInformoPaciente, setSeInformoPaciente] = useState<boolean | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [comoDetecto, setComoDetecto] = useState('')
  const [factores, setFactores] = useState<FactoresContribuyentes>({
    humano: false, entorno: false, equipos: false, organizacional: false, paciente: false, notas: '',
  })
  const [accionesInmediatas, setAccionesInmediatas] = useState('')
  const [requiereCausaRaiz, setRequiereCausaRaiz] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!clasificacion || !categoriaDanio || !descripcion.trim()) {
      setError('Clasificación, categoría del daño y descripción son obligatorias.')
      return
    }
    try {
      await crear.mutateAsync({
        tipo_id: tipoId || null,
        fecha_evento: fechaEvento,
        paciente_documento: pacienteDoc.trim() || null,
        diagnostico_activo: diagnostico.trim() || null,
        clasificacion,
        categoria_danio: categoriaDanio,
        se_informo_paciente: seInformoPaciente,
        descripcion: descripcion.trim(),
        como_se_detecto: comoDetecto.trim() || null,
        factores_contribuyentes: factores,
        acciones_inmediatas: accionesInmediatas.trim() || null,
        requiere_causa_raiz: requiereCausaRaiz,
      })
      onExito()
    } catch {
      setError('Error al registrar el evento. Intenta de nuevo.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Tipo y fecha */}
      <div className="card-hce p-5 space-y-4">
        <h3 className="card-title">Identificación</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-hce">Tipo de evento</label>
            <select className="input-hce" value={tipoId} onChange={e => setTipoId(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {tipos.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-hce">Fecha y hora del evento *</label>
            <input type="datetime-local" className="input-hce" value={fechaEvento}
              onChange={e => setFechaEvento(e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-hce">Documento del paciente (opcional)</label>
            <input className="input-hce" placeholder="Sin identificar" value={pacienteDoc}
              onChange={e => setPacienteDoc(e.target.value)} />
          </div>
          <div>
            <label className="label-hce">Diagnóstico activo al momento del evento</label>
            <input className="input-hce" placeholder="Ej: HTA, DM2..." value={diagnostico}
              onChange={e => setDiagnostico(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Clasificación */}
      <div className="card-hce p-5 space-y-4">
        <h3 className="card-title">Clasificación *</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-hce">Tipo de evento</label>
            <select className="input-hce" value={clasificacion}
              onChange={e => setClasificacion(e.target.value)} required>
              <option value="">— Seleccionar —</option>
              <option value="incidente">Incidente (near miss) — no llegó al paciente</option>
              <option value="adverso_prevenible">Adverso prevenible</option>
              <option value="adverso_no_prevenible">Adverso no prevenible</option>
              <option value="centinela">Evento centinela — muerte o daño permanente</option>
            </select>
          </div>
          <div>
            <label className="label-hce">Categoría del daño</label>
            <select className="input-hce" value={categoriaDanio}
              onChange={e => setCategoriaDanio(e.target.value)} required>
              <option value="">— Seleccionar —</option>
              <option value="sin_danio">Sin daño</option>
              <option value="leve">Leve — temporal, sin secuelas</option>
              <option value="moderado">Moderado — requirió intervención adicional</option>
              <option value="grave">Grave — daño permanente o soporte vital</option>
              <option value="muerte">Muerte</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="label-hce mb-0">¿Se informó al paciente o familiar?</label>
          <div className="flex gap-4 text-sm">
            {[{ v: true, l: 'Sí' }, { v: false, l: 'No' }, { v: null, l: 'N/A' }].map(({ v, l }) => (
              <label key={l} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="informo" checked={seInformoPaciente === v}
                  onChange={() => setSeInformoPaciente(v)} />
                {l}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Descripción */}
      <div className="card-hce p-5 space-y-4">
        <h3 className="card-title">Descripción del evento *</h3>
        <div>
          <label className="label-hce">¿Qué ocurrió? Describe el evento de forma objetiva</label>
          <textarea className="input-hce" rows={4} value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Describe cronológicamente lo que sucedió..." required />
        </div>
        <div>
          <label className="label-hce">¿Cómo se detectó?</label>
          <input className="input-hce" value={comoDetecto} onChange={e => setComoDetecto(e.target.value)}
            placeholder="Ej: Reporte del paciente, revisión de rutina, otro profesional..." />
        </div>
      </div>

      {/* Factores contribuyentes */}
      <div className="card-hce p-5 space-y-3">
        <h3 className="card-title">Factores contribuyentes</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            { k: 'humano',          l: 'Factor humano (cansancio, comunicación)' },
            { k: 'entorno',         l: 'Entorno / infraestructura' },
            { k: 'equipos',         l: 'Equipos o tecnología' },
            { k: 'organizacional',  l: 'Organizacional (protocolos, carga)' },
            { k: 'paciente',        l: 'Factor del paciente' },
          ] as { k: keyof FactoresContribuyentes; l: string }[]).map(({ k, l }) => (
            <label key={k} className="flex items-start gap-2 text-sm cursor-pointer"
              style={{ color: 'var(--hce-text)' }}>
              <input type="checkbox" className="mt-0.5"
                checked={factores[k] as boolean}
                onChange={e => setFactores(f => ({ ...f, [k]: e.target.checked }))} />
              {l}
            </label>
          ))}
        </div>
        <div>
          <label className="label-hce">Notas adicionales sobre factores</label>
          <textarea className="input-hce" rows={2} value={factores.notas}
            onChange={e => setFactores(f => ({ ...f, notas: e.target.value }))} />
        </div>
      </div>

      {/* Acciones */}
      <div className="card-hce p-5 space-y-4">
        <h3 className="card-title">Acciones y seguimiento</h3>
        <div>
          <label className="label-hce">Acciones inmediatas tomadas</label>
          <textarea className="input-hce" rows={3} value={accionesInmediatas}
            onChange={e => setAccionesInmediatas(e.target.value)}
            placeholder="¿Qué se hizo de inmediato para atender el evento?" />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--hce-text)' }}>
          <input type="checkbox" checked={requiereCausaRaiz}
            onChange={e => setRequiereCausaRaiz(e.target.checked)} />
          Este evento requiere análisis de causa raíz
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={crear.isPending}
          className="btn-primary">
          {crear.isPending ? 'Registrando…' : 'Registrar evento'}
        </button>
      </div>
    </form>
  )
}

// ── Modal de seguimiento ──────────────────────────────────────────────────────

function ModalSeguimiento({ evento, onCerrar }: { evento: EventoAdverso; onCerrar: () => void }) {
  const actualizar = useActualizarSeguimiento(evento.id)
  const [analisis, setAnalisis] = useState(evento.analisis_causa_raiz ?? '')
  const [acciones, setAcciones] = useState(evento.acciones_mejora ?? '')
  const [responsable, setResponsable] = useState(evento.responsable_seguimiento ?? '')
  const [fechaLimite, setFechaLimite] = useState(evento.fecha_limite_mejora ?? '')
  const [estado, setEstado] = useState(evento.estado)
  const [error, setError] = useState('')

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await actualizar.mutateAsync({
        analisis_causa_raiz: analisis.trim() || null,
        acciones_mejora: acciones.trim() || null,
        responsable_seguimiento: responsable.trim() || null,
        fecha_limite_mejora: fechaLimite || null,
        estado,
      })
      onCerrar()
    } catch {
      setError('Error al guardar.')
    }
  }

  const Icon = ESTADO_ICON[evento.estado]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-12 px-4">
      <div className="card-hce w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: 'var(--hce-border)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400">#{String(evento.numero).padStart(4, '0')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[evento.estado]}`}>
                <Icon className="w-3 h-3 inline mr-1" />
                {ESTADO_LABEL[evento.estado]}
              </span>
              {evento.tipo_nombre && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                  {evento.tipo_nombre}
                </span>
              )}
            </div>
            <p className="card-title">
              {new Date(evento.fecha_evento).toLocaleString('es-CO')}
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Resumen del evento */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${DANIO_BADGE[evento.categoria_danio]}`}>
                {DANIO_LABEL[evento.categoria_danio]}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                {CLASIFICACION_LABEL[evento.clasificacion]}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--hce-text)' }}>{evento.descripcion}</p>
            {evento.acciones_inmediatas && (
              <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                <span className="font-medium">Acciones inmediatas:</span> {evento.acciones_inmediatas}
              </p>
            )}
          </div>

          {/* Factores contribuyentes */}
          {evento.factores_contribuyentes && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--hce-text-muted)' }}>Factores contribuyentes</p>
              <div className="flex flex-wrap gap-1">
                {(['humano', 'entorno', 'equipos', 'organizacional', 'paciente'] as const).map(k =>
                  evento.factores_contribuyentes![k] && (
                    <span key={k} className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 capitalize">{k}</span>
                  )
                )}
              </div>
              {evento.factores_contribuyentes.notas && (
                <p className="text-xs mt-1" style={{ color: 'var(--hce-text-muted)' }}>{evento.factores_contribuyentes.notas}</p>
              )}
            </div>
          )}

          {/* Formulario de seguimiento */}
          <form onSubmit={guardar} className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--hce-border)' }}>
            <h4 className="card-title">Seguimiento y cierre</h4>

            {evento.requiere_causa_raiz && (
              <div>
                <label className="label-hce">Análisis de causa raíz</label>
                <textarea className="input-hce" rows={3} value={analisis}
                  onChange={e => setAnalisis(e.target.value)}
                  placeholder="Describe las causas identificadas..." />
              </div>
            )}

            <div>
              <label className="label-hce">Acciones de mejora propuestas</label>
              <textarea className="input-hce" rows={3} value={acciones}
                onChange={e => setAcciones(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-hce">Responsable del seguimiento</label>
                <input className="input-hce" value={responsable} onChange={e => setResponsable(e.target.value)} />
              </div>
              <div>
                <label className="label-hce">Fecha límite de implementación</label>
                <input type="date" className="input-hce" value={fechaLimite}
                  onChange={e => setFechaLimite(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label-hce">Estado del reporte</label>
              <select className="input-hce" value={estado} onChange={e => setEstado(e.target.value as typeof estado)}>
                <option value="abierto">Abierto</option>
                <option value="en_seguimiento">En seguimiento</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onCerrar}
                className="px-4 py-2 text-sm rounded border"
                style={{ borderColor: 'var(--hce-border)', color: 'var(--hce-text-muted)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={actualizar.isPending} className="btn-primary">
                {actualizar.isPending ? 'Guardando…' : 'Guardar seguimiento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function EventosAdversos() {
  const [tab, setTab] = useState<'registros' | 'nuevo'>('registros')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoAdverso | null>(null)

  const { data: eventos = [], isLoading } = useEventosAdversos(
    filtroEstado ? { estado: filtroEstado } : undefined
  )

  const abiertos = eventos.filter(e => e.estado === 'abierto').length
  const enSeguimiento = eventos.filter(e => e.estado === 'en_seguimiento').length

  function handleExito() {
    setTab('registros')
  }

  return (
    <div className="page-hce space-y-6">

      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="page-title">Eventos adversos</h2>
            <p className="page-desc">Registro y seguimiento — PAMEC / Res. 2003/2014</p>
          </div>
        </div>
        <button onClick={() => setTab('nuevo')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo reporte
        </button>
      </div>

      {/* Alertas de eventos abiertos */}
      {abiertos > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            {abiertos === 1
              ? '1 evento adverso abierto requiere seguimiento.'
              : `${abiertos} eventos adversos abiertos requieren seguimiento.`}
            {enSeguimiento > 0 && ` ${enSeguimiento} en seguimiento.`}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--hce-border)' }}>
        {([
          { id: 'registros', label: 'Registros' },
          { id: 'nuevo',     label: 'Nuevo reporte' },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`tab-hce ${tab === id ? 'tab-hce--active' : 'tab-hce--inactive'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Lista de registros */}
      {tab === 'registros' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>Filtrar por estado:</label>
            <select className="input-hce w-auto text-sm"
              value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="abierto">Abiertos</option>
              <option value="en_seguimiento">En seguimiento</option>
              <option value="cerrado">Cerrados</option>
            </select>
          </div>

          {isLoading ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--hce-text-muted)' }}>
              Cargando…
            </p>
          ) : eventos.length === 0 ? (
            <div className="card-hce p-12 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
                No hay eventos registrados.
              </p>
            </div>
          ) : (
            <div className="card-hce divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              {eventos.map(ev => {
                const Icon = ESTADO_ICON[ev.estado]
                return (
                  <button key={ev.id}
                    onClick={() => setEventoSeleccionado(ev)}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-mono w-10 shrink-0" style={{ color: 'var(--hce-text-muted)' }}>
                      #{String(ev.numero).padStart(4, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[ev.estado]}`}>
                          <Icon className="w-3 h-3 inline mr-1" />
                          {ESTADO_LABEL[ev.estado]}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${DANIO_BADGE[ev.categoria_danio]}`}>
                          {DANIO_LABEL[ev.categoria_danio]}
                        </span>
                        {ev.tipo_nombre && (
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500">
                            {ev.tipo_nombre}
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1 truncate" style={{ color: 'var(--hce-text)' }}>
                        {ev.descripcion}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                        {new Date(ev.fecha_evento).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Nuevo reporte */}
      {tab === 'nuevo' && <FormNuevoReporte onExito={handleExito} />}

      {/* Modal de seguimiento */}
      {eventoSeleccionado && (
        <ModalSeguimiento
          evento={eventoSeleccionado}
          onCerrar={() => setEventoSeleccionado(null)}
        />
      )}
    </div>
  )
}
