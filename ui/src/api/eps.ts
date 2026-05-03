import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export type RegimenSalud = { codigo: string; nombre: string }
export type EpsEntidad = { codigo: string; nombre: string; regimen: string }

export function useRegimenes() {
  return useQuery({
    queryKey: ['eps-regimenes'],
    queryFn: () => apiFetch<RegimenSalud[]>('/eps/regimenes'),
    staleTime: Infinity,
  })
}

export function useEps(regimen: string) {
  return useQuery({
    queryKey: ['eps', regimen],
    queryFn: () => apiFetch<EpsEntidad[]>(`/eps?regimen=${regimen}`),
    enabled: regimen.length > 0,
    staleTime: Infinity,
  })
}

export function useEpsInfo(codigo: string) {
  return useQuery({
    queryKey: ['eps-info', codigo],
    queryFn: () => apiFetch<EpsEntidad>(`/eps/${encodeURIComponent(codigo)}`),
    enabled: codigo.length >= 3,
    staleTime: Infinity,
  })
}
