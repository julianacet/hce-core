import { Outlet, NavLink, useNavigate } from 'react-router'
import { LayoutDashboard, UserSearch, Users, Settings, ShieldCheck, LogOut } from 'lucide-react'
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

  const navItems = [
    { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
    { to: '/nueva-consulta', label: 'Nueva consulta', icon: UserSearch },
    { to: '/pacientes', label: 'Pacientes', icon: Users },
  ]

  return (
    <div className="flex min-h-screen">
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
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
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

          {/* Solo admin */}
          {tieneRol('admin') && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mt-2 ${
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
