import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type Paciente = {
  id: string
  numero_documento: string
  tipo_documento: string
  nombre_primero: string
  nombre_segundo?: string
  apellido_primero: string
  apellido_segundo?: string
  fecha_nacimiento: string
  genero: string
  estado_civil?: string
  ocupacion?: string
  direccion?: string
  nombre_responsable?: string
  telefono_responsable?: string
  parentesco_responsable?: string
  codigo_pais_origen: string
  codigo_municipio_residencia: string
  zona_residencia: string
  tipo_usuario: string
  codigo_etnia: string
  codigo_discapacidad: string
  codigo_eps?: string
  telefono?: string
  correo_electronico?: string
  politica_datos_aceptada: boolean
  numero_version: number
  fecha_creacion: string
  creado_por: string
  edad: number
  // Computed labels returned by the API (codes are kept for form values)
  genero_nombre: string
  estado_civil_nombre?: string
  tipo_usuario_nombre: string
  zona_residencia_nombre: string
  etnia_nombre: string
  discapacidad_nombre: string
  ultima_atencion: string | null
}

export type PacienteInput = Omit<Paciente,
  'id' | 'numero_version' | 'es_ultima_version' | 'esta_activo' | 'fecha_creacion' | 'creado_por' | 'edad' |
  'genero_nombre' | 'estado_civil_nombre' | 'tipo_usuario_nombre' | 'zona_residencia_nombre' | 'etnia_nombre' | 'discapacidad_nombre' |
  'ultima_atencion'
>

export type PacientesPaginados = {
  pacientes: Paciente[]
  total: number
}

type PaginadosParams = {
  q: string
  page: number
  limit: number
  orden: string
  dir: 'asc' | 'desc'
  tipo_usuario: string
  genero: string
  zona_residencia: string
  eps: string
  telefono: string
  min_atencion: string
  max_atencion: string
}

export function usePacientesPaginados(params: PaginadosParams) {
  return useQuery({
    queryKey: ['pacientes-paginados', params],
    queryFn: () => {
      const p = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        orden: params.orden,
        dir: params.dir,
      })
      if (params.q) p.set('q', params.q)
      if (params.tipo_usuario) p.set('tipo_usuario', params.tipo_usuario)
      if (params.genero) p.set('genero', params.genero)
      if (params.zona_residencia) p.set('zona_residencia', params.zona_residencia)
      if (params.eps) p.set('eps', params.eps)
      if (params.telefono) p.set('telefono', params.telefono)
      if (params.min_atencion) p.set('min_atencion', params.min_atencion)
      if (params.max_atencion) p.set('max_atencion', params.max_atencion)
      return apiFetch<PacientesPaginados>(`/pacientes?${p}`)
    },
    placeholderData: (prev) => prev,
  })
}

export function usePacientes(q?: string) {
  return useQuery({
    queryKey: ['pacientes', q],
    queryFn: () => {
      const params = q ? `?q=${encodeURIComponent(q)}` : ''
      return apiFetch<Paciente[]>(`/pacientes${params}`)
    },
  })
}

export function usePaciente(documento: string) {
  return useQuery({
    queryKey: ['pacientes', documento],
    queryFn: () => apiFetch<Paciente>(`/pacientes/${documento}`),
    enabled: !!documento,
  })
}

export function useCrearPaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PacienteInput) =>
      apiFetch<Paciente>('/pacientes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pacientes'] }),
  })
}

export function useActualizarPaciente(documento: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PacienteInput>) =>
      apiFetch<Paciente>(`/pacientes/${documento}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pacientes'] }),
  })
}

type ExportFiltros = Omit<PaginadosParams, 'page' | 'limit'>

export function exportarPacientes(filtros: ExportFiltros) {
  const p = new URLSearchParams({ export: '1', orden: filtros.orden, dir: filtros.dir })
  if (filtros.q) p.set('q', filtros.q)
  if (filtros.tipo_usuario) p.set('tipo_usuario', filtros.tipo_usuario)
  if (filtros.genero) p.set('genero', filtros.genero)
  if (filtros.zona_residencia) p.set('zona_residencia', filtros.zona_residencia)
  if (filtros.eps) p.set('eps', filtros.eps)
  if (filtros.telefono) p.set('telefono', filtros.telefono)
  if (filtros.min_atencion) p.set('min_atencion', filtros.min_atencion)
  if (filtros.max_atencion) p.set('max_atencion', filtros.max_atencion)
  return apiFetch<PacientesPaginados>(`/pacientes?${p}`)
}
