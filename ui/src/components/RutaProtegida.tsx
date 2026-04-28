import { Navigate, Outlet } from 'react-router'
import { useAuth, type Rol } from '../context/AuthContext'

type Props = {
  roles?: Rol[]
}

export default function RutaProtegida({ roles }: Props) {
  const { usuario, tieneRol } = useAuth()

  if (!usuario) return <Navigate to="/login" replace />

  if (roles && !tieneRol(...roles)) return <Navigate to="/" replace />

  return <Outlet />
}
