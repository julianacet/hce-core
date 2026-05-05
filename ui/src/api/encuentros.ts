import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type DiagnosticoItem = {
  tipo: 'principal' | 'secundario' | 'nota'
  codigo?: string
  descripcion: string
}

export type EncuentroDiagnostico = DiagnosticoItem & {
  id: string
  orden: number
}

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
  ta_sistolica?: number
  ta_diastolica?: number
  frecuencia_cardiaca?: number
  frecuencia_respiratoria?: number
  temperatura?: number
  saturacion_o2?: number
  peso?: number
  talla?: number
  examen_fisico?: string
  // Kept for RIPS / list display
  codigo_diagnostico_principal: string
  descripcion_diagnostico?: string
  plan_manejo?: string
  fecha_creacion: string
  creado_por: string
  // Computed labels
  finalidad_consulta_nombre: string
  causa_externa_nombre: string
  via_ingreso_nombre: string
  // Full diagnosis list (populated on detail view)
  diagnosticos?: EncuentroDiagnostico[]
}

export type EncuentroInput = {
  encuentro_padre_id?: string
  fecha_atencion?: string
  causa_externa: string
  finalidad_consulta: string
  via_ingreso: string
  motivo_consulta: string
  ta_sistolica?: number | null
  ta_diastolica?: number | null
  frecuencia_cardiaca?: number | null
  frecuencia_respiratoria?: number | null
  temperatura?: number | null
  saturacion_o2?: number | null
  peso?: number | null
  talla?: number | null
  examen_fisico?: string
  diagnosticos: DiagnosticoItem[]
  plan_manejo?: string
}

export type FiltrosEncuentro = {
  desde?: string
  hasta?: string
  diagnostico?: string
}

export function useEncuentros(documento: string, filtros?: FiltrosEncuentro) {
  return useQuery({
    queryKey: ['encuentros', documento, filtros],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filtros?.desde) params.set('desde', filtros.desde)
      if (filtros?.hasta) params.set('hasta', filtros.hasta)
      if (filtros?.diagnostico) params.set('diagnostico', filtros.diagnostico)
      const qs = params.toString()
      return apiFetch<Encuentro[]>(`/pacientes/${documento}/encuentros${qs ? `?${qs}` : ''}`)
    },
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
