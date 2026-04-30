import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type Usuario = {
  id: string
  nombre_usuario: string
  nombre_completo: string
  rol: 'admin' | 'medico' | 'auxiliar'
  esta_activo: boolean
  fecha_creacion: string
}

export type UsuarioInput = {
  nombre_usuario: string
  nombre_completo: string
  rol: 'admin' | 'medico' | 'auxiliar'
  contrasena: string // vacío = no cambiar
}

export function useUsuarios() {
  return useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => apiFetch('/usuarios'),
  })
}

export function useCrearUsuario() {
  const qc = useQueryClient()
  return useMutation<Usuario, Error, UsuarioInput>({
    mutationFn: (input) =>
      apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useActualizarUsuario(id: string) {
  const qc = useQueryClient()
  return useMutation<Usuario, Error, UsuarioInput>({
    mutationFn: (input) =>
      apiFetch(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useDesactivarUsuario() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/usuarios/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}
