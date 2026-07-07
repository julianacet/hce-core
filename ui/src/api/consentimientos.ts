import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { PLANTILLAS_CONSENTIMIENTO_KEY, CONSENTIMIENTO_KEY, CONSENTIMIENTOS_GENERADOS_KEY } from './keys'

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
  encuentro_id: string | null
  plantilla_id: string | null
  plantilla_nombre: string | null
  paciente_documento: string
  paciente_nombre: string
  tipo_documento: string
  contenido_renderizado: string
  firmado: boolean
  fecha_firma: string | null
  firmado_por: string | null
  fecha_generacion: string
  creado_por: string
}

export type ConsentimientoStandaloneInput = {
  plantilla_id: string
  paciente_documento: string
  paciente_nombre: string
  tipo_documento: string
  contenido_renderizado: string
}

// ── Plantillas (admin) ────────────────────────────────────────────────────────

export function usePlantillas() {
  return useQuery<PlantillaConsentimiento[]>({
    queryKey: PLANTILLAS_CONSENTIMIENTO_KEY,
    queryFn: () => apiFetch('/consentimientos/plantillas'),
  })
}


export function useCrearPlantilla() {
  const qc = useQueryClient()
  return useMutation<PlantillaConsentimiento, Error, PlantillaInput>({
    mutationFn: (input) =>
      apiFetch('/consentimientos/plantillas', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (nueva) => {
      qc.setQueryData<PlantillaConsentimiento[]>(PLANTILLAS_CONSENTIMIENTO_KEY, (old) => [...(old ?? []), nueva])
    },
  })
}

export function useActualizarPlantilla(id: string) {
  const qc = useQueryClient()
  return useMutation<PlantillaConsentimiento, Error, PlantillaInput>({
    mutationFn: (input) =>
      apiFetch(`/consentimientos/plantillas/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (actualizada) => {
      qc.setQueryData<PlantillaConsentimiento[]>(PLANTILLAS_CONSENTIMIENTO_KEY, (old) =>
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
      qc.setQueryData<PlantillaConsentimiento[]>(PLANTILLAS_CONSENTIMIENTO_KEY, (old) =>
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
      qc.setQueryData<PlantillaConsentimiento[]>(PLANTILLAS_CONSENTIMIENTO_KEY, (old) => old?.filter((p) => p.id !== id) ?? [])
    },
  })
}

// ── Consentimientos standalone ────────────────────────────────────────────────

export type ConsentimientosFiltros = {
  q?: string
  page?: number
  limit?: number
  orden?: string
  dir?: string
}

export function useConsentimientosGenerados(filtros: ConsentimientosFiltros = {}) {
  const params = new URLSearchParams()
  if (filtros.q) params.set('q', filtros.q)
  params.set('page', String(filtros.page ?? 1))
  params.set('limit', String(filtros.limit ?? 10))
  if (filtros.orden) params.set('orden', filtros.orden)
  if (filtros.dir) params.set('dir', filtros.dir)
  return useQuery<{ consentimientos: ConsentimientoGenerado[]; total: number }>({
    queryKey: [...CONSENTIMIENTOS_GENERADOS_KEY, filtros],
    queryFn: () => apiFetch(`/consentimientos/generados?${params.toString()}`),
  })
}

export function useGenerarConsentimiento() {
  const qc = useQueryClient()
  return useMutation<ConsentimientoGenerado, Error, ConsentimientoStandaloneInput>({
    mutationFn: (input) =>
      apiFetch('/consentimientos/generados', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.removeQueries({ queryKey: CONSENTIMIENTOS_GENERADOS_KEY }),
  })
}

export function useFirmarConsentimiento() {
  const qc = useQueryClient()
  return useMutation<ConsentimientoGenerado, Error, string>({
    mutationFn: (id) => apiFetch(`/consentimientos/generados/${id}/firmar`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONSENTIMIENTOS_GENERADOS_KEY }),
  })
}

// ── Por encuentro ─────────────────────────────────────────────────────────────

export function useConsentimientoEncuentro(pacienteId: string, encId: string, enabled = false) {
  return useQuery<ConsentimientoGenerado | null>({
    queryKey: [...CONSENTIMIENTO_KEY, encId],
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
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CONSENTIMIENTO_KEY, encId] }),
  })
}
