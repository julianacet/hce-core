import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { INSUMOS_KEY, MOVIMIENTOS_KEY, DASHBOARD_KEY } from './keys'

export type Insumo = {
  id: string
  nombre: string
  descripcion: string | null
  unidad: string
  stock_actual: number
  stock_minimo: number
  esta_activo: boolean
  fecha_creacion: string
  creado_por: string
}

export type InsumoInput = {
  nombre: string
  descripcion?: string
  unidad: string
  stock_minimo: number
}

export type MovimientoInput = {
  tipo: 'entrada' | 'salida' | 'ajuste'
  cantidad: number
  notas?: string
}

export type Movimiento = {
  id: string
  insumo_id: string
  tipo: string
  cantidad: number
  stock_resultante: number
  notas: string | null
  fecha_movimiento: string
  creado_por: string
}

export function useInsumos(q?: string) {
  return useQuery<Insumo[]>({
    queryKey: [...INSUMOS_KEY, q ?? ''],
    queryFn: () => apiFetch(`/insumos${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useMovimientos(insumoId: string) {
  return useQuery<Movimiento[]>({
    queryKey: [...MOVIMIENTOS_KEY, insumoId],
    queryFn: () => apiFetch(`/insumos/${insumoId}/movimientos`),
    enabled: !!insumoId,
  })
}

export function useCrearInsumo() {
  const qc = useQueryClient()
  return useMutation<Insumo, Error, InsumoInput>({
    mutationFn: (input) =>
      apiFetch('/insumos', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSUMOS_KEY }),
  })
}

export function useActualizarInsumo(id: string) {
  const qc = useQueryClient()
  return useMutation<Insumo, Error, InsumoInput>({
    mutationFn: (input) =>
      apiFetch(`/insumos/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSUMOS_KEY }),
  })
}

export function useDesactivarInsumo() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/insumos/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSUMOS_KEY }),
  })
}

export function useRegistrarMovimiento(insumoId: string) {
  const qc = useQueryClient()
  return useMutation<Movimiento, Error, MovimientoInput>({
    mutationFn: (input) =>
      apiFetch(`/insumos/${insumoId}/movimientos`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INSUMOS_KEY })
      qc.invalidateQueries({ queryKey: [...MOVIMIENTOS_KEY, insumoId] })
      qc.invalidateQueries({ queryKey: DASHBOARD_KEY })
    },
  })
}
