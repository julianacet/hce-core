import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../context/AuthContext'

type Props = {
  recurso?: string
  prefijo?: string
}

export default function RutaProtegida({ recurso, prefijo }: Props) {
  const { usuario, puedeAcceder, tieneAlgunRecurso } = useAuth()

  if (!usuario) return <Navigate to="/login" replace />

  if (recurso && !puedeAcceder(recurso)) return <Navigate to="/" replace />
  if (prefijo && !tieneAlgunRecurso(prefijo)) return <Navigate to="/" replace />

  return <Outlet />
}
