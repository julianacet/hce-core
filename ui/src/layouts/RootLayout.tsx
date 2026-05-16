import { Outlet, NavLink, useNavigate } from 'react-router'
import { LayoutDashboard, UserSearch, Users, Settings, ShieldCheck, LogOut, FileCode2, Star, Package, AlertTriangle, Building2, CalendarDays, Receipt } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/TemaContext'

export default function RootLayout() {
  const { usuario, logout, tieneRol } = useAuth()
  const { tema } = useTema()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navGroups = [
    {
      label: null,
      items: [{ to: '/', label: 'Inicio', icon: LayoutDashboard, end: true }],
    },
    {
      label: 'Atención al paciente',
      items: [
        { to: '/nueva-consulta', label: 'Consultas', icon: UserSearch },
        { to: '/pacientes', label: 'Pacientes', icon: Users },
        { to: '/agenda', label: 'Agenda', icon: CalendarDays },
      ],
    },
    {
      label: 'Facturación y reportes',
      items: [
        { to: '/facturas', label: 'Facturación', icon: Receipt },
        { to: '/rips-mensual', label: 'RIPS Mensual', icon: FileCode2 },
      ],
    },
    {
      label: 'Gestión del consultorio',
      items: [
        { to: '/inventario', label: 'Inventario', icon: Package },
        { to: '/proveedores', label: 'Proveedores', icon: Building2 },
        { to: '/eventos-adversos', label: 'Eventos adversos', icon: AlertTriangle },
        { to: '/encuestas', label: 'Encuestas', icon: Star },
      ],
    },
  ]

  return (
    <div className="flex h-screen">
      <aside
        className="w-56 flex flex-col shrink-0 text-white"
        style={{ backgroundColor: tema.colorSidebar }}
      >
        {/* Logo / nombre */}
        <div className="px-5 py-5 border-b border-white/10">
          {tema.logoBase64 ? (
            <img src={tema.logoBase64} alt="Logo" className="h-8 object-contain mb-2" />
          ) : null}
          <h1 className="text-sm font-semibold leading-tight">{tema.nombreSistema}</h1>
          <p className="text-xs text-white/50 mt-0.5">Historia Clínica Electrónica</p>
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 px-3 py-4 flex flex-col overflow-y-auto">
          {navGroups.map((group, i) => (
            <div key={i} className={i > 0 ? 'mt-5' : ''}>
              {group.label && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {group.label}
                </p>
              )}
              <div className={`flex flex-col gap-0.5 ${group.label ? 'pl-2' : ''}`}>
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive ? 'text-white font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive ? { backgroundColor: tema.colorPrimario } : {}
                    }
                  >
                    <Icon size={16} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Solo admin */}
          {tieneRol('admin') && (
            <div className="mt-5">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Sistema
              </p>
              <div className="pl-2">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive ? 'text-white font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`
                }
                style={({ isActive }) =>
                  isActive ? { backgroundColor: tema.colorPrimario } : {}
                }
              >
                <ShieldCheck size={16} />
                Administración
              </NavLink>
              </div>
            </div>
          )}
        </nav>

        {/* Footer: configuración + usuario + logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <NavLink
            to="/configuracion"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'text-white font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: tema.colorPrimario } : {}
            }
          >
            <Settings size={16} />
            Configuración
          </NavLink>

          {/* Info del usuario */}
          <div className="px-3 py-2">
            <p className="text-xs text-white font-medium truncate">{usuario?.nombre}</p>
            <p className="text-xs text-white/40 capitalize">{usuario?.rol}</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
