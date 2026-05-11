import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type ListaCampo = { campo: string; label: string; requerido: boolean }

export type AntecedentePregunta = {
  id: string
  categoria: string
  texto: string
  tipo_respuesta: 'booleano' | 'texto' | 'numero' | 'fecha' | 'opciones' | 'lista'
  opciones: string[] | ListaCampo[] | null
  tiene_detalle: boolean
  placeholder_detalle?: string
  solo_genero?: string
  orden: number
  esta_activo: boolean
}

export type PreguntaConRespuesta = AntecedentePregunta & {
  valor?: string
  detalle?: string
}

export type AntecedentesCompletos = Record<string, PreguntaConRespuesta[]>

export type RespuestaInput = {
  pregunta_id: string
  valor: string
  detalle?: string
}

// ── Patient hooks ─────────────────────────────────────────────────────────────

export function useAntecedentes(documento: string) {
  return useQuery({
    queryKey: ['antecedentes', documento],
    queryFn: () => apiFetch<AntecedentesCompletos>(`/pacientes/${documento}/antecedentes`),
    enabled: !!documento,
  })
}

export function useGuardarAntecedentes(documento: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (respuestas: RespuestaInput[]) =>
      apiFetch<void>(`/pacientes/${documento}/antecedentes`, {
        method: 'PUT',
        body: JSON.stringify(respuestas),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['antecedentes', documento] }),
  })
}

// ── Admin hooks ───────────────────────────────────────────────────────────────

export function usePreguntas() {
  return useQuery({
    queryKey: ['antecedentes-preguntas'],
    queryFn: () => apiFetch<AntecedentePregunta[]>('/antecedentes/preguntas'),
  })
}

export function useCrearPregunta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<AntecedentePregunta, 'id' | 'esta_activo'>) =>
      apiFetch<AntecedentePregunta>('/antecedentes/preguntas', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['antecedentes-preguntas'] }),
  })
}

export function useActualizarPregunta(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<AntecedentePregunta, 'id' | 'esta_activo'>) =>
      apiFetch<AntecedentePregunta>(`/antecedentes/preguntas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['antecedentes-preguntas'] }),
  })
}

export function useTogglePregunta(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch(`/antecedentes/preguntas/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['antecedentes-preguntas'] }),
  })
}

export function useEliminarPregunta() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/antecedentes/preguntas/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['antecedentes-preguntas'] }),
  })
}
