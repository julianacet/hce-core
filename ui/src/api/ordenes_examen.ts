import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { ORDENES_EXAMEN_KEY } from './keys'

export type OrdenExamenItem = {
  id: string
  orden_id: string
  codigo_cups: string | null
  descripcion: string
  indicaciones: string | null
  posicion: number
}

export type OrdenExamen = {
  id: string
  encuentro_id: string
  indicaciones_generales: string | null
  fecha_creacion: string
  creado_por: string
  items: OrdenExamenItem[]
}

export type OrdenExamenItemInput = {
  codigo_cups: string | null
  descripcion: string
  indicaciones: string | null
}

export type OrdenExamenInput = {
  indicaciones_generales: string | null
  items: OrdenExamenItemInput[]
}

export function useOrdenesExamen(docId: string, encId: string) {
  return useQuery<OrdenExamen[]>({
    queryKey: [...ORDENES_EXAMEN_KEY, docId, encId],
    queryFn: () => apiFetch(`/pacientes/${docId}/encuentros/${encId}/ordenes`),
    enabled: !!docId && !!encId,
  })
}

export async function crearOrdenExamen(
  doc: string,
  encId: string,
  input: OrdenExamenInput,
): Promise<void> {
  if (input.items.length === 0) return
  await apiFetch(`/pacientes/${doc}/encuentros/${encId}/ordenes`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function useCrearOrdenExamen(docId: string, encId: string) {
  const qc = useQueryClient()
  return useMutation<OrdenExamen, Error, OrdenExamenInput>({
    mutationFn: (input) =>
      apiFetch(`/pacientes/${docId}/encuentros/${encId}/ordenes`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...ORDENES_EXAMEN_KEY, docId, encId] }),
  })
}
