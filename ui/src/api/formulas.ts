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
  tipo: string
  observaciones?: string
  fecha_creacion: string
  creado_por: string
  medicamentos: MedicamentoGuardado[]
}

// UI shape of a medication as filled in the formula form (camelCase, matches Medicamento from FormulaPDF)
type MedicamentoUI = {
  nombre: string; concentracion: string; formaFarmaceutica: string
  dosis: string; frecuencia: string; duracion: string; cantidad: string; indicaciones: string
}

export async function crearFormulas(
  doc: string,
  encId: string,
  formulas: { pos: MedicamentoUI[]; no_pos: MedicamentoUI[] }
): Promise<void> {
  for (const tipo of ['pos', 'no_pos'] as const) {
    const meds = formulas[tipo].filter(m => m.nombre.trim())
    if (meds.length === 0) continue
    await apiFetch(`/pacientes/${doc}/encuentros/${encId}/formulas`, {
      method: 'POST',
      body: JSON.stringify({
        tipo,
        medicamentos: meds.map(m => ({
          nombre_medicamento: m.nombre,
          concentracion: m.concentracion || undefined,
          forma_farmaceutica: m.formaFarmaceutica || undefined,
          dosis: m.dosis,
          frecuencia: m.frecuencia,
          duracion_tratamiento: m.duracion,
          cantidad_dispensar: parseInt(m.cantidad) || undefined,
          indicaciones: m.indicaciones || undefined,
        })),
      }),
    })
  }
}

export function useFormulas(docId: string, encId: string) {
  return useQuery({
    queryKey: [...FORMULAS_KEY, docId, encId],
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
    onSuccess: () => qc.invalidateQueries({ queryKey: [...FORMULAS_KEY, docId, encId] }),
  })
}
