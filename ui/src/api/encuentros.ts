import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { ENCUENTROS_KEY, ENCUENTROS_GLOBAL_KEY } from './keys'

export type DiagnosticoItem = {
  tipo: 'impresion' | 'principal' | 'relacionado' | 'secundario' | 'nota'
  tipo_clinico?: string   // RIPS: '01' impresión | '02' confirmado clínico | '03' confirmado laboratorio
  codigo?: string
  descripcion: string
}

export type EncuentroDiagnostico = DiagnosticoItem & {
  id: string
  orden: number
}

export type ValorNormalNotas = { normal: boolean; notas?: string }
export type ValoresClinicos = Record<string, string | ValorNormalNotas>

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
  descripcion_ingreso?: string
  signos_vitales?: Record<string, string>
  revision_sistemas?: ValoresClinicos
  examen_fisico?: ValoresClinicos
  // Kept for RIPS / list display
  codigo_diagnostico_principal: string
  descripcion_diagnostico?: string
  tipo_diagnostico_principal: string
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
  descripcion_ingreso?: string
  signos_vitales?: Record<string, string>
  revision_sistemas?: ValoresClinicos
  examen_fisico?: ValoresClinicos
  diagnosticos: DiagnosticoItem[]
  tipo_diagnostico_principal?: string
  plan_manejo?: string
}

export type FiltrosEncuentro = {
  desde?: string
  hasta?: string
  diagnostico?: string
  estado?: 'borrador' | 'finalizado'
}

export function useEncuentros(documento: string, filtros?: FiltrosEncuentro) {
  return useQuery({
    queryKey: [...ENCUENTROS_KEY, documento, filtros],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filtros?.desde) params.set('desde', filtros.desde)
      if (filtros?.hasta) params.set('hasta', filtros.hasta)
      if (filtros?.diagnostico) params.set('diagnostico', filtros.diagnostico)
      if (filtros?.estado) params.set('estado', filtros.estado)
      const qs = params.toString()
      return apiFetch<Encuentro[]>(`/pacientes/${documento}/encuentros${qs ? `?${qs}` : ''}`)
    },
    enabled: !!documento,
  })
}

export function useBorradorEncuentro(documento: string) {
  return useQuery({
    queryKey: [...ENCUENTROS_KEY, documento, 'borrador'],
    queryFn: () => apiFetch<Encuentro[]>(`/pacientes/${documento}/encuentros?estado=borrador`),
    enabled: !!documento,
    select: (data) => data[0] ?? null,
  })
}

export function useEncuentro(documento: string, encuentroId: string) {
  return useQuery({
    queryKey: [...ENCUENTROS_KEY, documento, encuentroId],
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ENCUENTROS_KEY, documento] })
      qc.invalidateQueries({ queryKey: ENCUENTROS_GLOBAL_KEY })
    },
  })
}

export function useActualizarEncuentro(documento: string, encuentroId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EncuentroInput) =>
      apiFetch<Encuentro>(`/pacientes/${documento}/encuentros/${encuentroId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ENCUENTROS_KEY, documento] })
    },
  })
}

export function useEliminarEncuentro(documento?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ doc, encuentroId }: { doc: string; encuentroId: string }) =>
      apiFetch(`/pacientes/${doc}/encuentros/${encuentroId}`, { method: 'DELETE' }),
    onSuccess: (_, { doc }) => {
      qc.invalidateQueries({ queryKey: [...ENCUENTROS_KEY, doc] })
      if (documento) qc.invalidateQueries({ queryKey: [...ENCUENTROS_KEY, documento] })
      qc.invalidateQueries({ queryKey: ENCUENTROS_GLOBAL_KEY })
    },
  })
}

export function useFinalizarEncuentro(documento: string, encuentroId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<Encuentro>(`/pacientes/${documento}/encuentros/${encuentroId}/finalizar`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ENCUENTROS_KEY, documento] })
      qc.invalidateQueries({ queryKey: ENCUENTROS_GLOBAL_KEY })
    },
  })
}

// ── Listado global de encuentros ─────────────────────────────────────────────

export type EncuentroResumen = {
  encuentro_id: string
  fecha_atencion: string
  estado: 'borrador' | 'finalizado'
  finalidad_consulta: string
  finalidad_consulta_nombre: string
  motivo_consulta: string
  paciente_documento: string
  tipo_documento: string
  paciente_nombre: string
  codigo_diagnostico_principal: string
  descripcion_diagnostico?: string
}

export type EncuentrosPaginados = {
  encuentros: EncuentroResumen[]
  total: number
}

type EncuentrosPaginadosParams = {
  q: string
  page: number
  limit: number
  desde: string
  hasta: string
  finalidad: string
  estado?: string
  orden?: string
  dir?: string
}

export function useEncuentrosPaginados(params: EncuentrosPaginadosParams) {
  return useQuery({
    queryKey: [...ENCUENTROS_GLOBAL_KEY, params],
    queryFn: () => {
      const p = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
      })
      if (params.q) p.set('q', params.q)
      if (params.desde) p.set('desde', params.desde)
      if (params.hasta) p.set('hasta', params.hasta)
      if (params.finalidad) p.set('finalidad', params.finalidad)
      if (params.estado) p.set('estado', params.estado)
      if (params.orden) p.set('orden', params.orden)
      if (params.dir) p.set('dir', params.dir)
      return apiFetch<EncuentrosPaginados>(`/encuentros?${p}`)
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  })
}

type ExportFiltros = Pick<EncuentrosPaginadosParams, 'q' | 'desde' | 'hasta' | 'finalidad' | 'orden' | 'dir'>

export function exportarEncuentros(filtros: ExportFiltros) {
  const p = new URLSearchParams({ export: '1' })
  if (filtros.q) p.set('q', filtros.q)
  if (filtros.desde) p.set('desde', filtros.desde)
  if (filtros.hasta) p.set('hasta', filtros.hasta)
  if (filtros.finalidad) p.set('finalidad', filtros.finalidad)
  if (filtros.orden) p.set('orden', filtros.orden)
  if (filtros.dir) p.set('dir', filtros.dir)
  return apiFetch<EncuentrosPaginados>(`/encuentros?${p}`)
}
