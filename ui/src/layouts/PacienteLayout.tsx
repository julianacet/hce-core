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
          className="btn-ghost mb-3"
        >
          <ArrowLeft size={14} />
          Volver
        </button>

        <div className="flex items-center justify-between">
          <div>
            <p className="section-title mb-0.5">Paciente</p>
            <h2 className="page-title" style={{ fontSize: 'var(--hce-font-lg)' }}>{nombreCompleto}</h2>
            <p className="page-desc" style={{ marginTop: '0.125rem' }}>
              {paciente
                ? `${paciente.tipo_documento} ${paciente.numero_documento} · ${paciente.edad} años`
                : id}
            </p>
          </div>
          <button
            onClick={() => navigate(`/pacientes/${id}/encuentros/nuevo`)}
            className="btn-primary"
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
                  isActive ? 'font-medium' : 'hover:bg-slate-100'
                }`
              }
              style={({ isActive }) => isActive
                ? { backgroundColor: 'color-mix(in srgb, var(--hce-primary) 10%, transparent)', color: 'var(--hce-primary)' }
                : { color: 'var(--hce-text-muted)' }
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
