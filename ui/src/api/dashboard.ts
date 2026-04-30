import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export type InsumoAlerta = {
  id: string
  nombre: string
  stock_actual: number
  stock_minimo: number
  unidad: string
}

export type UltimoPaciente = {
  encuentro_id: string
  paciente_documento: string
  nombre_paciente: string
  fecha_atencion: string
  codigo_diagnostico_principal: string
  descripcion_diagnostico?: string
}

export type DashboardResumen = {
  encuentros_hoy: number
  pacientes_mes: number
  facturado_mes: number
  satisfaccion_promedio: number | null
  insumos_stock_bajo: InsumoAlerta[]
  ultimos_pacientes: UltimoPaciente[]
}

export function useDashboard() {
  return useQuery<DashboardResumen>({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch('/dashboard'),
    staleTime: 60 * 1000, // 1 minuto — es una pantalla de resumen, no necesita ser tiempo real
  })
}
