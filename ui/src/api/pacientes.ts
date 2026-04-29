import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type Paciente = {
  id: string
  numero_documento: string
  tipo_documento: string
  nombre_primero: string
  nombre_segundo?: string
  apellido_primero: string
  apellido_segundo?: string
  fecha_nacimiento: string
  genero: string
  estado_civil?: string
  ocupacion?: string
  direccion?: string
  nombre_responsable?: string
  telefono_responsable?: string
  parentesco_responsable?: string
  codigo_pais_origen: string
  codigo_municipio_residencia: string
  zona_residencia: string
  tipo_usuario: string
  codigo_etnia: string
  codigo_discapacidad: string
  codigo_eps?: string
  telefono?: string
  correo_electronico?: string
  politica_datos_aceptada: boolean
  numero_version: number
  fecha_creacion: string
  creado_por: string
}

export type PacienteInput = Omit<Paciente,
  'id' | 'numero_version' | 'es_ultima_version' | 'esta_activo' | 'fecha_creacion' | 'creado_por'
>

export function usePacientes(q?: string) {
  return useQuery({
    queryKey: ['pacientes', q],
    queryFn: () => {
      const params = q ? `?q=${encodeURIComponent(q)}` : ''
      return apiFetch<Paciente[]>(`/pacientes${params}`)
    },
  })
}

export function usePaciente(documento: string) {
  return useQuery({
    queryKey: ['pacientes', documento],
    queryFn: () => apiFetch<Paciente>(`/pacientes/${documento}`),
    enabled: !!documento,
  })
}

export function useCrearPaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PacienteInput) =>
      apiFetch<Paciente>('/pacientes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pacientes'] }),
  })
}

export function useActualizarPaciente(documento: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PacienteInput>) =>
      apiFetch<Paciente>(`/pacientes/${documento}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pacientes'] }),
  })
}
