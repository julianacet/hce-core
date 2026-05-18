import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

const KEY = ['examenes-predefinidos'] as const

export type ExamenPredefinido = {
  id: number
  nombre: string
  codigo_cups: string | null
  categoria: 'laboratorio' | 'imagen' | 'patologia' | 'otro'
  esta_activo: boolean
}

export type ExamenPredefinidoInput = {
  nombre: string
  codigo_cups: string | null
  categoria: string
}

export const CATEGORIAS_EXAMEN: Record<string, string> = {
  laboratorio: 'Laboratorio',
  imagen:      'Imágenes diagnósticas',
  patologia:   'Patología',
  otro:        'Otro',
}

export function useExamenesPredefinidos(q?: string, categoria?: string, todos?: boolean) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (categoria) params.set('categoria', categoria)
  if (todos) params.set('todos', '1')
  const qs = params.toString()
  return useQuery<ExamenPredefinido[]>({
    queryKey: [...KEY, q, categoria, todos],
    queryFn: () => apiFetch(`/examenes-predefinidos${qs ? '?' + qs : ''}`),
  })
}

export function useCrearExamen() {
  const qc = useQueryClient()
  return useMutation<ExamenPredefinido, Error, ExamenPredefinidoInput>({
    mutationFn: (input) => apiFetch('/examenes-predefinidos', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useActualizarExamen(id: number) {
  const qc = useQueryClient()
  return useMutation<ExamenPredefinido, Error, ExamenPredefinidoInput>({
    mutationFn: (input) => apiFetch(`/examenes-predefinidos/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useToggleExamen(id: number) {
  const qc = useQueryClient()
  return useMutation<{ esta_activo: boolean }, Error, void>({
    mutationFn: () => apiFetch(`/examenes-predefinidos/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useEliminarExamen() {
  const qc = useQueryClient()
  return useMutation<null, Error, number>({
    mutationFn: (id) => apiFetch(`/examenes-predefinidos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
