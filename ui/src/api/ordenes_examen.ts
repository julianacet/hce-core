import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import { ORDENES_EXAMEN_KEY } from './keys'

export type OrdenExamenItem = {
  id: string
  orden_id: string
  codigo_cups: string | null
  descripcion: string
  indicaciones: string | null
  posicion: number
}

export type OrdenExamen = {
  id: string
  encuentro_id: string
  estado: 'borrador' | 'finalizado'
  indicaciones_generales: string | null
  fecha_creacion: string
  creado_por: string
  items: OrdenExamenItem[]
}

export type OrdenExamenItemInput = {
  codigo_cups: string | null
  descripcion: string
  indicaciones: string | null
}

export type OrdenExamenInput = {
  indicaciones_generales: string | null
  items: OrdenExamenItemInput[]
}

// Las órdenes se guardan como borrador (autoguardado) mientras se diligencia
// la consulta; ver EncuentroForm.tsx. `estado` filtra la consulta: por
// defecto el backend solo devuelve 'finalizado' (historial); se pasa
// 'borrador' explícitamente para retomar un borrador en curso.
export function useOrdenesExamen(docId: string, encId: string, estado?: 'borrador' | 'finalizado') {
  return useQuery<OrdenExamen[]>({
    queryKey: [...ORDENES_EXAMEN_KEY, docId, encId, estado ?? 'finalizado'],
    queryFn: () => apiFetch(
      `/pacientes/${docId}/encuentros/${encId}/ordenes${estado ? `?estado=${estado}` : ''}`
    ),
    enabled: !!docId && !!encId,
  })
}
