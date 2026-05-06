import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

// ── Por factura ───────────────────────────────────────────────────────────────

export type RipsInput = {
  nit: string
  codPrestador: string
  tipoDiagnosticoPrincipal: string
}

export type RipsGenerado = {
  id: string
  datos_json: unknown
  estado: string
  creado_por: string
  fecha_generacion: string
}

export function useRips(pacienteId: string, encId: string, facturaId: string) {
  return useQuery<RipsGenerado | null>({
    queryKey: ['rips', pacienteId, encId, facturaId],
    queryFn: async () => {
      try {
        return await apiFetch<RipsGenerado>(
          `/pacientes/${pacienteId}/encuentros/${encId}/facturas/${facturaId}/rips`
        )
      } catch (e) {
        if ((e as Error).message === 'no hay RIPS generado para esta factura') return null
        throw e
      }
    },
    retry: false,
  })
}

export function useGenerarRips(pacienteId: string, encId: string, facturaId: string) {
  const qc = useQueryClient()
  return useMutation<RipsGenerado, Error, RipsInput>({
    mutationFn: (input) =>
      apiFetch(`/pacientes/${pacienteId}/encuentros/${encId}/facturas/${facturaId}/rips`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rips', pacienteId, encId, facturaId] })
    },
  })
}

// ── Mensual (lote sin FEV) ────────────────────────────────────────────────────

export type RipsMensualResumen = {
  pacientes: number
  encuentros: number
  con_factura: number
  sin_factura: number
}

export type RipsMensualInput = {
  anio: number
  mes: number
  nit: string
  codPrestador: string
  tipoDiagnosticoPrincipal: string
}

export type RipsLoteItem = {
  id: string
  periodo: string
  estado: string
  creado_por: string
  fecha_generacion: string
}

export function useRipsMensualResumen(anio: number, mes: number) {
  return useQuery<RipsMensualResumen>({
    queryKey: ['rips-resumen', anio, mes],
    queryFn: () => apiFetch(`/rips/resumen?anio=${anio}&mes=${mes}`),
    enabled: anio > 0 && mes > 0,
  })
}

export function useRipsHistorial() {
  return useQuery<RipsLoteItem[]>({
    queryKey: ['rips-historial'],
    queryFn: () => apiFetch('/rips/historial'),
  })
}

export function useGenerarRipsMensual() {
  const qc = useQueryClient()
  return useMutation<RipsGenerado, Error, RipsMensualInput>({
    mutationFn: (input) =>
      apiFetch('/rips', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rips-historial'] })
    },
  })
}
