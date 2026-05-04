import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, UserPlus, ChevronRight } from 'lucide-react'
import { usePacientes, type Paciente } from '../api/pacientes'

function nombreCompleto(p: Paciente) {
  return [p.nombre_primero, p.nombre_segundo, p.apellido_primero, p.apellido_segundo]
    .filter(Boolean)
    .join(' ')
}

export default function ListaPacientes() {
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState('')
  const { data: pacientes = [], isLoading, isError } = usePacientes(filtro || undefined)

  return (
    <div className="page-hce">
      <div className="page-header">
        <div>
          <h2 className="page-title">Pacientes</h2>
          <p className="page-desc">Listado general de pacientes registrados</p>
        </div>
        <button
          onClick={() => navigate('/pacientes/nuevo')}
          className="btn-primary"
        >
          <UserPlus size={15} />
          Nuevo paciente
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              className="input-hce pl-9"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Cargando...</div>
          )}

          {isError && (
            <div className="px-5 py-8 text-center text-sm text-red-500">
              Error al cargar pacientes. Intenta de nuevo.
            </div>
          )}

          {!isLoading && !isError && pacientes.map((p) => (
            <button
              key={p.numero_documento}
              onClick={() => navigate(`/pacientes/${p.numero_documento}`)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{nombreCompleto(p)}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {p.tipo_documento} {p.numero_documento}
                  {p.telefono ? ` · ${p.telefono}` : ''}
                  {p.codigo_eps ? ` · ${p.codigo_eps}` : ''}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}

          {!isLoading && !isError && pacientes.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              {filtro ? 'No se encontraron pacientes con ese criterio.' : 'Aún no hay pacientes registrados.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
