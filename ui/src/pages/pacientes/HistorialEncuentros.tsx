import { useNavigate, useParams } from 'react-router'
import { ChevronRight, PlusCircle } from 'lucide-react'
import { useEncuentros } from '../../api/encuentros'

export default function HistorialEncuentros() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: encuentros = [], isLoading, isError } = useEncuentros(id ?? '')

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {isLoading ? 'Cargando...' : `${encuentros.length} encuentro(s) registrado(s)`}
        </p>
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
          {isError && (
            <div className="px-5 py-8 text-center text-sm text-red-500">
              Error al cargar encuentros. Intenta de nuevo.
            </div>
          )}

          {!isLoading && !isError && encuentros.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              No hay encuentros registrados para este paciente.
            </div>
          )}

          {encuentros.map((e) => (
            <button
              key={e.encuentro_id}
              onClick={() => navigate(`/pacientes/${id}/encuentros/${e.encuentro_id}`)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {e.codigo_diagnostico_principal}
                  {e.descripcion_diagnostico ? ` - ${e.descripcion_diagnostico}` : ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {e.motivo_consulta} · {new Date(e.fecha_atencion).toLocaleString('es-CO')} · v{e.numero_version}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
