import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export type Ocupacion = { codigo: string; nombre: string }

export function useBuscarOcupaciones(q: string) {
  return useQuery({
    queryKey: ['ocupaciones', q],
    queryFn: () => apiFetch<Ocupacion[]>(`/ocupaciones?q=${encodeURIComponent(q)}&limit=20`),
    enabled: q.length >= 2,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
}

export function useOcupacion(codigo: string) {
  return useQuery({
    queryKey: ['ocupacion', codigo],
    queryFn: () => apiFetch<Ocupacion>(`/ocupaciones/${encodeURIComponent(codigo)}`),
    enabled: codigo.length >= 4,
    staleTime: Infinity,
  })
}
