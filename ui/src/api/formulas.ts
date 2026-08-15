import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { FORMULAS_KEY } from './keys'

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
  estado: 'borrador' | 'finalizado'
  tipo: string
  observaciones?: string
  fecha_creacion: string
  creado_por: string
  medicamentos: MedicamentoGuardado[]
}

// Las fórmulas se guardan como borrador (autoguardado) mientras se diligencia
// la consulta; ver EncuentroForm.tsx. `estado` filtra la consulta: por
// defecto el backend solo devuelve 'finalizado' (historial); se pasa
// 'borrador' explícitamente para retomar un borrador en curso.
export function useFormulas(docId: string, encId: string, estado?: 'borrador' | 'finalizado') {
  return useQuery({
    queryKey: [...FORMULAS_KEY, docId, encId, estado ?? 'finalizado'],
    queryFn: () => apiFetch<FormulaGuardada[]>(
      `/pacientes/${docId}/encuentros/${encId}/formulas${estado ? `?estado=${estado}` : ''}`
    ),
    enabled: !!docId && !!encId,
  })
}

// Crea una fórmula y la finaliza de inmediato — usado por el flujo standalone
// de "nueva fórmula" sobre un encuentro ya existente (NuevaFormula.tsx), que
// no pasa por el ciclo de borrador de EncuentroForm.
export function useCrearFormula(docId: string, encId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: FormulaInput) => {
      const creada = await apiFetch<FormulaGuardada>(`/pacientes/${docId}/encuentros/${encId}/formulas`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return apiFetch<FormulaGuardada>(
        `/pacientes/${docId}/encuentros/${encId}/formulas/${creada.formula_id}/finalizar`,
        { method: 'PATCH' },
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...FORMULAS_KEY, docId, encId] }),
  })
}
