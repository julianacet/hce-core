import { createContext, useContext, useState, type ReactNode } from 'react'
import { apiFetch } from '../api/client'

export type Rol = 'admin' | 'medico' | 'recepcionista' | 'enfermeria' | 'facturador' | 'farmacia'

export type Usuario = {
  id: string
  nombre: string
  usuario: string
  rol: Rol
  permisos: string[]
}

type AuthContextType = {
  usuario: Usuario | null
  login: (usuario: string, password: string) => Promise<boolean>
  logout: () => void
  puedeAcceder: (recurso: string) => boolean
  tieneAlgunRecurso: (prefijo: string) => boolean
}

type LoginResponse = {
  token: string
  nombre: string
  rol: string
  permisos: string[]
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(b64))
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = localStorage.getItem('hce_sesion')
    if (!guardado) return null
    const sesion = JSON.parse(guardado) as Usuario
    // Sesiones guardadas antes de que existiera `permisos` (antigua actualización)
    // se descartan en vez de crashear puedeAcceder(): el usuario vuelve a login,
    // donde /auth/login ya le devuelve la sesión con el campo correcto.
    if (!Array.isArray(sesion.permisos)) return null
    return sesion
  })

  async function login(usuarioInput: string, password: string): Promise<boolean> {
    try {
      const data = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ nombre_usuario: usuarioInput, contrasena: password }),
      })

      const payload = decodeJwtPayload(data.token)

      const sesion: Usuario = {
        id: payload.id as string,
        nombre: data.nombre,
        usuario: usuarioInput,
        rol: data.rol as Rol,
        permisos: data.permisos,
      }

      localStorage.setItem('hce_token', data.token)
      localStorage.setItem('hce_sesion', JSON.stringify(sesion))
      setUsuario(sesion)
      return true
    } catch {
      return false
    }
  }

  function logout() {
    setUsuario(null)
    localStorage.removeItem('hce_token')
    localStorage.removeItem('hce_sesion')
  }

  function puedeAcceder(recurso: string): boolean {
    if (!usuario) return false
    return usuario.permisos.includes(recurso)
  }

  function tieneAlgunRecurso(prefijo: string): boolean {
    if (!usuario) return false
    return usuario.permisos.some((p) => p.startsWith(prefijo))
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, puedeAcceder, tieneAlgunRecurso }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
