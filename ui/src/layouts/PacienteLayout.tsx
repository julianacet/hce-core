import { Outlet, NavLink, useParams, useNavigate } from 'react-router'
import { User, ClipboardList, Shield, ArrowLeft, PlusCircle } from 'lucide-react'
import { usePaciente } from '../api/pacientes'

export default function PacienteLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: paciente } = usePaciente(id ?? '')

  const nombreCompleto = paciente
    ? [paciente.nombre_primero, paciente.nombre_segundo, paciente.apellido_primero, paciente.apellido_segundo]
        .filter(Boolean).join(' ')
    : '...'

  const tabs = [
    { to: `/pacientes/${id}`, label: 'Ficha', icon: User, end: true },
    { to: `/pacientes/${id}/encuentros`, label: 'Encuentros', icon: ClipboardList },
    { to: `/pacientes/${id}/auditoria`, label: 'Auditoría', icon: Shield },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver
        </button>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Paciente</p>
            <h2 className="text-lg font-semibold text-slate-800">{nombreCompleto}</h2>
            <p className="text-sm text-slate-500">
              {paciente ? `${paciente.tipo_documento} ${paciente.numero_documento}` : id}
            </p>
          </div>
          <button
            onClick={() => navigate(`/pacientes/${id}/encuentros/nuevo`)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-md transition-colors"
          >
            <PlusCircle size={15} />
            Nuevo encuentro
          </button>
        </div>

        <div className="flex gap-1 mt-4">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <Outlet />
      </div>
    </div>
  )
}
