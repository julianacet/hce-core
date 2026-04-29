import { useNavigate, useParams } from 'react-router'
import { FileText, Activity } from 'lucide-react'
import { useEncuentro } from '../../api/encuentros'
import { useAuditoriaEncuentro } from '../../api/auditoria'

const finalidades: Record<string, string> = {
  '10': 'Consulta de primera vez',
  '11': 'Consulta de control',
  '12': 'Urgencias',
}

const causasExternas: Record<string, string> = {
  '13': 'Enfermedad general',
  '01': 'Accidente de trabajo',
  '02': 'Accidente de tránsito',
}

const viasIngreso: Record<string, string> = {
  '02': 'Consulta externa',
  '01': 'Urgencias',
  '03': 'Hospitalización',
}

const colorAccion: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
}

export default function DetalleEncuentro() {
  const { id, encId } = useParams()
  const navigate = useNavigate()
  const { data: e, isLoading, isError } = useEncuentro(id ?? '', encId ?? '')
  const { data: logs = [] } = useAuditoriaEncuentro(encId ?? '')

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-400">Cargando encuentro...</div>
  }

  if (isError || !e) {
    return <div className="p-6 text-sm text-red-500">Error al cargar el encuentro.</div>
  }

  const diagnostico = [e.codigo_diagnostico_principal, e.descripcion_diagnostico].filter(Boolean).join(' - ')

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Detalle del encuentro */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Detalle del encuentro clínico</h3>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">v{e.numero_version}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            ['Fecha', new Date(e.fecha_atencion).toLocaleString('es-CO')],
            ['Finalidad', finalidades[e.finalidad_consulta] ?? e.finalidad_consulta],
            ['Causa externa', causasExternas[e.causa_externa] ?? e.causa_externa],
            ['Vía de ingreso', viasIngreso[e.via_ingreso] ?? e.via_ingreso],
            ['Registrado por', e.creado_por],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 mb-0.5">{label}</p>
              <p className="text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          {[
            ['Motivo de consulta', e.motivo_consulta],
            ['Examen físico', e.examen_fisico],
            ['Diagnóstico principal', diagnostico],
            ['Plan de manejo', e.plan_manejo],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="text-sm text-slate-800 leading-relaxed">{value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">Este registro es inmutable. Para modificar, se creará una nueva versión.</p>
          <button
            onClick={() => navigate(`/pacientes/${id}/encuentros/${encId}/formula`)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-md transition-colors"
          >
            <FileText size={15} />
            Generar fórmula médica
          </button>
        </div>
      </div>

      {/* Log de auditoría del encuentro */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Activity size={16} className="text-slate-400" />
          <h3 className="text-sm font-medium text-slate-700">Historial de cambios</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {logs.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-slate-400">Sin registros de cambios.</div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-4 text-sm">
              <span className={`mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${colorAccion[log.accion] ?? 'bg-slate-100 text-slate-600'}`}>
                {log.accion}
              </span>
              <div className="flex-1 min-w-0 text-xs text-slate-400 truncate">
                {log.datos_nuevos ?? log.datos_anteriores ?? '—'}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">{log.usuario_id ?? '—'}</p>
                <p className="text-xs text-slate-400">{new Date(log.fecha_cambio).toLocaleString('es-CO')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
