import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { TARIFAS_KEY } from './keys'

export type Tarifa = {
  id: string
  codigo_cups: string
  descripcion_cups: string
  descripcion: string | null
  valor: number
  notas: string | null
  esta_activo: boolean
  fecha_creacion: string
  creado_por: string
}

export type TarifaInput = {
  codigo_cups: string
  descripcion: string | null
  valor: number
  notas: string | null
}

export function useTarifas(q?: string, inactivos?: boolean) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (inactivos) params.set('inactivos', '1')
  const qs = params.toString()
  return useQuery<Tarifa[]>({
    queryKey: [...TARIFAS_KEY, q, inactivos],
    queryFn: () => apiFetch(`/tarifas${qs ? '?' + qs : ''}`),
  })
}

export function useTarifaPorCups(codigo: string) {
  return useQuery<Tarifa>({
    queryKey: [...TARIFAS_KEY, 'por-cups', codigo],
    queryFn: () => apiFetch(`/tarifas/por-cups/${codigo}`),
    enabled: codigo.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCrearTarifa() {
  const qc = useQueryClient()
  return useMutation<Tarifa, Error, TarifaInput>({
    mutationFn: (input) =>
      apiFetch('/tarifas', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TARIFAS_KEY }),
  })
}

export function useActualizarTarifa(id: string) {
  const qc = useQueryClient()
  return useMutation<Tarifa, Error, TarifaInput>({
    mutationFn: (input) =>
      apiFetch(`/tarifas/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TARIFAS_KEY }),
  })
}

export function useToggleTarifa(id: string) {
  const qc = useQueryClient()
  return useMutation<{ esta_activo: boolean }, Error, void>({
    mutationFn: () => apiFetch(`/tarifas/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TARIFAS_KEY }),
  })
}

export function useEliminarTarifa() {
  const qc = useQueryClient()
  return useMutation<null, Error, string>({
    mutationFn: (id) => apiFetch(`/tarifas/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TARIFAS_KEY }),
  })
}
