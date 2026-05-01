import { useState } from 'react'
import { Link } from 'react-router'
import {
  Calendar, Clock, User, Phone, ChevronLeft, ChevronRight,
  Plus, X, Check, XCircle, AlertCircle, CheckCheck,
} from 'lucide-react'
import {
  useCitas, useCitasMes, useCrearCita, useActualizarCita, useCambiarEstadoCita,
} from '../api/citas'
import type { Cita, CitaInput } from '../api/citas'

// ── Slots de 07:00 a 19:30 en intervalos de 30 min ───────────────────────────

const SLOTS: string[] = []
for (let h = 7; h < 20; h++) {
  SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

// ── Constantes de estado ──────────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  programada: 'Programada',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
  completada: 'Completada',
}

const ESTADO_COLOR: Record<string, string> = {
  programada: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmada: 'bg-green-50 text-green-700 border-green-200',
  cancelada: 'bg-red-50 text-red-400 border-red-100',
  no_asistio: 'bg-orange-50 text-orange-700 border-orange-200',
  completada: 'bg-slate-100 text-slate-500 border-slate-200',
}

const ESTADO_DOT: Record<string, string> = {
  programada: 'bg-blue-400',
  confirmada: 'bg-green-400',
  cancelada: 'bg-red-300',
  no_asistio: 'bg-orange-400',
  completada: 'bg-slate-400',
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toLabel(d: Date): string {
  return d.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// ── Mini calendario ───────────────────────────────────────────────────────────

const DIAS_CORTO = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function MiniCalendario({
  currentMonth,
  selectedDate,
  citasFechas,
  onSelectDate,
  onChangeMonth,
}: {
  currentMonth: Date
  selectedDate: Date
  citasFechas: Set<string>
  onSelectDate: (d: Date) => void
  onChangeMonth: (d: Date) => void
}) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPad = (firstDay.getDay() + 6) % 7 // Monday-first

  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = toDateStr(new Date())
  const selectedStr = toDateStr(selectedDate)

  return (
    <div className="card-hce p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onChangeMonth(new Date(year, month - 1, 1))}
          className="p-1 rounded hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" style={{ color: 'var(--hce-text-muted)' }} />
        </button>
        <span className="text-xs font-semibold" style={{ color: 'var(--hce-text)' }}>
          {MESES[month]} {year}
        </span>
        <button
          onClick={() => onChangeMonth(new Date(year, month + 1, 1))}
          className="p-1 rounded hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--hce-text-muted)' }} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DIAS_CORTO.map(d => (
          <div key={d} className="text-center text-xs py-1" style={{ color: 'var(--hce-text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = dateStr === selectedStr
          const isToday = dateStr === todayStr
          const hasCitas = citasFechas.has(dateStr)

          return (
            <button
              key={i}
              onClick={() => onSelectDate(new Date(year, month, day))}
              className="relative flex flex-col items-center justify-center w-7 h-7 mx-auto rounded-full text-xs transition-colors"
              style={
                isSelected
                  ? { backgroundColor: 'var(--hce-primary)', color: '#fff' }
                  : isToday
                  ? { color: 'var(--hce-primary)', fontWeight: 600 }
                  : { color: 'var(--hce-text)' }
              }
            >
              {day}
              {hasCitas && !isSelected && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
              )}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => {
          const hoy = new Date()
          onChangeMonth(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
          onSelectDate(hoy)
        }}
        className="mt-3 w-full text-xs py-1 rounded hover:bg-slate-100 transition-colors"
        style={{ color: 'var(--hce-text-muted)' }}
      >
        Hoy
      </button>
    </div>
  )
}

// ── Formulario de cita ────────────────────────────────────────────────────────

function FormCita({
  inicial,
  onGuardar,
  onCancelar,
  guardando,
  error,
}: {
  inicial: CitaInput
  onGuardar: (input: CitaInput) => void
  onCancelar: () => void
  guardando: boolean
  error: string
}) {
  const [form, setForm] = useState<CitaInput>(inicial)
  const set = (k: keyof CitaInput, v: string | number | null) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onGuardar(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-hce">Fecha *</label>
          <input type="date" className="input-hce" value={form.fecha} required
            onChange={e => set('fecha', e.target.value)} />
        </div>
        <div>
          <label className="label-hce">Hora *</label>
          <input type="time" className="input-hce" value={form.hora_inicio} required
            step="1800"
            onChange={e => set('hora_inicio', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label-hce">Duración</label>
        <select className="input-hce" value={form.duracion_minutos}
          onChange={e => set('duracion_minutos', parseInt(e.target.value))}>
          <option value={15}>15 minutos</option>
          <option value={30}>30 minutos</option>
          <option value={45}>45 minutos</option>
          <option value={60}>1 hora</option>
          <option value={90}>1 hora 30 min</option>
        </select>
      </div>

      <div>
        <label className="label-hce">Nombre del paciente *</label>
        <input className="input-hce" value={form.paciente_nombre} required
          onChange={e => set('paciente_nombre', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-hce">Documento</label>
          <input className="input-hce" value={form.paciente_documento ?? ''}
            placeholder="Opcional"
            onChange={e => set('paciente_documento', e.target.value || null)} />
        </div>
        <div>
          <label className="label-hce">Teléfono</label>
          <input className="input-hce" value={form.paciente_telefono ?? ''}
            placeholder="Opcional"
            onChange={e => set('paciente_telefono', e.target.value || null)} />
        </div>
      </div>

      <div>
        <label className="label-hce">Motivo de consulta</label>
        <input className="input-hce" value={form.motivo ?? ''}
          onChange={e => set('motivo', e.target.value || null)} />
      </div>

      <div>
        <label className="label-hce">Notas internas</label>
        <textarea className="input-hce" rows={2} value={form.notas ?? ''}
          onChange={e => set('notas', e.target.value || null)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 text-sm rounded border"
          style={{ borderColor: 'var(--hce-border)', color: 'var(--hce-text)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={guardando}
          className="px-4 py-2 text-sm rounded text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--hce-primary)' }}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ── Modal: nueva cita ─────────────────────────────────────────────────────────

function ModalNuevaCita({
  fecha,
  horaInicio,
  onCerrar,
}: {
  fecha: string
  horaInicio: string
  onCerrar: () => void
}) {
  const crear = useCrearCita()
  const [error, setError] = useState('')

  const inicial: CitaInput = {
    fecha,
    hora_inicio: horaInicio,
    duracion_minutos: 30,
    paciente_documento: null,
    paciente_nombre: '',
    paciente_telefono: null,
    motivo: null,
    notas: null,
  }

  async function guardar(input: CitaInput) {
    setError('')
    try {
      await crear.mutateAsync(input)
      onCerrar()
    } catch {
      setError('Error al guardar la cita.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-12 px-4">
      <div className="card-hce w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: 'var(--hce-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--hce-text)' }}>Nueva cita</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <FormCita inicial={inicial} onGuardar={guardar} onCancelar={onCerrar}
            guardando={crear.isPending} error={error} />
        </div>
      </div>
    </div>
  )
}

// ── Modal: detalle / editar cita ──────────────────────────────────────────────

function ModalDetalleCita({ cita, onCerrar }: { cita: Cita; onCerrar: () => void }) {
  const actualizar = useActualizarCita(cita.id)
  const cambiarEstado = useCambiarEstadoCita(cita.id)
  const [editando, setEditando] = useState(false)
  const [error, setError] = useState('')

  const cerrado = cita.estado === 'cancelada' || cita.estado === 'completada'

  async function guardar(input: CitaInput) {
    setError('')
    try {
      await actualizar.mutateAsync(input)
      setEditando(false)
    } catch {
      setError('Error al guardar.')
    }
  }

  async function cambiar(estado: string) {
    setError('')
    try {
      await cambiarEstado.mutateAsync(estado)
      onCerrar()
    } catch {
      setError('Error al actualizar el estado.')
    }
  }

  const inicial: CitaInput = {
    fecha: cita.fecha,
    hora_inicio: cita.hora_inicio.slice(0, 5),
    duracion_minutos: cita.duracion_minutos,
    paciente_documento: cita.paciente_documento,
    paciente_nombre: cita.paciente_nombre,
    paciente_telefono: cita.paciente_telefono,
    motivo: cita.motivo,
    notas: cita.notas,
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-12 px-4">
      <div className="card-hce w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: 'var(--hce-border)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--hce-text)' }}>
              {cita.hora_inicio.slice(0, 5)} — {cita.paciente_nombre}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_COLOR[cita.estado]}`}>
              {ESTADO_LABEL[cita.estado]}
            </span>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 ml-2 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {editando ? (
            <FormCita inicial={inicial} onGuardar={guardar} onCancelar={() => setEditando(false)}
              guardando={actualizar.isPending} error={error} />
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--hce-text)' }}>
                  <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--hce-text-muted)' }} />
                  <span>{cita.hora_inicio.slice(0, 5)} · {cita.duracion_minutos} min</span>
                </div>

                {cita.paciente_documento && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--hce-text)' }}>
                    <User className="w-4 h-4 shrink-0" style={{ color: 'var(--hce-text-muted)' }} />
                    <span>{cita.paciente_documento}</span>
                    <Link
                      to={`/pacientes/${cita.paciente_documento}`}
                      className="text-xs underline"
                      style={{ color: 'var(--hce-primary)' }}
                    >
                      Ver ficha →
                    </Link>
                  </div>
                )}

                {cita.paciente_telefono && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--hce-text)' }}>
                    <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--hce-text-muted)' }} />
                    <a href={`tel:${cita.paciente_telefono}`} className="underline">
                      {cita.paciente_telefono}
                    </a>
                  </div>
                )}

                {cita.motivo && (
                  <p className="text-sm" style={{ color: 'var(--hce-text)' }}>
                    <span className="font-medium">Motivo: </span>{cita.motivo}
                  </p>
                )}

                {cita.notas && (
                  <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
                    <span className="font-medium" style={{ color: 'var(--hce-text)' }}>Notas: </span>
                    {cita.notas}
                  </p>
                )}
              </div>

              {!cerrado && (
                <div className="flex flex-wrap gap-2 pt-3 border-t" style={{ borderColor: 'var(--hce-border)' }}>
                  {cita.estado === 'programada' && (
                    <button onClick={() => cambiar('confirmada')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                      <Check className="w-3 h-3" /> Confirmar
                    </button>
                  )}
                  <button onClick={() => cambiar('completada')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                    <CheckCheck className="w-3 h-3" /> Completar
                  </button>
                  <button onClick={() => cambiar('no_asistio')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
                    <AlertCircle className="w-3 h-3" /> No asistió
                  </button>
                  <button onClick={() => cambiar('cancelada')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                    <XCircle className="w-3 h-3" /> Cancelar
                  </button>
                  <button onClick={() => setEditando(true)}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors hover:bg-slate-50"
                    style={{ borderColor: 'var(--hce-border)', color: 'var(--hce-text)' }}>
                    Editar
                  </button>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [slotNueva, setSlotNueva] = useState<string | null>(null)
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null)

  const fechaStr = toDateStr(selectedDate)
  const mesDesde = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`
  const mesHasta = toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0))

  const { data: citasDay = [], isLoading } = useCitas(fechaStr)
  const { data: citasMes = [] } = useCitasMes(mesDesde, mesHasta)

  const citasFechas = new Set(citasMes.map(c => c.fecha))

  function handleSelectDate(d: Date) {
    setSelectedDate(d)
    if (d.getMonth() !== currentMonth.getMonth() || d.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }

  // Agrupar citas por slot de hora (compara primeros 5 chars "09:00")
  const citasPorSlot: Record<string, Cita[]> = {}
  for (const cita of citasDay) {
    const hora = cita.hora_inicio.slice(0, 5)
    if (!citasPorSlot[hora]) citasPorSlot[hora] = []
    citasPorSlot[hora].push(cita)
  }

  const citasActivas = citasDay.filter(c => c.estado !== 'cancelada')
  const completadas = citasDay.filter(c => c.estado === 'completada').length

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--hce-bg)' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'var(--hce-border)', background: 'var(--hce-surface)' }}>
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5" style={{ color: 'var(--hce-primary)' }} />
          <h1 className="text-base font-semibold" style={{ color: 'var(--hce-text)' }}>Agenda</h1>
          {citasActivas.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {completadas}/{citasActivas.length} atendidos hoy
            </span>
          )}
        </div>
        <button
          onClick={() => setSlotNueva('08:00')}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--hce-primary)' }}
        >
          <Plus className="w-4 h-4" />
          Nueva cita
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">

        {/* Columna izquierda: mini calendario + leyenda */}
        <div className="w-52 shrink-0 flex flex-col gap-3">
          <MiniCalendario
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            citasFechas={citasFechas}
            onSelectDate={handleSelectDate}
            onChangeMonth={setCurrentMonth}
          />

          <div className="card-hce p-3 space-y-2">
            {Object.entries(ESTADO_LABEL).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${ESTADO_DOT[k]}`} />
                <span className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vista del día */}
        <div className="flex-1 flex flex-col card-hce overflow-hidden">
          {/* Nav de día */}
          <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--hce-border)' }}>
            <button onClick={() => handleSelectDate(addDays(selectedDate, -1))}
              className="p-1 rounded hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--hce-text-muted)' }} />
            </button>
            <span className="text-sm font-medium flex-1 capitalize" style={{ color: 'var(--hce-text)' }}>
              {toLabel(selectedDate)}
            </span>
            <button onClick={() => handleSelectDate(addDays(selectedDate, 1))}
              className="p-1 rounded hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--hce-text-muted)' }} />
            </button>
          </div>

          {/* Lista de slots */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-sm" style={{ color: 'var(--hce-text-muted)' }}>Cargando...</div>
            ) : (
              SLOTS.map(slot => {
                const citas = citasPorSlot[slot] ?? []
                const esMedia = slot.endsWith(':30')

                return (
                  <div
                    key={slot}
                    className={`flex gap-3 min-h-[3rem] ${!esMedia ? 'border-t' : ''}`}
                    style={{ borderColor: 'var(--hce-border)' }}
                  >
                    {/* Etiqueta de hora — solo en la hora en punto */}
                    <div className="w-14 shrink-0 pt-2 px-3">
                      {!esMedia && (
                        <span className="text-xs tabular-nums" style={{ color: 'var(--hce-text-muted)' }}>
                          {slot}
                        </span>
                      )}
                    </div>

                    {/* Contenido del slot */}
                    <div className="flex-1 py-1 pr-3 flex flex-col gap-1">
                      {citas.length > 0 ? (
                        citas.map(cita => (
                          <button
                            key={cita.id}
                            onClick={() => setCitaSeleccionada(cita)}
                            className={`w-full text-left px-3 py-2 rounded-md text-xs border transition-opacity hover:opacity-80 ${ESTADO_COLOR[cita.estado]}`}
                          >
                            <div className="font-semibold">{cita.paciente_nombre}</div>
                            {cita.motivo && (
                              <div className="opacity-70 truncate mt-0.5">{cita.motivo}</div>
                            )}
                            <div className="opacity-50 mt-0.5">
                              {cita.duracion_minutos} min · {ESTADO_LABEL[cita.estado]}
                            </div>
                          </button>
                        ))
                      ) : (
                        <button
                          onClick={() => setSlotNueva(slot)}
                          className="w-full h-full min-h-[2.5rem] rounded text-xs flex items-center px-3 opacity-0 hover:opacity-100 hover:bg-slate-50 transition-opacity"
                          style={{ color: 'var(--hce-text-muted)' }}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Agendar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {slotNueva !== null && (
        <ModalNuevaCita
          fecha={fechaStr}
          horaInicio={slotNueva}
          onCerrar={() => setSlotNueva(null)}
        />
      )}
      {citaSeleccionada && (
        <ModalDetalleCita
          cita={citaSeleccionada}
          onCerrar={() => setCitaSeleccionada(null)}
        />
      )}
    </div>
  )
}
