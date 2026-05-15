import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import { PROVEEDORES_KEY } from './keys'

export type Proveedor = {
  id: string
  razon_social: string
  nit: string | null
  tipo: string
  contacto_nombre: string | null
  contacto_cargo: string | null
  telefono: string | null
  telefono_alt: string | null
  correo: string | null
  direccion: string | null
  ciudad: string | null
  sitio_web: string | null
  descripcion_servicios: string | null
  condiciones_pago: string | null
  notas: string | null
  esta_activo: boolean
  fecha_creacion: string
  creado_por: string
}

export type ProveedorInput = Omit<Proveedor, 'id' | 'esta_activo' | 'fecha_creacion' | 'creado_por'>

export const TIPOS_PROVEEDOR: Record<string, string> = {
  insumos_medicos:    'Insumos médicos',
  medicamentos:       'Medicamentos / farmacéuticos',
  equipos_medicos:    'Equipos médicos',
  laboratorio:        'Laboratorio clínico',
  mantenimiento:      'Mantenimiento y reparación',
  servicios_generales:'Servicios generales',
  otro:               'Otro',
}

export function useProveedores(q?: string, tipo?: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (tipo) params.set('tipo', tipo)
  const qs = params.toString()
  return useQuery<Proveedor[]>({
    queryKey: [...PROVEEDORES_KEY, q, tipo],
    queryFn: () => apiFetch(`/proveedores${qs ? '?' + qs : ''}`),
  })
}

export function useCrearProveedor() {
  const qc = useQueryClient()
  return useMutation<Proveedor, Error, ProveedorInput>({
    mutationFn: (input) =>
      apiFetch('/proveedores', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROVEEDORES_KEY }),
  })
}

export function useActualizarProveedor(id: string) {
  const qc = useQueryClient()
  return useMutation<Proveedor, Error, ProveedorInput>({
    mutationFn: (input) =>
      apiFetch(`/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROVEEDORES_KEY }),
  })
}

export function useToggleProveedor(id: string) {
  const qc = useQueryClient()
  return useMutation<{ esta_activo: boolean }, Error, void>({
    mutationFn: () => apiFetch(`/proveedores/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROVEEDORES_KEY }),
  })
}
