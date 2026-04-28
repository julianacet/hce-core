import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, UserPlus, ChevronRight } from 'lucide-react'

const pacientesMock = [
  { id: '1', nombre: 'María García López', documento: '1234567890', telefono: '3001234567', eps: 'Sura' },
  { id: '2', nombre: 'Carlos Martínez Ruiz', documento: '9876543210', telefono: '3109876543', eps: 'Nueva EPS' },
]

export default function ListaPacientes() {
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState('')

  const filtrados = pacientesMock.filter((p) => {
    const q = filtro.toLowerCase()
    return p.nombre.toLowerCase().includes(q) || p.documento.includes(q)
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Pacientes</h2>
          <p className="text-sm text-slate-500 mt-1">Listado general de pacientes registrados</p>
        </div>
        <button
          onClick={() => navigate('/pacientes/nuevo')}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-md transition-colors"
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
              placeholder="Filtrar por nombre o documento..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtrados.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/pacientes/${p.id}`)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  CC {p.documento} · {p.telefono} · {p.eps}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}

          {filtrados.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              No se encontraron pacientes con ese criterio.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
