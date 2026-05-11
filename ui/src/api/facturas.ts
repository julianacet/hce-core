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
  paciente_documento: string
  paciente_nombre?: string
  estado: 'activa' | 'anulada'
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
  paciente_documento: string
  items: FacturaItemInput[]
}

export function useFacturas(q?: string) {
  return useQuery({
    queryKey: ['facturas', q ?? ''],
    queryFn: () => apiFetch<Factura[]>(`/facturas${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useFactura(facturaId: string) {
  return useQuery({
    queryKey: ['facturas', facturaId],
    queryFn: () => apiFetch<Factura>(`/facturas/${facturaId}`),
    enabled: !!facturaId,
  })
}

export function useCrearFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FacturaInput) =>
      apiFetch<Factura>('/facturas', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }),
  })
}

export function useAnularFactura(facturaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<Factura>(`/facturas/${facturaId}/anular`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }),
  })
}
