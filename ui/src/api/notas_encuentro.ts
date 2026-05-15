import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { NOTAS_ENCUENTRO_KEY } from './keys'

export type NotaEncuentro = {
  id: string
  encuentro_id: string
  texto: string
  fecha_creacion: string
  creado_por: string
}

export function useNotasEncuentro(docId: string, encId: string) {
  return useQuery({
    queryKey: [...NOTAS_ENCUENTRO_KEY, encId],
    queryFn: () => apiFetch<NotaEncuentro[]>(`/pacientes/${docId}/encuentros/${encId}/notas`),
    enabled: !!docId && !!encId,
  })
}

export function useCrearNotaEncuentro(docId: string, encId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (texto: string) =>
      apiFetch<NotaEncuentro>(`/pacientes/${docId}/encuentros/${encId}/notas`, {
        method: 'POST',
        body: JSON.stringify({ texto }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...NOTAS_ENCUENTRO_KEY, encId] }),
  })
}
