import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { ENCUESTAS_KEY, ENCUESTAS_RESUMEN_KEY } from './keys'

export type EncuestaInput = {
  fecha_atencion: string        // YYYY-MM-DD, ingresada manualmente
  paciente_documento?: string
  facilidad_cita: number
  tiempo_espera: number
  calidad_atencion: number
  comunicacion_medico: number
  claridad_informacion: number
  comodidad_instalaciones: number
  satisfaccion_general: number
  recomendaria: boolean
  comentarios?: string
}

export type Encuesta = {
  id: string
  fecha_atencion: string
  paciente_documento: string | null
  facilidad_cita: number
  tiempo_espera: number
  calidad_atencion: number
  comunicacion_medico: number
  claridad_informacion: number
  comodidad_instalaciones: number
  satisfaccion_general: number
  recomendaria: boolean
  comentarios: string | null
  fecha_registro: string
  registrado_por: string
}

export type EncuestaResumen = {
  total: number
  facilidad_cita: number
  tiempo_espera: number
  calidad_atencion: number
  comunicacion_medico: number
  claridad_informacion: number
  comodidad_instalaciones: number
  satisfaccion_general: number
  porcentaje_nps: number
}

export function useEncuestas() {
  return useQuery<Encuesta[]>({
    queryKey: ENCUESTAS_KEY,
    queryFn: () => apiFetch('/encuestas'),
  })
}

export function useEncuestaResumen() {
  return useQuery<EncuestaResumen>({
    queryKey: ENCUESTAS_RESUMEN_KEY,
    queryFn: () => apiFetch('/encuestas/resumen'),
  })
}

export function useCrearEncuesta() {
  const qc = useQueryClient()
  return useMutation<Encuesta, Error, EncuestaInput>({
    mutationFn: (input) =>
      apiFetch('/encuestas', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENCUESTAS_KEY })
      qc.invalidateQueries({ queryKey: ENCUESTAS_RESUMEN_KEY })
    },
  })
}
