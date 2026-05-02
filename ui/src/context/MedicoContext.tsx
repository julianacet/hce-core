import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { apiFetch } from '../api/client'

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
}

const DEFAULTS: DatosMedico = {
  nombre: '',
  especialidad: '',
  tarjetaProfesional: '',
  direccion: '',
  telefono: '',
  ciudad: '',
  nombreConsultorio: '',
  correoElectronico: '',
  nit: '',
  codPrestador: '',
  firmaBase64: null,
}

type MedicoContextType = {
  medico: DatosMedico
  guardar: (datos: DatosMedico) => void
}

const MedicoContext = createContext<MedicoContextType | null>(null)

function fromCache(): DatosMedico {
  try {
    const raw = localStorage.getItem('hce_medico')
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function MedicoProvider({ children }: { children: ReactNode }) {
  const [medico, setMedico] = useState<DatosMedico>(fromCache)

  // Sincronizar desde el servidor al montar
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/configuracion`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then((data: { medico?: Partial<DatosMedico> } | null) => {
        if (!data?.medico || Object.keys(data.medico).length === 0) return
        const m = { ...DEFAULTS, ...data.medico }
        setMedico(m)
        localStorage.setItem('hce_medico', JSON.stringify(m))
      })
  }, [])

  function guardar(datos: DatosMedico) {
    setMedico(datos)
    localStorage.setItem('hce_medico', JSON.stringify(datos))
    apiFetch('/configuracion/medico', { method: 'PUT', body: JSON.stringify(datos) })
      .catch(err => console.error('Error al guardar datos del médico:', err))
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
