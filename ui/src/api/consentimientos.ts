import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type PlantillaConsentimiento = {
  id: string
  nombre: string
  contenido: string
  esta_activo: boolean
  fecha_creacion: string
  creado_por: string
}

export type PlantillaInput = {
  nombre: string
  contenido: string
}

export type ConsentimientoGenerado = {
  id: string
  encuentro_id: string
  plantilla_id: string | null
  paciente_documento: string
  contenido_renderizado: string
  fecha_generacion: string
  creado_por: string
}

// ── Plantillas (admin) ────────────────────────────────────────────────────────

export function usePlantillas() {
  return useQuery<PlantillaConsentimiento[]>({
    queryKey: ['plantillas-consentimiento'],
    queryFn: () => apiFetch('/consentimientos/plantillas'),
  })
}

const PLANTILLAS_KEY = ['plantillas-consentimiento']

export function useCrearPlantilla() {
  const qc = useQueryClient()
  return useMutation<PlantillaConsentimiento, Error, PlantillaInput>({
    mutationFn: (input) =>
      apiFetch('/consentimientos/plantillas', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (nueva) => {
      qc.setQueryData<PlantillaConsentimiento[]>(PLANTILLAS_KEY, (old) => [...(old ?? []), nueva])
    },
  })
}

export function useActualizarPlantilla(id: string) {
  const qc = useQueryClient()
  return useMutation<PlantillaConsentimiento, Error, PlantillaInput>({
    mutationFn: (input) =>
      apiFetch(`/consentimientos/plantillas/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (actualizada) => {
      qc.setQueryData<PlantillaConsentimiento[]>(PLANTILLAS_KEY, (old) =>
        old?.map((p) => (p.id === id ? actualizada : p)) ?? []
      )
    },
  })
}

export function useDesactivarPlantilla() {
  const qc = useQueryClient()
  return useMutation<{ esta_activo: boolean }, Error, string>({
    mutationFn: (id) =>
      apiFetch(`/consentimientos/plantillas/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: ({ esta_activo }, id) => {
      qc.setQueryData<PlantillaConsentimiento[]>(PLANTILLAS_KEY, (old) =>
        old?.map((p) => (p.id === id ? { ...p, esta_activo } : p)) ?? []
      )
    },
  })
}

export function useEliminarPlantilla() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/consentimientos/plantillas/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      qc.setQueryData<PlantillaConsentimiento[]>(PLANTILLAS_KEY, (old) => old?.filter((p) => p.id !== id) ?? [])
    },
  })
}

// ── Por encuentro ─────────────────────────────────────────────────────────────

export function useConsentimientoEncuentro(pacienteId: string, encId: string, enabled = false) {
  return useQuery<ConsentimientoGenerado | null>({
    queryKey: ['consentimiento', encId],
    queryFn: async () => {
      try {
        return await apiFetch<ConsentimientoGenerado>(
          `/pacientes/${pacienteId}/encuentros/${encId}/consentimiento`
        )
      } catch (e) {
        if ((e as Error).message === 'sin consentimiento generado') return null
        throw e
      }
    },
    enabled,
    retry: false,
  })
}

export function useRegistrarConsentimiento(pacienteId: string, encId: string) {
  const qc = useQueryClient()
  return useMutation<ConsentimientoGenerado, Error, { plantilla_id: string; contenido_renderizado: string }>({
    mutationFn: (input) =>
      apiFetch(`/pacientes/${pacienteId}/encuentros/${encId}/consentimiento`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consentimiento', encId] }),
  })
}
