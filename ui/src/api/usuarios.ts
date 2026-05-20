import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type RolUsuario = 'admin' | 'medico' | 'recepcionista' | 'enfermeria' | 'facturador'

export type Usuario = {
  id: string
  nombre_usuario: string
  nombre_completo: string
  rol: RolUsuario
  esta_activo: boolean
  fecha_creacion: string
}

export type UsuarioInput = {
  nombre_usuario: string
  nombre_completo: string
  rol: RolUsuario
  contrasena: string // vacío = no cambiar
}

export function useUsuarios() {
  return useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => apiFetch('/usuarios'),
  })
}

const USUARIOS_KEY = ['usuarios']

export function useCrearUsuario() {
  const qc = useQueryClient()
  return useMutation<Usuario, Error, UsuarioInput>({
    mutationFn: (input) =>
      apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (nuevo) => {
      qc.setQueryData<Usuario[]>(USUARIOS_KEY, (old) => [...(old ?? []), nuevo])
    },
  })
}

export function useActualizarUsuario(id: string) {
  const qc = useQueryClient()
  return useMutation<Usuario, Error, UsuarioInput>({
    mutationFn: (input) =>
      apiFetch(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (actualizado) => {
      qc.setQueryData<Usuario[]>(USUARIOS_KEY, (old) =>
        old?.map((u) => (u.id === id ? actualizado : u)) ?? []
      )
    },
  })
}

export function useDesactivarUsuario() {
  const qc = useQueryClient()
  return useMutation<{ esta_activo: boolean }, Error, string>({
    mutationFn: (id) => apiFetch(`/usuarios/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: ({ esta_activo }, id) => {
      qc.setQueryData<Usuario[]>(USUARIOS_KEY, (old) =>
        old?.map((u) => (u.id === id ? { ...u, esta_activo } : u)) ?? []
      )
    },
  })
}

export function useEliminarUsuario() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/usuarios/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      qc.setQueryData<Usuario[]>(USUARIOS_KEY, (old) => old?.filter((u) => u.id !== id) ?? [])
    },
  })
}
