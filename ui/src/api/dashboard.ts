import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export type InsumoAlerta = {
  id: string
  nombre: string
  stock_actual: number
  stock_minimo: number
  unidad: string
}

export type InsumoProximoVencer = {
  id: string
  nombre: string
  fecha_vencimiento: string
  dias_restantes: number
}

export type UltimoPaciente = {
  encuentro_id: string
  paciente_documento: string
  nombre_paciente: string
  fecha_atencion: string
  codigo_diagnostico_principal: string
  descripcion_diagnostico?: string
}

export type CitaHoy = {
  id: string
  hora_inicio: string
  paciente_nombre: string
  paciente_documento: string | null
  estado: string
  motivo: string | null
}

export type ConsultaPorDia = {
  fecha: string
  total: number
}

export type TopDiagnostico = {
  codigo: string
  descripcion: string
  total: number
}

export type DashboardResumen = {
  encuentros_hoy: number
  pacientes_mes: number
  facturado_mes: number
  satisfaccion_promedio: number | null
  citas_hoy: CitaHoy[]
  consultas_por_dia: ConsultaPorDia[]
  top_diagnosticos: TopDiagnostico[]
  insumos_stock_bajo: InsumoAlerta[]
  insumos_proximos_vencer: InsumoProximoVencer[]
  ultimos_pacientes: UltimoPaciente[]
}

export function useDashboard() {
  return useQuery<DashboardResumen>({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch('/dashboard'),
    staleTime: 60 * 1000,
  })
}
