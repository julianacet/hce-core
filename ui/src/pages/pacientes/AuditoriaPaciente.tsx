import { useParams } from 'react-router'
import { Activity } from 'lucide-react'
import { useAuditoriaPaciente } from '../../api/auditoria'

const colorAccion: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
}

export default function AuditoriaPaciente() {
  const { id } = useParams()
  const { data: logs = [], isLoading, isError } = useAuditoriaPaciente(id ?? '')

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Activity size={16} className="text-slate-400" />
        <h3 className="text-sm font-medium text-slate-700">Auditoría del paciente</h3>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Cargando...</div>
        )}

        {isError && (
          <div className="px-5 py-8 text-center text-sm text-red-500">
            Error al cargar el historial de auditoría.
          </div>
        )}

        {!isLoading && !isError && logs.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            Sin registros de auditoría.
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="px-5 py-3 flex items-start gap-4 text-sm">
            <span className={`mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${colorAccion[log.accion] ?? 'bg-slate-100 text-slate-600'}`}>
              {log.accion}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-0.5 font-mono">{log.nombre_tabla}</p>
              {log.accion === 'UPDATE' && log.datos_anteriores && log.datos_nuevos && (
                <p className="text-xs text-slate-400">
                  <span className="line-through">{log.datos_anteriores}</span>
                  {' → '}
                  <span className="text-slate-700">{log.datos_nuevos}</span>
                </p>
              )}
              {log.accion === 'INSERT' && log.datos_nuevos && (
                <p className="text-xs text-slate-400">{log.datos_nuevos}</p>
              )}
              {log.accion === 'DELETE' && log.datos_anteriores && (
                <p className="text-xs text-slate-400 line-through">{log.datos_anteriores}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400">{log.usuario_id ?? '—'}</p>
              <p className="text-xs text-slate-400">
                {new Date(log.fecha_cambio).toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
