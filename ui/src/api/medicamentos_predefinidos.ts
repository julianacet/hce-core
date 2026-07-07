import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { MEDICAMENTOS_KEY } from './keys'

export type MedicamentoPredefinido = {
  id: string
  codigo: string | null
  nombre: string
  concentracion: string | null
  forma_farmaceutica: string | null
  tipo: 'pos' | 'no_pos'
  esta_activo: boolean
}

export type MedicamentoInput = {
  codigo: string | null
  nombre: string
  concentracion: string | null
  forma_farmaceutica: string | null
  tipo: 'pos' | 'no_pos'
}


export function useMedicamentosPredefinidos(tipo: 'pos' | 'no_pos', q: string) {
  return useQuery({
    queryKey: [...MEDICAMENTOS_KEY, tipo, q],
    queryFn: () => {
      const params = new URLSearchParams({ tipo })
      if (q) params.set('q', q)
      return apiFetch<MedicamentoPredefinido[]>(`/medicamentos-predefinidos?${params}`)
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useMedicamentosAdmin(tipo: 'pos' | 'no_pos' | '', q: string, page: number, limit: number) {
  return useQuery({
    queryKey: [...MEDICAMENTOS_KEY, 'admin', tipo, q, page, limit],
    queryFn: () => {
      const params = new URLSearchParams({ todos: '1', page: String(page), limit: String(limit) })
      if (tipo) params.set('tipo', tipo)
      if (q) params.set('q', q)
      return apiFetch<{ medicamentos: MedicamentoPredefinido[]; total: number }>(
        `/medicamentos-predefinidos?${params}`
      )
    },
  })
}

type MedicamentosAdminPage = { medicamentos: MedicamentoPredefinido[]; total: number }

function patchMeds(
  qc: ReturnType<typeof useQueryClient>,
  updater: (old: MedicamentoPredefinido[]) => MedicamentoPredefinido[],
  totalDelta = 0,
) {
  qc.setQueriesData<MedicamentoPredefinido[] | MedicamentosAdminPage>({ queryKey: MEDICAMENTOS_KEY }, (old) => {
    if (!old) return old
    if (Array.isArray(old)) return updater(old)
    return { medicamentos: updater(old.medicamentos), total: old.total + totalDelta }
  })
}

export function useCrearMedicamento() {
  const qc = useQueryClient()
  return useMutation<MedicamentoPredefinido, Error, MedicamentoInput>({
    mutationFn: (input) =>
      apiFetch('/medicamentos-predefinidos', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDICAMENTOS_KEY }),
  })
}

export function useActualizarMedicamento(id: string) {
  const qc = useQueryClient()
  return useMutation<MedicamentoPredefinido, Error, MedicamentoInput>({
    mutationFn: (input) =>
      apiFetch(`/medicamentos-predefinidos/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (med) => patchMeds(qc, (old) => old.map((m) => (m.id === id ? med : m))),
  })
}

export function useToggleMedicamento(id: string) {
  const qc = useQueryClient()
  return useMutation<{ esta_activo: boolean }, Error, void>({
    mutationFn: () => apiFetch(`/medicamentos-predefinidos/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: ({ esta_activo }) =>
      patchMeds(qc, (old) => old.map((m) => (m.id === id ? { ...m, esta_activo } : m))),
  })
}

export function useEliminarMedicamento() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/medicamentos-predefinidos/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => patchMeds(qc, (old) => old.filter((m) => m.id !== id), -1),
  })
}
