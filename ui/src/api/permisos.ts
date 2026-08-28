import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type MatrizPermisos = {
  roles: string[]
  recursos: string[]
  asignaciones: Record<string, string[]>
}

const PERMISOS_KEY = ['permisos']

export function usePermisos() {
  return useQuery<MatrizPermisos>({
    queryKey: PERMISOS_KEY,
    queryFn: () => apiFetch('/permisos'),
  })
}

type PermisoInput = { rol: string; recurso: string }

export function useOtorgarPermiso() {
  const qc = useQueryClient()
  return useMutation<PermisoInput, Error, PermisoInput>({
    mutationFn: ({ rol, recurso }) => apiFetch(`/permisos/${recurso}/${rol}`, { method: 'PUT' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISOS_KEY }),
  })
}

export function useRevocarPermiso() {
  const qc = useQueryClient()
  return useMutation<void, Error, PermisoInput>({
    mutationFn: ({ rol, recurso }) => apiFetch(`/permisos/${recurso}/${rol}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISOS_KEY }),
  })
}
