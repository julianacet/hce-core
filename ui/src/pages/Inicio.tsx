import { Activity } from 'lucide-react'
import { useAuditoria } from '../api/auditoria'

const colorAccion: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
}

export default function Inicio() {
  const { data: logs = [], isLoading, isError } = useAuditoria(50, 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Panel principal</h2>
        <p className="text-sm text-slate-500 mt-1">Actividad general del sistema</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Activity size={16} className="text-slate-400" />
          <h3 className="text-sm font-medium text-slate-700">Log de auditoría general</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Cargando...</div>
          )}

          {isError && (
            <div className="px-5 py-8 text-center text-sm text-red-500">
              Error al cargar el log de auditoría.
            </div>
          )}

          {!isLoading && !isError && logs.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              Sin actividad registrada.
            </div>
          )}

          {logs.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-center gap-4">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${colorAccion[log.accion] ?? 'bg-slate-100 text-slate-600'}`}>
                {log.accion}
              </span>
              <span className="text-xs text-slate-400 font-mono shrink-0">{log.nombre_tabla}</span>
              <span className="text-xs text-slate-400 flex-1 truncate">{log.datos_nuevos ?? log.datos_anteriores ?? '—'}</span>
              <span className="text-xs text-slate-400 shrink-0">{log.usuario_id ?? '—'}</span>
              <span className="text-xs text-slate-400 shrink-0">
                {new Date(log.fecha_cambio).toLocaleString('es-CO')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
