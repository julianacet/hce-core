import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

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

const MED_KEY = ['medicamentos-predefinidos']

export function useMedicamentosPredefinidos(tipo: 'pos' | 'no_pos', q: string) {
  return useQuery({
    queryKey: [...MED_KEY, tipo, q],
    queryFn: () => {
      const params = new URLSearchParams({ tipo })
      if (q) params.set('q', q)
      return apiFetch<MedicamentoPredefinido[]>(`/medicamentos-predefinidos?${params}`)
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useMedicamentosAdmin(tipo: 'pos' | 'no_pos' | '', q: string) {
  return useQuery({
    queryKey: [...MED_KEY, 'admin', tipo, q],
    queryFn: () => {
      const params = new URLSearchParams({ todos: '1' })
      if (tipo) params.set('tipo', tipo)
      if (q) params.set('q', q)
      return apiFetch<MedicamentoPredefinido[]>(`/medicamentos-predefinidos?${params}`)
    },
  })
}

function patchMeds(
  qc: ReturnType<typeof useQueryClient>,
  updater: (old: MedicamentoPredefinido[]) => MedicamentoPredefinido[],
) {
  qc.setQueriesData<MedicamentoPredefinido[]>({ queryKey: MED_KEY }, (old) => (old ? updater(old) : old))
}

export function useCrearMedicamento() {
  const qc = useQueryClient()
  return useMutation<MedicamentoPredefinido, Error, MedicamentoInput>({
    mutationFn: (input) =>
      apiFetch('/medicamentos-predefinidos', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: MED_KEY }),
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
    onSuccess: (_, id) => patchMeds(qc, (old) => old.filter((m) => m.id !== id)),
  })
}
