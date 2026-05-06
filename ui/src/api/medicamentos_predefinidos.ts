import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export type MedicamentoPredefinido = {
  id: string
  codigo: string | null
  nombre: string
  concentracion: string | null
  forma_farmaceutica: string | null
  tipo: 'pos' | 'no_pos'
}

export function useMedicamentosPredefinidos(tipo: 'pos' | 'no_pos', q: string) {
  return useQuery({
    queryKey: ['medicamentos-predefinidos', tipo, q],
    queryFn: () => {
      const params = new URLSearchParams({ tipo })
      if (q) params.set('q', q)
      return apiFetch<MedicamentoPredefinido[]>(`/medicamentos-predefinidos?${params}`)
    },
    staleTime: 5 * 60 * 1000,
  })
}
