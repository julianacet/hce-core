import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

// ── Mensual (lote sin FEV) ────────────────────────────────────────────────────

export type RipsMensualResumen = {
  pacientes: number
  encuentros: number
}

export type RipsMensualInput = {
  anio: number
  mes: number
  nit: string
  codPrestador: string
  tipoDiagnosticoPrincipal: string
}

export type RipsGenerado = {
  id: string
  periodo: string
  estado: string
  creado_por: string
  fecha_generacion: string
  datos_json: unknown
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
