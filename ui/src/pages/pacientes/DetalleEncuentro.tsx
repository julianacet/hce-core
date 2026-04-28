import { useNavigate, useParams } from 'react-router'
import { FileText } from 'lucide-react'

export default function DetalleEncuentro() {
  const { id, encId } = useParams()
  const navigate = useNavigate()
  const encuentro = {
    fecha: '2026-04-28 10:55',
    finalidad: 'Consulta de primera vez',
    causa_externa: 'Enfermedad general',
    via_ingreso: 'Consulta externa',
    motivo: 'Dolor de garganta y fiebre de 38.5°C de 2 días de evolución.',
    examen_fisico: 'Faringe eritematosa, amígdalas hipertróficas sin exudado. FC 88 bpm, FR 18 rpm, T° 38.2°C.',
    diagnostico: 'J00 - Rinofaringitis aguda',
    plan_manejo: 'Acetaminofén 500mg cada 8 horas por 3 días. Abundantes líquidos. Control en 5 días si no mejora.',
    version: 1,
    creado_por: 'dr.medico',
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Detalle del encuentro clínico</h3>
        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">v{encuentro.version}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        {[
          ['Fecha', encuentro.fecha],
          ['Finalidad', encuentro.finalidad],
          ['Causa externa', encuentro.causa_externa],
          ['Vía de ingreso', encuentro.via_ingreso],
          ['Registrado por', encuentro.creado_por],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-slate-400 mb-0.5">{label}</p>
            <p className="text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-4">
        {[
          ['Motivo de consulta', encuentro.motivo],
          ['Examen físico', encuentro.examen_fisico],
          ['Diagnóstico principal', encuentro.diagnostico],
          ['Plan de manejo', encuentro.plan_manejo],
        ].map(([label, value]) => (
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
