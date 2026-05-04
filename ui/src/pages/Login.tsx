import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/TemaContext'

export default function Login() {
  const { login } = useAuth()
  const { tema } = useTema()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError(false)
    const ok = await login(usuario, password)
    setCargando(false)
    if (ok) navigate('/')
    else setError(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: tema.colorFondo }}>
      <div className="w-full max-w-sm">

        {/* Logo / nombre */}
        <div className="flex flex-col items-center mb-8">
          {tema.logoBase64 ? (
            <img src={tema.logoBase64} alt="Logo" className="h-16 object-contain mb-3" />
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ backgroundColor: tema.colorSidebar }}>
              <span className="text-2xl font-bold" style={{ color: tema.colorSidebarTexto }}>
                {tema.nombreSistema.charAt(0)}
              </span>
            </div>
          )}
          <h1 className="text-xl font-semibold" style={{ color: tema.colorTexto }}>
            {tema.nombreSistema}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: tema.colorTextoMuted }}>
            {tema.subtituloSidebar}
          </p>
        </div>

        {/* Formulario */}
        <div className="card-hce shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-hce">Usuario</label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder="nombre de usuario"
                className="input-hce"
              />
            </div>

            <div>
              <label className="label-hce">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-hce"
              />
            </div>

            {error && (
              <p className="form-error">
                Usuario o contraseña incorrectos.
              </p>
            )}

            <button type="submit" disabled={cargando} className="btn-primary w-full justify-center">
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: tema.colorTextoMuted }}>
          Sistema de uso exclusivo del personal autorizado
        </p>
      </div>
    </div>
  )
}
