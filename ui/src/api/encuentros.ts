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

export type ValorNormalNotas = { normal: boolean; notas?: string }

export type Encuentro = {
  id: string
  encuentro_id: string
  numero_version: number
  es_ultima_version: boolean
  esta_activo: boolean
  estado: 'borrador' | 'finalizado'
  paciente_documento: string
  encuentro_padre_id?: string
  fecha_atencion: string
  causa_externa: string
  finalidad_consulta: string
  via_ingreso: string
  motivo_consulta: string
  signos_vitales?: Record<string, string>
  examen_fisico?: Record<string, string | ValorNormalNotas>
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
  // Only set on detail view for controls. true = primer control → sin cargo.
  es_primer_control?: boolean
}

export type EncuentroInput = {
  encuentro_padre_id?: string
  fecha_atencion?: string
  causa_externa: string
  finalidad_consulta: string
  via_ingreso: string
  motivo_consulta: string
  signos_vitales?: Record<string, string>
  examen_fisico?: Record<string, string | ValorNormalNotas>
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

export function useFinalizarEncuentro(documento: string, encuentroId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<Encuentro>(`/pacientes/${documento}/encuentros/${encuentroId}/finalizar`, {
        method: 'PATCH',
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
