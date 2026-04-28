import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Tema = {
  // Identidad
  nombreSistema: string
  subtituloSidebar: string
  logoBase64: string | null

  // Sidebar
  colorSidebar: string
  colorSidebarTexto: string
  colorSidebarTextoMuted: string  // texto secundario / íconos

  // Botones y acentos
  colorPrimario: string
  colorPrimarioTexto: string      // texto sobre botones primarios
  colorPrimarioHover: string

  // Contenido principal
  colorFondo: string              // fondo de la zona de contenido
  colorCard: string               // fondo de tarjetas / paneles
  colorBorde: string              // bordes de tarjetas e inputs

  // Texto
  colorTexto: string              // texto principal
  colorTextoMuted: string         // texto secundario / labels
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
  r.style.setProperty('--hce-card', t.colorCard)
  r.style.setProperty('--hce-border', t.colorBorde)
  r.style.setProperty('--hce-text', t.colorTexto)
  r.style.setProperty('--hce-text-muted', t.colorTextoMuted)
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    const guardado = localStorage.getItem('hce_tema')
    return guardado ? { ...DEFAULTS, ...JSON.parse(guardado) } : DEFAULTS
  })

  useEffect(() => { aplicarVariables(tema) }, [tema])

  function guardarTema(t: Tema) {
    setTema(t)
    localStorage.setItem('hce_tema', JSON.stringify(t))
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
