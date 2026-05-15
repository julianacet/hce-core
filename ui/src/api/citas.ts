import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { CITAS_KEY, CITAS_MES_KEY } from './keys'

export type Cita = {
  id: string
  fecha: string           // "2026-05-01"
  hora_inicio: string     // "09:00:00" (PostgreSQL TIME)
  duracion_minutos: number
  paciente_documento: string | null
  paciente_nombre: string
  paciente_telefono: string | null
  motivo: string | null
  estado: 'programada' | 'confirmada' | 'cancelada' | 'no_asistio' | 'completada'
  notas: string | null
  creado_por: string
  fecha_creacion: string
}

export type CitaInput = {
  fecha: string
  hora_inicio: string
  duracion_minutos: number
  paciente_documento: string | null
  paciente_nombre: string
  paciente_telefono: string | null
  motivo: string | null
  notas: string | null
}

export function useCitas(fecha: string) {
  return useQuery<Cita[]>({
    queryKey: [...CITAS_KEY, fecha],
    queryFn: () => apiFetch(`/citas?fecha=${fecha}`),
  })
}

export function useCitasMes(desde: string, hasta: string) {
  return useQuery<Cita[]>({
    queryKey: [...CITAS_MES_KEY, desde, hasta],
    queryFn: () => apiFetch(`/citas?desde=${desde}&hasta=${hasta}`),
  })
}

export function useCrearCita() {
  const qc = useQueryClient()
  return useMutation<Cita, Error, CitaInput>({
    mutationFn: (input) => apiFetch('/citas', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CITAS_KEY }),
  })
}

export function useActualizarCita(id: string) {
  const qc = useQueryClient()
  return useMutation<Cita, Error, CitaInput>({
    mutationFn: (input) => apiFetch(`/citas/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CITAS_KEY }),
  })
}

export function useCambiarEstadoCita(id: string) {
  const qc = useQueryClient()
  return useMutation<Cita, Error, string>({
    mutationFn: (estado) =>
      apiFetch(`/citas/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CITAS_KEY }),
  })
}

export function useEliminarCita() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/citas/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      qc.setQueriesData<Cita[]>({ queryKey: CITAS_KEY }, (old) => old?.filter(c => c.id !== id) ?? [])
      qc.setQueriesData<Cita[]>({ queryKey: CITAS_MES_KEY }, (old) => old?.filter(c => c.id !== id) ?? [])
    },
  })
}
