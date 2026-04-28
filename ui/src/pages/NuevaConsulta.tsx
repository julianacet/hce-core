import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, UserPlus, ChevronRight } from 'lucide-react'

type Resultado = {
  id: string
  nombre: string
  documento: string
  tipo_documento: string
  telefono: string
  fecha_nacimiento: string
}

// Datos de ejemplo hasta conectar la API
const datosMock: Resultado[] = [
  { id: '1', nombre: 'María García López', documento: '1234567890', tipo_documento: 'CC', telefono: '3001234567', fecha_nacimiento: '1985-03-12' },
  { id: '2', nombre: 'Carlos Martínez Ruiz', documento: '9876543210', tipo_documento: 'CC', telefono: '3109876543', fecha_nacimiento: '1970-07-22' },
]

export default function NuevaConsulta() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscado, setBuscado] = useState(false)

  function buscar() {
    if (!busqueda.trim()) return
    const q = busqueda.toLowerCase()
    const encontrados = datosMock.filter(
      (p) =>
        p.documento.includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.telefono.includes(q)
    )
    setResultados(encontrados)
    setBuscado(true)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Nueva consulta</h2>
        <p className="text-sm text-slate-500 mt-1">Buscá al paciente antes de registrar el encuentro</p>
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
            className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={buscar}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-md transition-colors"
          >
            <Search size={15} />
            Buscar
          </button>
        </div>
      </div>

      {/* Resultados */}
      {buscado && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
          {resultados.length > 0 ? (
            <>
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm text-slate-500">{resultados.length} resultado(s) encontrado(s)</p>
              </div>
              <div className="divide-y divide-slate-100">
                {resultados.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/pacientes/${p.id}`)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {p.tipo_documento} {p.documento} · {p.telefono} · Nac. {p.fecha_nacimiento}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </>
          ) : (
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
