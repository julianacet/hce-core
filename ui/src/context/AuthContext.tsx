import { createContext, useContext, useState, type ReactNode } from 'react'

export type Rol = 'admin' | 'medico' | 'auxiliar'

export type Usuario = {
  id: string
  nombre: string
  usuario: string
  rol: Rol
}

type AuthContextType = {
  usuario: Usuario | null
  login: (usuario: string, password: string) => boolean
  logout: () => void
  tieneRol: (...roles: Rol[]) => boolean
}

const USUARIOS_MOCK = [
  { id: '1', nombre: 'Administrador', usuario: 'admin', password: 'admin123', rol: 'admin' as Rol },
  { id: '2', nombre: 'Dr. García', usuario: 'medico', password: 'medico123', rol: 'medico' as Rol },
]

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = localStorage.getItem('hce_sesion')
    return guardado ? JSON.parse(guardado) : null
  })

  function login(usuarioInput: string, password: string): boolean {
    const encontrado = USUARIOS_MOCK.find(
      (u) => u.usuario === usuarioInput && u.password === password
    )
    if (!encontrado) return false
    const { password: _, ...sesion } = encontrado
    setUsuario(sesion)
    localStorage.setItem('hce_sesion', JSON.stringify(sesion))
    return true
  }

  function logout() {
    setUsuario(null)
    localStorage.removeItem('hce_sesion')
  }

  function tieneRol(...roles: Rol[]): boolean {
    if (!usuario) return false
    return roles.includes(usuario.rol)
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, tieneRol }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
