import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Search, UserPlus, ChevronRight } from 'lucide-react'
import { usePacientes, type Paciente } from '../api/pacientes'

function nombreCompleto(p: Paciente) {
  return [p.nombre_primero, p.nombre_segundo, p.apellido_primero, p.apellido_segundo]
    .filter(Boolean)
    .join(' ')
}

export default function NuevaConsulta() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [query, setQuery] = useState<string | undefined>(undefined)

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(busqueda.trim() || undefined)
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda])

  const { data: resultados = [], isLoading, isError } = usePacientes(query)

  return (
    <div className="page-hce">
      <div className="page-header">
        <div>
          <h2 className="page-title">Nueva consulta</h2>
          <p className="page-desc">Buscá al paciente antes de registrar el encuentro</p>
        </div>
        <button onClick={() => navigate('/pacientes/nuevo')} className="btn-primary">
          <UserPlus size={15} />
          Nuevo paciente
        </button>
      </div>

      <div className="card-hce overflow-hidden">
        {/* Buscador */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, apellido, documento o teléfono…"
              className="input-hce pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Resultados */}
        {isLoading && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Cargando...</div>
        )}

        {isError && (
          <div className="px-5 py-8 text-center text-sm text-red-500">Error al cargar. Intenta de nuevo.</div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="px-5 py-2.5 border-b border-slate-50">
              <p className="text-xs text-slate-400">
                {query
                  ? `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''} para "${query}"`
                  : `${resultados.length} paciente${resultados.length !== 1 ? 's' : ''} más recientes`}
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {resultados.map((p) => (
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
                      {p.edad != null ? ` · ${p.edad} años` : ''}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
              ))}

              {resultados.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-slate-500 mb-4">
                    {query ? 'No se encontró ningún paciente con esos datos.' : 'Aún no hay pacientes registrados.'}
                  </p>
                  {query && (
                    <button
                      onClick={() => navigate('/pacientes/nuevo')}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-md transition-colors mx-auto"
                    >
                      <UserPlus size={15} />
                      Registrar nuevo paciente
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
