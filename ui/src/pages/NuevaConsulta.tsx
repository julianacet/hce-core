import { useState } from 'react'
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
  const [query, setQuery] = useState('')

  const { data: resultados = [], isLoading, isError } = usePacientes(query || undefined)
  const buscado = !!query

  function buscar() {
    if (!busqueda.trim()) return
    setQuery(busqueda.trim())
  }

  return (
    <div className="page-hce">
      <div className="page-header">
        <div>
          <h2 className="page-title">Nueva consulta</h2>
          <p className="page-desc">Buscá al paciente antes de registrar el encuentro</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Buscar paciente
        </label>
        <p className="text-xs text-slate-400 mb-3">
          Podés buscar por número de documento, nombre, apellido o teléfono
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            placeholder="Ej: 1234567890 o María García"
            className="input-hce flex-1"
          />
          <button
            onClick={buscar}
            className="btn-primary"
          >
            <Search size={15} />
            Buscar
          </button>
        </div>
      </div>

      {/* Resultados */}
      {buscado && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
          {isLoading && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Buscando...</div>
          )}

          {isError && (
            <div className="px-5 py-8 text-center text-sm text-red-500">
              Error al buscar. Intenta de nuevo.
            </div>
          )}

          {!isLoading && !isError && resultados.length > 0 && (
            <>
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm text-slate-500">{resultados.length} resultado(s) encontrado(s)</p>
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
                        {p.fecha_nacimiento ? ` · Nac. ${p.fecha_nacimiento}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </>
          )}

          {!isLoading && !isError && resultados.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-500 mb-4">No se encontró ningún paciente con esos datos.</p>
              <button
                onClick={() => navigate('/pacientes/nuevo')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-md transition-colors mx-auto"
              >
                <UserPlus size={15} />
                Registrar nuevo paciente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Acceso directo a registro */}
      {!buscado && (
        <button
          onClick={() => navigate('/pacientes/nuevo')}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <UserPlus size={15} />
          Registrar paciente nuevo directamente
        </button>
      )}
    </div>
  )
}
