import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type Encuentro = {
  id: string
  encuentro_id: string
  numero_version: number
  es_ultima_version: boolean
  paciente_documento: string
  encuentro_padre_id?: string
  fecha_atencion: string
  causa_externa: string
  finalidad_consulta: string
  via_ingreso: string
  motivo_consulta: string
  examen_fisico?: string
  codigo_diagnostico_principal: string
  descripcion_diagnostico?: string
  plan_manejo?: string
  fecha_creacion: string
  creado_por: string
}

export type EncuentroInput = {
  encuentro_padre_id?: string
  fecha_atencion?: string
  causa_externa: string
  finalidad_consulta: string
  via_ingreso: string
  motivo_consulta: string
  examen_fisico?: string
  codigo_diagnostico_principal: string
  descripcion_diagnostico?: string
  plan_manejo?: string
}

export function useEncuentros(documento: string) {
  return useQuery({
    queryKey: ['encuentros', documento],
    queryFn: () => apiFetch<Encuentro[]>(`/pacientes/${documento}/encuentros`),
    enabled: !!documento,
  })
}

export function useEncuentro(documento: string, encuentroId: string) {
  return useQuery({
    queryKey: ['encuentros', documento, encuentroId],
    queryFn: () => apiFetch<Encuentro>(`/pacientes/${documento}/encuentros/${encuentroId}`),
    enabled: !!documento && !!encuentroId,
  })
}

export function useCrearEncuentro(documento: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EncuentroInput) =>
      apiFetch<Encuentro>(`/pacientes/${documento}/encuentros`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encuentros', documento] }),
  })
}

export function useActualizarEncuentro(documento: string, encuentroId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<EncuentroInput>) =>
      apiFetch<Encuentro>(`/pacientes/${documento}/encuentros/${encuentroId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encuentros', documento] }),
  })
}
