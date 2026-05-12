import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type TipoEventoAdverso = {
  id: string
  nombre: string
  descripcion: string | null
  requiere_reporte_invima: boolean
  esta_activo: boolean
  fecha_creacion: string
  creado_por: string
}

export type TipoInput = {
  nombre: string
  descripcion: string | null
  requiere_reporte_invima: boolean
}

export type FactoresContribuyentes = {
  humano: boolean
  entorno: boolean
  equipos: boolean
  organizacional: boolean
  paciente: boolean
  notas: string
}

export type EventoAdverso = {
  id: string
  numero: number
  tipo_id: string | null
  tipo_nombre: string | null
  fecha_evento: string
  paciente_documento: string | null
  diagnostico_activo: string | null
  clasificacion: 'incidente' | 'adverso_prevenible' | 'adverso_no_prevenible' | 'centinela'
  categoria_danio: 'sin_danio' | 'leve' | 'moderado' | 'grave' | 'muerte'
  se_informo_paciente: boolean | null
  descripcion: string
  como_se_detecto: string | null
  factores_contribuyentes: FactoresContribuyentes | null
  acciones_inmediatas: string | null
  requiere_causa_raiz: boolean
  analisis_causa_raiz: string | null
  acciones_mejora: string | null
  responsable_seguimiento: string | null
  fecha_limite_mejora: string | null
  estado: 'abierto' | 'en_seguimiento' | 'cerrado'
  fecha_cierre: string | null
  cerrado_por: string | null
  creado_por: string
  fecha_creacion: string
}

export type EventoAdversoInput = {
  tipo_id: string | null
  fecha_evento: string
  paciente_documento: string | null
  diagnostico_activo: string | null
  clasificacion: string
  categoria_danio: string
  se_informo_paciente: boolean | null
  descripcion: string
  como_se_detecto: string | null
  factores_contribuyentes: FactoresContribuyentes | null
  acciones_inmediatas: string | null
  requiere_causa_raiz: boolean
}

export type SeguimientoInput = {
  analisis_causa_raiz: string | null
  acciones_mejora: string | null
  responsable_seguimiento: string | null
  fecha_limite_mejora: string | null
  estado: string
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export function useTiposEventoAdverso(todos = false) {
  return useQuery<TipoEventoAdverso[]>({
    queryKey: ['tipos-ea', todos],
    queryFn: () => apiFetch(`/tipos-evento-adverso${todos ? '?todos=1' : ''}`),
  })
}

function patchTipos(qc: ReturnType<typeof useQueryClient>, updater: (old: TipoEventoAdverso[]) => TipoEventoAdverso[]) {
  qc.setQueriesData<TipoEventoAdverso[]>({ queryKey: ['tipos-ea'] }, (old) => old ? updater(old) : old)
}

export function useCrearTipo() {
  const qc = useQueryClient()
  return useMutation<TipoEventoAdverso, Error, TipoInput>({
    mutationFn: (input) =>
      apiFetch('/tipos-evento-adverso', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (nuevo) => patchTipos(qc, (old) => [...old, nuevo]),
  })
}

export function useActualizarTipo(id: string) {
  const qc = useQueryClient()
  return useMutation<TipoEventoAdverso, Error, TipoInput>({
    mutationFn: (input) =>
      apiFetch(`/tipos-evento-adverso/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (actualizado) => patchTipos(qc, (old) => old.map((t) => (t.id === id ? actualizado : t))),
  })
}

export function useToggleTipo(id: string) {
  const qc = useQueryClient()
  return useMutation<{ esta_activo: boolean }, Error, void>({
    mutationFn: () =>
      apiFetch(`/tipos-evento-adverso/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: ({ esta_activo }) =>
      patchTipos(qc, (old) => old.map((t) => (t.id === id ? { ...t, esta_activo } : t))),
  })
}

export function useEliminarTipo() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/tipos-evento-adverso/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => patchTipos(qc, (old) => old.filter((t) => t.id !== id)),
  })
}

// ── Eventos ───────────────────────────────────────────────────────────────────

export function useEventosAdversos(filters?: { estado?: string; tipo_id?: string }) {
  const params = new URLSearchParams()
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.tipo_id) params.set('tipo_id', filters.tipo_id)
  const qs = params.toString()
  return useQuery<EventoAdverso[]>({
    queryKey: ['eventos-adversos', filters],
    queryFn: () => apiFetch(`/eventos-adversos${qs ? '?' + qs : ''}`),
  })
}

export function useEventoAdverso(id: string) {
  return useQuery<EventoAdverso>({
    queryKey: ['eventos-adversos', id],
    queryFn: () => apiFetch(`/eventos-adversos/${id}`),
    enabled: !!id,
  })
}

function patchEventos(qc: ReturnType<typeof useQueryClient>, updater: (old: EventoAdverso[]) => EventoAdverso[]) {
  qc.setQueriesData<EventoAdverso[]>({ queryKey: ['eventos-adversos'] }, (old) => old ? updater(old) : old)
}

export function useCrearEventoAdverso() {
  const qc = useQueryClient()
  return useMutation<EventoAdverso, Error, EventoAdversoInput>({
    mutationFn: (input) =>
      apiFetch('/eventos-adversos', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (nuevo) => patchEventos(qc, (old) => [nuevo, ...old]),
  })
}

export function useActualizarEventoAdverso(id: string) {
  const qc = useQueryClient()
  return useMutation<EventoAdverso, Error, EventoAdversoInput>({
    mutationFn: (input) =>
      apiFetch(`/eventos-adversos/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (actualizado) => patchEventos(qc, (old) => old.map((e) => (e.id === id ? actualizado : e))),
  })
}

export function useEliminarEventoAdverso() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/eventos-adversos/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => patchEventos(qc, (old) => old.filter((e) => e.id !== id)),
  })
}

export function useActualizarSeguimiento(id: string) {
  const qc = useQueryClient()
  return useMutation<EventoAdverso, Error, SeguimientoInput>({
    mutationFn: (input) =>
      apiFetch(`/eventos-adversos/${id}/seguimiento`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (actualizado) => patchEventos(qc, (old) => old.map((e) => (e.id === id ? actualizado : e))),
  })
}
