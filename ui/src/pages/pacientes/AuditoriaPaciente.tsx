import { Activity } from 'lucide-react'

const logsMock = [
  { id: 1, accion: 'INSERT', campo: '—', antes: '—', despues: 'Registro inicial', usuario: 'dr.medico', fecha: '2026-01-10 09:00' },
  { id: 2, accion: 'UPDATE', campo: 'telefono', antes: '3001111111', despues: '3001234567', usuario: 'dr.medico', fecha: '2026-04-28 11:10' },
]

const colorAccion: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
}

export default function AuditoriaPaciente() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Activity size={16} className="text-slate-400" />
        <h3 className="text-sm font-medium text-slate-700">Auditoría del paciente</h3>
      </div>

      <div className="divide-y divide-slate-100">
        {logsMock.map((log) => (
          <div key={log.id} className="px-5 py-3 flex items-start gap-4 text-sm">
            <span className={`mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${colorAccion[log.accion] ?? 'bg-slate-100 text-slate-600'}`}>
              {log.accion}
            </span>
            <div className="flex-1 min-w-0">
              {log.campo !== '—' && (
                <p className="text-xs text-slate-500 mb-0.5">
                  Campo: <span className="font-mono">{log.campo}</span>
                </p>
              )}
              {log.accion === 'UPDATE' && (
                <p className="text-xs text-slate-400">
                  <span className="line-through">{log.antes}</span>
                  {' → '}
                  <span className="text-slate-700">{log.despues}</span>
                </p>
              )}
              {log.accion === 'INSERT' && (
                <p className="text-xs text-slate-400">{log.despues}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400">{log.usuario}</p>
              <p className="text-xs text-slate-400">{log.fecha}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
