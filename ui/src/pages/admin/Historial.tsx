import { useState } from 'react'
import { UserRound, Stethoscope, Receipt, Users, CalendarDays, Package, AlertTriangle, Pill, FileText, ChevronDown, ChevronUp, PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { Breadcrumb } from '../../components/Breadcrumb'
import { useAuditoria, type LogAuditoria } from '../../api/auditoria'

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeJSON(raw?: string): Record<string, unknown> | null {
  if (!raw) return null
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days} d`
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function describir(log: LogAuditoria): string {
  const d = safeJSON(log.datos_nuevos) ?? safeJSON(log.datos_anteriores) ?? {}

  const nombre = (
    [d.nombre_primero, d.nombre_segundo, d.apellido_primero, d.apellido_segundo]
      .filter(Boolean).join(' ')
  ) || (d.nombre as string) || ''

  switch (log.nombre_tabla) {
    case 'paciente':
      if (log.accion === 'INSERT') return `Se registró el paciente${nombre ? ` ${nombre}` : ''}`
      if (log.accion === 'UPDATE') return `Se actualizó el paciente${nombre ? ` ${nombre}` : ''}`
      if (log.accion === 'DELETE') return `Se eliminó el paciente${nombre ? ` ${nombre}` : ''}`
      break
    case 'encuentro': {
      const doc = d.paciente_documento as string | undefined
      if (log.accion === 'INSERT') return `Se creó una consulta${doc ? ` — paciente ${doc}` : ''}`
      if (log.accion === 'UPDATE') return `Se actualizó una consulta${doc ? ` — paciente ${doc}` : ''}`
      if (log.accion === 'DELETE') return `Se eliminó una consulta`
      break
    }
    case 'formula':
      if (log.accion === 'INSERT') return `Se generó una fórmula médica`
      if (log.accion === 'UPDATE') return `Se actualizó una fórmula médica`
      break
    case 'factura': {
      const doc = d.paciente_documento as string | undefined
      if (log.accion === 'INSERT') return `Se creó una factura${doc ? ` — paciente ${doc}` : ''}`
      if (log.accion === 'UPDATE') {
        if ((d.estado as string) === 'anulada') return `Se anuló una factura${doc ? ` — paciente ${doc}` : ''}`
        return `Se actualizó una factura`
      }
      break
    }
    case 'usuario':
      if (log.accion === 'INSERT') return `Se creó el usuario${nombre ? ` ${nombre}` : ''}`
      if (log.accion === 'UPDATE') return `Se actualizó el usuario${nombre ? ` ${nombre}` : ''}`
      if (log.accion === 'DELETE') return `Se eliminó el usuario${nombre ? ` ${nombre}` : ''}`
      break
    case 'cita': {
      const doc = d.paciente_documento as string | undefined
      if (log.accion === 'INSERT') return `Se agendó una cita${doc ? ` — paciente ${doc}` : ''}`
      if (log.accion === 'UPDATE') return `Se actualizó una cita`
      if (log.accion === 'DELETE') return `Se canceló una cita`
      break
    }
    case 'insumo': {
      const nom = d.nombre as string | undefined
      if (log.accion === 'INSERT') return `Se agregó el insumo${nom ? ` "${nom}"` : ''}`
      if (log.accion === 'UPDATE') return `Se actualizó el insumo${nom ? ` "${nom}"` : ''}`
      if (log.accion === 'DELETE') return `Se eliminó el insumo${nom ? ` "${nom}"` : ''}`
      break
    }
    case 'evento_adverso':
      if (log.accion === 'INSERT') return `Se registró un evento adverso`
      if (log.accion === 'UPDATE') return `Se actualizó un evento adverso`
      break
    case 'consentimiento_firmado':
    case 'consentimiento':
      if (log.accion === 'INSERT') return `Se registró un consentimiento firmado`
      break
  }
  return `${log.accion} en ${log.nombre_tabla}`
}

// ── Mapeos visuales ────────────────────────────────────────────────────────

const TABLA_META: Record<string, { icono: React.ReactNode; color: string }> = {
  paciente:               { icono: <UserRound size={15} />,    color: 'text-blue-500 bg-blue-50' },
  encuentro:              { icono: <Stethoscope size={15} />,  color: 'text-teal-600 bg-teal-50' },
  formula:                { icono: <Pill size={15} />,         color: 'text-purple-600 bg-purple-50' },
  factura:                { icono: <Receipt size={15} />,      color: 'text-orange-500 bg-orange-50' },
  usuario:                { icono: <Users size={15} />,        color: 'text-slate-600 bg-slate-100' },
  cita:                   { icono: <CalendarDays size={15} />, color: 'text-indigo-500 bg-indigo-50' },
  insumo:                 { icono: <Package size={15} />,      color: 'text-amber-600 bg-amber-50' },
  evento_adverso:         { icono: <AlertTriangle size={15} />,color: 'text-red-500 bg-red-50' },
  consentimiento_firmado: { icono: <FileText size={15} />,     color: 'text-green-600 bg-green-50' },
  consentimiento:         { icono: <FileText size={15} />,     color: 'text-green-600 bg-green-50' },
}

const ACCION_META = {
  INSERT: { icono: <PlusCircle size={13} />, color: 'text-green-600 bg-green-100' },
  UPDATE: { icono: <Pencil size={13} />,     color: 'text-amber-600 bg-amber-100' },
  DELETE: { icono: <Trash2 size={13} />,     color: 'text-red-600 bg-red-100' },
}

// ── Componente fila ───────────────────────────────────────────────────────────

function FilaLog({ log }: { log: LogAuditoria }) {
  const [abierto, setAbierto] = useState(false)

  const tablaMeta = TABLA_META[log.nombre_tabla] ?? { icono: <FileText size={15} />, color: 'text-slate-500 bg-slate-100' }
  const accionMeta = ACCION_META[log.accion] ?? ACCION_META.UPDATE

  const datosAntes = safeJSON(log.datos_anteriores)
  const datosNuevos = safeJSON(log.datos_nuevos)

  return (
    <div className="border-b last:border-0" style={{ borderColor: 'var(--hce-border)' }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--hce-bg)] transition-colors text-left"
      >
        {/* Icono tabla */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${tablaMeta.color}`}>
          {tablaMeta.icono}
        </div>

        {/* Descripción */}
        <p className="flex-1 text-sm" style={{ color: 'var(--hce-text)' }}>
          {describir(log)}
        </p>

        {/* Badge acción */}
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${accionMeta.color}`}>
          {accionMeta.icono}
          {log.accion}
        </span>

        {/* Usuario */}
        {log.nombre_usuario && (
          <span className="text-xs shrink-0 hidden sm:block" style={{ color: 'var(--hce-text-muted)' }}>
            {log.nombre_usuario}
          </span>
        )}

        {/* Tiempo */}
        <span className="text-xs shrink-0 w-20 text-right" style={{ color: 'var(--hce-text-muted)' }}>
          {timeAgo(log.fecha_cambio)}
        </span>

        {/* Toggle */}
        <span style={{ color: 'var(--hce-text-muted)' }}>
          {abierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Panel de detalle */}
      {abierto && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-2 flex-wrap text-xs" style={{ color: 'var(--hce-text-muted)' }}>
            <span>Tabla: <code className="font-mono">{log.nombre_tabla}</code></span>
            <span>·</span>
            <span>ID: <code className="font-mono text-xs">{log.registro_id}</code></span>
            <span>·</span>
            <span>{new Date(log.fecha_cambio).toLocaleString('es-CO')}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {datosAntes && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--hce-text-muted)' }}>Antes</p>
                <pre className="text-xs rounded-md p-3 overflow-auto max-h-64 font-mono leading-relaxed"
                  style={{ backgroundColor: 'var(--hce-bg)', border: '1px solid var(--hce-border)', color: 'var(--hce-text)' }}>
                  {JSON.stringify(datosAntes, null, 2)}
                </pre>
              </div>
            )}
            {datosNuevos && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--hce-text-muted)' }}>Después</p>
                <pre className="text-xs rounded-md p-3 overflow-auto max-h-64 font-mono leading-relaxed"
                  style={{ backgroundColor: 'var(--hce-bg)', border: '1px solid var(--hce-border)', color: 'var(--hce-text)' }}>
                  {JSON.stringify(datosNuevos, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const LIMIT = 50

export default function Historial() {
  const [offset, setOffset] = useState(0)
  const { data: logs = [], isLoading } = useAuditoria(LIMIT, offset)

  return (
    <div className="page-hce">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Historial de actividad' }]} />
      <div className="page-header">
        <div>
          <h2 className="page-title">Historial de actividad</h2>
          <p className="page-desc">Registro de cambios en el sistema. Haz clic en una fila para ver el detalle.</p>
        </div>
      </div>

      <div className="card-hce overflow-hidden">
        {isLoading && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>Cargando…</p>
        )}
        {!isLoading && logs.length === 0 && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>Sin actividad registrada.</p>
        )}
        {logs.map((log) => (
          <FilaLog key={log.id} log={log} />
        ))}

        {/* Paginación */}
        {!isLoading && (
          <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--hce-border)', background: 'var(--hce-bg)' }}>
            <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
              {offset + 1}–{offset + logs.length}
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))}>
                Anterior
              </button>
              <button className="btn-secondary text-xs" disabled={logs.length < LIMIT} onClick={() => setOffset(o => o + LIMIT)}>
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
