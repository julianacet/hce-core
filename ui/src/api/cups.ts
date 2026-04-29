import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export type CupsCodigo = {
  codigo: string
  descripcion: string
}

export function useCups(q: string) {
  return useQuery({
    queryKey: ['cups', q],
    queryFn: () => apiFetch<CupsCodigo[]>(`/cups?q=${encodeURIComponent(q)}&limit=20`),
    enabled: q.length >= 2,
    staleTime: 5 * 60 * 1000,
  })
}
