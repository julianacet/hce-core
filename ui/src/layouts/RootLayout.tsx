import { Outlet, NavLink, useNavigate } from 'react-router'
import { LayoutDashboard, UserSearch, Users, ShieldCheck, LogOut, FileCode2, Star, Package, AlertTriangle, Building2, CalendarDays, Receipt, Activity, BadgeDollarSign, FileCheck2 } from 'lucide-react'
import { useAuth, type Rol } from '../context/AuthContext'
import { useTema } from '../context/TemaContext'
import BannerActualizacion from '../components/BannerActualizacion'

type NavItem = {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  roles?: Rol[]
}

type NavGroup = {
  label: string | null
  items: NavItem[]
}

export default function RootLayout() {
  const { usuario, logout, tieneRol } = useAuth()
  const { tema } = useTema()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navGroups: NavGroup[] = [
    {
      label: null,
      items: [{ to: '/', label: 'Inicio', icon: LayoutDashboard, end: true }],
    },
    {
      label: 'Atención al paciente',
      items: [
        { to: '/nueva-consulta', label: 'Consultas', icon: UserSearch, roles: ['medico'] },
        { to: '/pacientes', label: 'Pacientes', icon: Users, roles: ['medico', 'recepcionista', 'enfermeria'] },
        { to: '/agenda', label: 'Agenda', icon: CalendarDays, roles: ['medico', 'recepcionista'] },
        { to: '/consentimientos', label: 'Consentimientos', icon: FileCheck2, roles: ['medico'] },
      ],
    },
    {
      label: 'Facturación y reportes',
      items: [
        { to: '/facturas', label: 'Facturación', icon: Receipt, roles: ['medico', 'recepcionista', 'facturador'] },
        { to: '/rips-mensual', label: 'RIPS Mensual', icon: FileCode2, roles: ['medico', 'facturador'] },
        { to: '/tarifas', label: 'Tarifas', icon: BadgeDollarSign, roles: ['medico', 'facturador'] },
      ],
    },
    {
      label: 'Gestión del consultorio',
      items: [
        { to: '/inventario', label: 'Inventario', icon: Package, roles: ['medico', 'recepcionista'] },
        { to: '/proveedores', label: 'Proveedores', icon: Building2, roles: ['medico'] },
        { to: '/eventos-adversos', label: 'Eventos adversos', icon: AlertTriangle, roles: ['medico'] },
        { to: '/encuestas', label: 'Encuestas', icon: Star, roles: ['medico', 'recepcionista'] },
      ],
    },
  ]

  function itemVisible(item: NavItem) {
    if (!item.roles || item.roles.length === 0) return true
    return tieneRol(...item.roles)
  }

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
          <p className="text-xs text-white/50 mt-0.5">{tema.subtituloSidebar}</p>
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 px-3 py-4 flex flex-col overflow-y-auto">
          {navGroups.map((group, i) => {
            const visibles = group.items.filter(itemVisible)
            if (visibles.length === 0) return null
            return (
            <div key={i} className={i > 0 ? 'mt-5' : ''}>
              {group.label && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {group.label}
                </p>
              )}
              <div className={`flex flex-col gap-0.5 ${group.label ? 'pl-2' : ''}`}>
                {visibles.map(({ to, label, icon: Icon, end }) => (
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
            )
          })}

          {/* Solo admin */}
          {tieneRol('admin') && (
            <div className="mt-5">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Sistema
              </p>
              <div className="pl-2 flex flex-col gap-0.5">
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
                <NavLink
                  to="/historial"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive ? 'text-white font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`
                  }
                  style={({ isActive }) =>
                    isActive ? { backgroundColor: tema.colorPrimario } : {}
                  }
                >
                  <Activity size={16} />
                  Historial de actividad
                </NavLink>
              </div>
            </div>
          )}
        </nav>

        {/* Footer: usuario + logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
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

      <main className="flex-1 overflow-auto flex flex-col">
        <BannerActualizacion />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
