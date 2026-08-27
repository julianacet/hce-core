import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../context/AuthContext'

type Props = {
  recurso?: string
}

export default function RutaProtegida({ recurso }: Props) {
  const { usuario, puedeAcceder } = useAuth()

  if (!usuario) return <Navigate to="/login" replace />

  if (recurso && !puedeAcceder(recurso)) return <Navigate to="/" replace />

  return <Outlet />
}
