import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { apiFetch } from '../api/client'

export type TamanoFuente = 'compacto' | 'normal' | 'grande'

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
  tamanoFuente: TamanoFuente
  modoOscuro: boolean
}

export const DEFAULTS: Tema = {
  nombreSistema: 'HCE Consultorio',
  subtituloSidebar: 'Historia Clínica Electrónica',
  logoBase64: null,
  colorSidebar: '#1e3a5f',
  colorSidebarTexto: '#ffffff',
  colorSidebarTextoMuted: 'rgba(255,255,255,0.6)',
  colorPrimario: '#1d4ed8',
  colorPrimarioTexto: '#ffffff',
  colorPrimarioHover: '#1e40af',
  colorFondo: '#f1f5f9',
  colorCard: '#ffffff',
  colorBorde: '#cbd5e1',
  colorTexto: '#0f172a',
  colorTextoMuted: '#475569',
  tamanoFuente: 'normal',
  modoOscuro: false,
}

type TemaContextType = {
  tema: Tema
  guardarTema: (t: Tema) => Promise<void>
}

const TemaContext = createContext<TemaContextType | null>(null)

const FONT_VARS: Record<TamanoFuente, Record<string, string>> = {
  compacto: { xs: '0.6875rem', sm: '0.8125rem', md: '0.9375rem', lg: '1.0625rem', xl: '1.125rem' },
  normal:   { xs: '0.75rem',   sm: '0.875rem',  md: '1rem',      lg: '1.125rem', xl: '1.25rem'  },
  grande:   { xs: '0.8125rem', sm: '0.9375rem', md: '1.0625rem', lg: '1.1875rem', xl: '1.375rem' },
}

const DARK_SURFACES = {
  bg:        '#0f172a',
  card:      '#1e293b',
  border:    '#334155',
  texto:     '#f1f5f9',
  textoMuted:'#94a3b8',
}

function aplicarVariables(t: Tema) {
  const r = document.documentElement
  r.style.setProperty('--hce-sidebar', t.colorSidebar)
  r.style.setProperty('--hce-sidebar-text', t.colorSidebarTexto)
  r.style.setProperty('--hce-sidebar-muted', t.colorSidebarTextoMuted)
  r.style.setProperty('--hce-primary', t.colorPrimario)
  r.style.setProperty('--hce-primary-text', t.colorPrimarioTexto)
  r.style.setProperty('--hce-primary-hover', t.colorPrimarioHover)

  if (t.modoOscuro) {
    r.classList.add('hce-oscuro')
    r.style.setProperty('--hce-bg', DARK_SURFACES.bg)
    r.style.setProperty('--hce-surface', DARK_SURFACES.card)
    r.style.setProperty('--hce-card', DARK_SURFACES.card)
    r.style.setProperty('--hce-border', DARK_SURFACES.border)
    r.style.setProperty('--hce-text', DARK_SURFACES.texto)
    r.style.setProperty('--hce-text-muted', DARK_SURFACES.textoMuted)
  } else {
    r.classList.remove('hce-oscuro')
    r.style.setProperty('--hce-bg', t.colorFondo)
    r.style.setProperty('--hce-surface', t.colorCard)
    r.style.setProperty('--hce-card', t.colorCard)
    r.style.setProperty('--hce-border', t.colorBorde)
    r.style.setProperty('--hce-text', t.colorTexto)
    r.style.setProperty('--hce-text-muted', t.colorTextoMuted)
  }

  const f = FONT_VARS[t.tamanoFuente ?? 'normal']
  r.style.setProperty('--hce-font-xs', f.xs)
  r.style.setProperty('--hce-font-sm', f.sm)
  r.style.setProperty('--hce-font-md', f.md)
  r.style.setProperty('--hce-font-lg', f.lg)
  r.style.setProperty('--hce-font-xl', f.xl)
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

  async function guardarTema(t: Tema): Promise<void> {
    setTema(t)
    localStorage.setItem('hce_tema', JSON.stringify(t))
    await apiFetch('/configuracion/tema', { method: 'PUT', body: JSON.stringify(t) })
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
