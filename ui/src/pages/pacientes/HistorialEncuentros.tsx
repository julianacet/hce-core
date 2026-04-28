import { useNavigate, useParams } from 'react-router'
import { ChevronRight, PlusCircle } from 'lucide-react'

const encuentrosMock = [
  { id: 'e1', fecha: '2026-04-28 10:55', diagnostico: 'J00 - Rinofaringitis aguda', motivo: 'Dolor de garganta y fiebre', version: 1 },
  { id: 'e2', fecha: '2026-01-15 09:30', diagnostico: 'K29.7 - Gastritis', motivo: 'Dolor abdominal', version: 2 },
]

export default function HistorialEncuentros() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{encuentrosMock.length} encuentro(s) registrado(s)</p>
        <button
          onClick={() => navigate(`/pacientes/${id}/encuentros/nuevo`)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-md transition-colors"
        >
          <PlusCircle size={15} />
          Nuevo encuentro
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {encuentrosMock.map((e) => (
            <button
              key={e.id}
              onClick={() => navigate(`/pacientes/${id}/encuentros/${e.id}`)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{e.diagnostico}</p>
                <p className="text-xs text-slate-400 mt-0.5">{e.motivo} · {e.fecha} · v{e.version}</p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
