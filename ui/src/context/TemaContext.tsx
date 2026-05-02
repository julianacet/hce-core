import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { apiFetch } from '../api/client'

export type Tema = {
  nombreSistema: string
  subtituloSidebar: string
  logoBase64: string | null
  colorSidebar: string
  colorSidebarTexto: string
  colorSidebarTextoMuted: string
  colorPrimario: string
  colorPrimarioTexto: string
  colorPrimarioHover: string
  colorFondo: string
  colorCard: string
  colorBorde: string
  colorTexto: string
  colorTextoMuted: string
}

export const DEFAULTS: Tema = {
  nombreSistema: 'HCE Consultorio',
  subtituloSidebar: 'Historia Clínica Electrónica',
  logoBase64: null,
  colorSidebar: '#1e3a5f',
  colorSidebarTexto: '#ffffff',
  colorSidebarTextoMuted: 'rgba(255,255,255,0.55)',
  colorPrimario: '#1d4ed8',
  colorPrimarioTexto: '#ffffff',
  colorPrimarioHover: '#1e40af',
  colorFondo: '#f8fafc',
  colorCard: '#ffffff',
  colorBorde: '#e2e8f0',
  colorTexto: '#0f172a',
  colorTextoMuted: '#64748b',
}

type TemaContextType = {
  tema: Tema
  guardarTema: (t: Tema) => void
}

const TemaContext = createContext<TemaContextType | null>(null)

function aplicarVariables(t: Tema) {
  const r = document.documentElement
  r.style.setProperty('--hce-sidebar', t.colorSidebar)
  r.style.setProperty('--hce-sidebar-text', t.colorSidebarTexto)
  r.style.setProperty('--hce-sidebar-muted', t.colorSidebarTextoMuted)
  r.style.setProperty('--hce-primary', t.colorPrimario)
  r.style.setProperty('--hce-primary-text', t.colorPrimarioTexto)
  r.style.setProperty('--hce-primary-hover', t.colorPrimarioHover)
  r.style.setProperty('--hce-bg', t.colorFondo)
  r.style.setProperty('--hce-surface', t.colorCard)
  r.style.setProperty('--hce-card', t.colorCard)
  r.style.setProperty('--hce-border', t.colorBorde)
  r.style.setProperty('--hce-text', t.colorTexto)
  r.style.setProperty('--hce-text-muted', t.colorTextoMuted)
}

function fromCache(): Tema {
  try {
    const raw = localStorage.getItem('hce_tema')
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    const t = fromCache()
    aplicarVariables(t) // aplica sincrónicamente — sin flash
    return t
  })

  useEffect(() => { aplicarVariables(tema) }, [tema])

  // Sincronizar desde el servidor al montar
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/configuracion`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then((data: { tema?: Partial<Tema> } | null) => {
        if (!data?.tema || Object.keys(data.tema).length === 0) return
        const t = { ...DEFAULTS, ...data.tema }
        setTema(t)
        localStorage.setItem('hce_tema', JSON.stringify(t))
      })
  }, [])

  function guardarTema(t: Tema) {
    setTema(t)
    localStorage.setItem('hce_tema', JSON.stringify(t))
    apiFetch('/configuracion/tema', { method: 'PUT', body: JSON.stringify(t) })
      .catch(err => console.error('Error al guardar tema:', err))
  }

  return (
    <TemaContext.Provider value={{ tema, guardarTema }}>
      {children}
    </TemaContext.Provider>
  )
}

export function useTema() {
  const ctx = useContext(TemaContext)
  if (!ctx) throw new Error('useTema debe usarse dentro de TemaProvider')
  return ctx
}
