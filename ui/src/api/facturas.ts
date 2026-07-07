import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { FACTURAS_KEY } from './keys'

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
  fecha_creacion: string
  items: FacturaItemInput[]
}

export function useFacturas(q?: string) {
  return useQuery({
    queryKey: [...FACTURAS_KEY, q ?? ''],
    queryFn: () => apiFetch<Factura[]>(`/facturas${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export type FacturasFiltros = {
  q?: string
  estado?: string
  desde?: string
  hasta?: string
  page?: number
  limit?: number
  orden?: string
  dir?: string
}

export function useFacturasPaginadas(filtros: FacturasFiltros) {
  const params = new URLSearchParams()
  params.set('page', String(filtros.page ?? 1))
  params.set('limit', String(filtros.limit ?? 10))
  if (filtros.q) params.set('q', filtros.q)
  if (filtros.estado) params.set('estado', filtros.estado)
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.hasta) params.set('hasta', filtros.hasta)
  if (filtros.orden) params.set('orden', filtros.orden)
  if (filtros.dir) params.set('dir', filtros.dir)
  return useQuery({
    queryKey: [...FACTURAS_KEY, 'paginado', filtros],
    queryFn: () => apiFetch<{ facturas: (Factura & { paciente_nombre: string })[]; total: number }>(
      `/facturas?${params}`
    ),
  })
}

export async function exportarFacturas(filtros: Omit<FacturasFiltros, 'page' | 'limit'>) {
  const params = new URLSearchParams({ page: '1', limit: '1', export: '1' })
  if (filtros.q) params.set('q', filtros.q)
  if (filtros.estado) params.set('estado', filtros.estado)
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.hasta) params.set('hasta', filtros.hasta)
  if (filtros.orden) params.set('orden', filtros.orden)
  if (filtros.dir) params.set('dir', filtros.dir)
  return apiFetch<{ facturas: (Factura & { paciente_nombre: string })[]; total: number }>(
    `/facturas?${params}`
  )
}

export function useFactura(facturaId: string) {
  return useQuery({
    queryKey: [...FACTURAS_KEY, facturaId],
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
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTURAS_KEY }),
  })
}

export function useAnularFactura(facturaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<Factura>(`/facturas/${facturaId}/anular`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTURAS_KEY }),
  })
}

export type VinculacionPreviewFactura = {
  encuentro_id: string
  fecha_atencion: string
  motivo_consulta: string
  finalidad_nombre: string
} | null

export function useVinculacionPreviewFactura(pacienteDoc: string | null) {
  return useQuery({
    queryKey: ['vinculacion-preview-factura', pacienteDoc],
    queryFn: () => apiFetch<VinculacionPreviewFactura>(`/facturas/vinculacion-preview?paciente=${pacienteDoc}`),
    enabled: !!pacienteDoc,
    staleTime: 15_000,
  })
}
