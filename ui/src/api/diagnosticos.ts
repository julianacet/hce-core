import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export type DiagnosticoCIE10 = {
  codigo: string
  nombre: string
}

export function useBuscarDiagnosticos(q: string) {
  return useQuery({
    queryKey: ['diagnosticos', q],
    queryFn: () => apiFetch<DiagnosticoCIE10[]>(`/diagnosticos?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  })
}
