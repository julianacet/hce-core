import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type MedicamentoInput = {
  nombre_medicamento: string
  concentracion?: string
  forma_farmaceutica?: string
  dosis: string
  frecuencia: string
  duracion_tratamiento: string
  cantidad_dispensar?: number
  indicaciones?: string
}

export type FormulaInput = {
  tipo: 'pos' | 'no_pos'
  observaciones?: string
  medicamentos: MedicamentoInput[]
}

export type MedicamentoGuardado = {
  id: string
  formula_id: string
  nombre_medicamento: string
  concentracion?: string
  forma_farmaceutica?: string
  dosis: string
  frecuencia: string
  duracion_tratamiento: string
  cantidad_dispensar?: number
  indicaciones?: string
  orden: number
}

export type FormulaGuardada = {
  id: string
  formula_id: string
  numero_version: number
  tipo: string
  observaciones?: string
  fecha_creacion: string
  creado_por: string
  medicamentos: MedicamentoGuardado[]
}

export function useFormulas(docId: string, encId: string) {
  return useQuery({
    queryKey: ['formulas', docId, encId],
    queryFn: () => apiFetch<FormulaGuardada[]>(`/pacientes/${docId}/encuentros/${encId}/formulas`),
    enabled: !!docId && !!encId,
  })
}

export function useCrearFormula(docId: string, encId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FormulaInput) =>
      apiFetch<FormulaGuardada>(`/pacientes/${docId}/encuentros/${encId}/formulas`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formulas', docId, encId] }),
  })
}
