import { Outlet, NavLink, useParams, useNavigate, useLocation } from 'react-router'
import { User, ClipboardList, PlusCircle } from 'lucide-react'
import { usePaciente } from '../api/pacientes'
import { Breadcrumb } from '../components/Breadcrumb'

export default function PacienteLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: paciente } = usePaciente(id ?? '')

  const nombreCompleto = paciente
    ? [paciente.nombre_primero, paciente.nombre_segundo, paciente.apellido_primero, paciente.apellido_segundo]
        .filter(Boolean).join(' ')
    : '...'

  const crumbs = (() => {
    const base = [
      { label: 'Inicio', to: '/' },
      { label: 'Pacientes', to: '/pacientes' },
      { label: nombreCompleto, to: `/pacientes/${id}` },
    ]
    if (pathname.includes('/encuentros/')) {
      const enc = [{ label: 'Consultas', to: `/pacientes/${id}/encuentros` }, { label: 'Detalle', to: pathname.replace(/\/(formula)$/, '') }]
      if (pathname.endsWith('/formula')) return [...base, ...enc, { label: 'Fórmula' }]
      return [...base, ...enc.slice(0, 1), { label: 'Detalle' }]
    }
    if (pathname.endsWith('/encuentros')) return [...base, { label: 'Consultas' }]
    return base
  })()

  const tabs = [
    { to: `/pacientes/${id}`, label: 'Ficha', icon: User, end: true },
    { to: `/pacientes/${id}/encuentros`, label: 'Consultas', icon: ClipboardList },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 py-6">
        <div style={{ maxWidth: 'var(--hce-page-width)', marginInline: 'auto', paddingInline: '2rem' }}>
          <Breadcrumb items={crumbs} />
          <div className="page-header" style={{ marginBottom: '1rem' }}>
            <div>
              <h2 className="page-title">{nombreCompleto}</h2>
              <p className="page-desc">
                {paciente
                  ? `${paciente.tipo_documento} ${paciente.numero_documento} · ${paciente.edad} años`
                  : id}
              </p>
            </div>
            <button
              onClick={() => navigate('/nueva-consulta/nuevo', { state: { paciente } })}
              className="btn-primary"
            >
              <PlusCircle size={15} />
              Nueva consulta
            </button>
          </div>

          <div className="flex gap-1">
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
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 py-6">
        <div style={{ maxWidth: 'var(--hce-page-width)', marginInline: 'auto', paddingInline: '2rem' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
