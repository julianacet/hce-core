import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

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
    queryKey: ['insumos', q ?? ''],
    queryFn: () => apiFetch(`/insumos${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })
}

export function useMovimientos(insumoId: string) {
  return useQuery<Movimiento[]>({
    queryKey: ['movimientos', insumoId],
    queryFn: () => apiFetch(`/insumos/${insumoId}/movimientos`),
    enabled: !!insumoId,
  })
}

export function useCrearInsumo() {
  const qc = useQueryClient()
  return useMutation<Insumo, Error, InsumoInput>({
    mutationFn: (input) =>
      apiFetch('/insumos', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insumos'] }),
  })
}

export function useActualizarInsumo(id: string) {
  const qc = useQueryClient()
  return useMutation<Insumo, Error, InsumoInput>({
    mutationFn: (input) =>
      apiFetch(`/insumos/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insumos'] }),
  })
}

export function useDesactivarInsumo() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/insumos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insumos'] }),
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
      qc.invalidateQueries({ queryKey: ['insumos'] })
      qc.invalidateQueries({ queryKey: ['movimientos', insumoId] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
