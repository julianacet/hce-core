import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type CampoClinico = {
  id: string
  seccion: 'signos_vitales' | 'examen_fisico' | 'revision_sistemas'
  nombre: string
  tipo: 'numero' | 'normal_notas' | 'texto' | 'opciones'
  unidad?: string
  clave: string
  orden: number
  esta_activo: boolean
  descripcion?: string
  opciones?: string[]
}

export type CampoClinicoInput = Omit<CampoClinico, 'id' | 'esta_activo'>

export function useCamposClinicosActivos() {
  return useQuery({
    queryKey: ['campos-clinicos'],
    queryFn: () => apiFetch<CampoClinico[]>('/campos-clinicos'),
    select: (data) => data.filter((c) => c.esta_activo),
    staleTime: 1000 * 60 * 10,
  })
}

export function useTodosCamposClinicos() {
  return useQuery({
    queryKey: ['campos-clinicos'],
    queryFn: () => apiFetch<CampoClinico[]>('/campos-clinicos'),
  })
}

const CC_KEY = ['campos-clinicos']

export function useCrearCampoClinico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CampoClinicoInput) =>
      apiFetch<CampoClinico>('/campos-clinicos', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (nuevo) => {
      qc.setQueryData<CampoClinico[]>(CC_KEY, (old) => [...(old ?? []), nuevo])
    },
  })
}

export function useActualizarCampoClinico(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CampoClinicoInput>) =>
      apiFetch<CampoClinico>(`/campos-clinicos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (actualizado) => {
      qc.setQueryData<CampoClinico[]>(CC_KEY, (old) =>
        old?.map((c) => (c.id === id ? actualizado : c)) ?? []
      )
    },
  })
}

export function useToggleCampoClinico(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<CampoClinico>(`/campos-clinicos/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: (actualizado) => {
      qc.setQueryData<CampoClinico[]>(CC_KEY, (old) =>
        old?.map((c) => (c.id === id ? actualizado : c)) ?? []
      )
    },
  })
}

export function useEliminarCampoClinico() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/campos-clinicos/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      qc.setQueryData<CampoClinico[]>(CC_KEY, (old) => old?.filter((c) => c.id !== id) ?? [])
    },
  })
}
