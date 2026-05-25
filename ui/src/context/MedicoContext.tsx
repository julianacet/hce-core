import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { apiFetch } from '../api/client'
import { type ConfigImpresion, DEFAULTS_IMPRESION } from '../utils/impresion'

export type DatosMedico = {
  nombre: string
  especialidad: string
  tarjetaProfesional: string
  direccion: string
  telefono: string
  ciudad: string
  nombreConsultorio: string
  correoElectronico: string
  nit: string
  codPrestador: string
  firmaBase64: string | null
  primerControlGratis: boolean
  impresion: ConfigImpresion
}

const DEFAULTS: DatosMedico = {
  nombre: '',
  especialidad: '',
  tarjetaProfesional: '',
  direccion: '',
  telefono: '',
  ciudad: '',
  nombreConsultorio: '',
  nit: '',
  codPrestador: '',
  correoElectronico: '',
  firmaBase64: null,
  primerControlGratis: true,
  impresion: DEFAULTS_IMPRESION,
}

type MedicoContextType = {
  medico: DatosMedico
  guardar: (datos: DatosMedico) => Promise<void>
}

const MedicoContext = createContext<MedicoContextType | null>(null)

function fromCache(): DatosMedico {
  try {
    const raw = localStorage.getItem('hce_medico')
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULTS,
      ...parsed,
      impresion: { ...DEFAULTS_IMPRESION, ...parsed.impresion },
    }
  } catch {
    return DEFAULTS
  }
}

export function MedicoProvider({ children }: { children: ReactNode }) {
  const [medico, setMedico] = useState<DatosMedico>(fromCache)

  // Sincronizar desde el servidor al montar
  useEffect(() => {
    fetch('/api/configuracion')
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then((data: { medico?: Partial<DatosMedico> } | null) => {
        if (!data?.medico || Object.keys(data.medico).length === 0) return
        const m = { ...DEFAULTS, ...data.medico }
        setMedico(m)
        localStorage.setItem('hce_medico', JSON.stringify(m))
      })
  }, [])

  async function guardar(datos: DatosMedico): Promise<void> {
    setMedico(datos)
    localStorage.setItem('hce_medico', JSON.stringify(datos))
    await apiFetch('/configuracion/medico', { method: 'PUT', body: JSON.stringify(datos) })
  }

  return (
    <MedicoContext.Provider value={{ medico, guardar }}>
      {children}
    </MedicoContext.Provider>
  )
}

export function useMedico() {
  const ctx = useContext(MedicoContext)
  if (!ctx) throw new Error('useMedico debe usarse dentro de MedicoProvider')
  return ctx
}
