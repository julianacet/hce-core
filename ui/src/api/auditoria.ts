import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export type LogAuditoria = {
  id: number
  nombre_tabla: string
  registro_id: string
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  datos_anteriores?: string
  datos_nuevos?: string
  usuario_id?: string
  fecha_cambio: string
}

export function useAuditoria(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['auditoria', limit, offset],
    queryFn: () => apiFetch<LogAuditoria[]>(`/auditoria?limit=${limit}&offset=${offset}`),
  })
}

export function useAuditoriaPaciente(documento: string) {
  return useQuery({
    queryKey: ['auditoria', 'paciente', documento],
    queryFn: () => apiFetch<LogAuditoria[]>(`/auditoria/paciente/${documento}`),
    enabled: !!documento,
  })
}

export function useAuditoriaEncuentro(encuentroId: string) {
  return useQuery({
    queryKey: ['auditoria', 'encuentro', encuentroId],
    queryFn: () => apiFetch<LogAuditoria[]>(`/auditoria/encuentro/${encuentroId}`),
    enabled: !!encuentroId,
  })
}
