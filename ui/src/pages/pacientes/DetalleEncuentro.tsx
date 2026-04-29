import { useNavigate, useParams } from 'react-router'
import { FileText } from 'lucide-react'
import { useEncuentro } from '../../api/encuentros'

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

export default function DetalleEncuentro() {
  const { id, encId } = useParams()
  const navigate = useNavigate()
  const { data: e, isLoading, isError } = useEncuentro(id ?? '', encId ?? '')

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-400">Cargando encuentro...</div>
  }

  if (isError || !e) {
    return <div className="p-6 text-sm text-red-500">Error al cargar el encuentro.</div>
  }

  const diagnostico = [e.codigo_diagnostico_principal, e.descripcion_diagnostico].filter(Boolean).join(' - ')

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl space-y-5">
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
  )
}
