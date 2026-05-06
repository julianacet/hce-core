import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type FacturaItem = {
  id: string
  codigo_cups: string
  descripcion: string
  valor_unitario: number
  cantidad: number
  subtotal: number
  orden: number
}

export type Factura = {
  id: string
  factura_id: string
  numero_version: number
  encuentro_id: string
  paciente_documento: string
  estado: 'borrador' | 'emitida' | 'pagada' | 'anulada'
  fecha_emision?: string
  subtotal: number
  total: number
  fecha_creacion: string
  creado_por: string
  items: FacturaItem[]
}

export type FacturaItemInput = {
  codigo_cups: string
  descripcion: string
  valor_unitario: number
  cantidad: number
}

export type FacturaInput = {
  items: FacturaItemInput[]
}

export function useFacturasEncuentro(documento: string, encuentroId: string) {
  return useQuery({
    queryKey: ['facturas', documento, encuentroId],
    queryFn: () => apiFetch<Factura[]>(`/pacientes/${documento}/encuentros/${encuentroId}/facturas`),
    enabled: !!documento && !!encuentroId,
  })
}

export function useFactura(documento: string, encuentroId: string, facturaId: string) {
  return useQuery({
    queryKey: ['facturas', documento, encuentroId, facturaId],
    queryFn: () => apiFetch<Factura>(`/pacientes/${documento}/encuentros/${encuentroId}/facturas/${facturaId}`),
    enabled: !!documento && !!encuentroId && !!facturaId,
  })
}

export function useCrearFactura(documento: string, encuentroId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FacturaInput) =>
      apiFetch<Factura>(`/pacientes/${documento}/encuentros/${encuentroId}/facturas`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas', documento, encuentroId] }),
  })
}

export function useCambiarEstadoFactura(documento: string, encuentroId: string, facturaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nuevoEstado: Factura['estado']) =>
      apiFetch<Factura>(
        `/pacientes/${documento}/encuentros/${encuentroId}/facturas/${facturaId}/estado`,
        { method: 'PATCH', body: JSON.stringify({ nuevo_estado: nuevoEstado }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas', documento, encuentroId, facturaId] })
      qc.invalidateQueries({ queryKey: ['facturas', documento, encuentroId] })
    },
  })
}
