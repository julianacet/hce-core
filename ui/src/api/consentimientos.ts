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

export function useCrearPlantilla() {
  const qc = useQueryClient()
  return useMutation<PlantillaConsentimiento, Error, PlantillaInput>({
    mutationFn: (input) =>
      apiFetch('/consentimientos/plantillas', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plantillas-consentimiento'] }),
  })
}

export function useActualizarPlantilla(id: string) {
  const qc = useQueryClient()
  return useMutation<PlantillaConsentimiento, Error, PlantillaInput>({
    mutationFn: (input) =>
      apiFetch(`/consentimientos/plantillas/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plantillas-consentimiento'] }),
  })
}

export function useDesactivarPlantilla() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      apiFetch(`/consentimientos/plantillas/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plantillas-consentimiento'] }),
  })
}

// ── Por encuentro ─────────────────────────────────────────────────────────────

export function useConsentimientoEncuentro(pacienteId: string, encId: string) {
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
