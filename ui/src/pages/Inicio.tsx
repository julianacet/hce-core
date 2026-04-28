import { Activity } from 'lucide-react'

const logsEjemplo = [
  { id: 1, tabla: 'paciente', accion: 'INSERT', usuario: 'dr.medico', fecha: '2026-04-28 10:42', descripcion: 'Registro de nuevo paciente' },
  { id: 2, tabla: 'encuentro_clinico', accion: 'INSERT', usuario: 'dr.medico', fecha: '2026-04-28 10:55', descripcion: 'Nuevo encuentro clínico registrado' },
  { id: 3, tabla: 'paciente', accion: 'UPDATE', usuario: 'dr.medico', fecha: '2026-04-28 11:10', descripcion: 'Actualización de datos del paciente' },
]

const colorAccion: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
}

export default function Inicio() {
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
          {logsEjemplo.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-center gap-4">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorAccion[log.accion] ?? 'bg-slate-100 text-slate-600'}`}>
                {log.accion}
              </span>
              <span className="text-xs text-slate-400 font-mono">{log.tabla}</span>
              <span className="text-sm text-slate-700 flex-1">{log.descripcion}</span>
              <span className="text-xs text-slate-400">{log.usuario}</span>
              <span className="text-xs text-slate-400">{log.fecha}</span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-400">Datos de ejemplo — se conectará a la API cuando el backend esté listo</p>
        </div>
      </div>
    </div>
  )
}
