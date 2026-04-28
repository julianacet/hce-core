import { createContext, useContext, useState, type ReactNode } from 'react'

export type DatosMedico = {
  nombre: string
  especialidad: string
  tarjetaProfesional: string
  direccion: string
  telefono: string
  ciudad: string
  nombreConsultorio: string
  correoElectronico: string   // para futura integración con Google Drive
  firmaBase64: string | null
}

const defaults: DatosMedico = {
  nombre: '',
  especialidad: '',
  tarjetaProfesional: '',
  direccion: '',
  telefono: '',
  ciudad: '',
  nombreConsultorio: '',
  correoElectronico: '',
  firmaBase64: null,
}

type MedicoContextType = {
  medico: DatosMedico
  guardar: (datos: DatosMedico) => void
}

const MedicoContext = createContext<MedicoContextType | null>(null)

export function MedicoProvider({ children }: { children: ReactNode }) {
  const [medico, setMedico] = useState<DatosMedico>(() => {
    const guardado = localStorage.getItem('hce_medico')
    return guardado ? JSON.parse(guardado) : defaults
  })

  function guardar(datos: DatosMedico) {
    setMedico(datos)
    localStorage.setItem('hce_medico', JSON.stringify(datos))
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
