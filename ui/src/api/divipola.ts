import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export type Departamento = { codigo: string; nombre: string }
export type Municipio = { codigo: string; nombre: string; departamento: string }

export function useDepartamentos() {
  return useQuery({
    queryKey: ['departamentos'],
    queryFn: () => apiFetch<Departamento[]>('/divipola/departamentos'),
    staleTime: Infinity,
  })
}

export function useMunicipios(dep: string) {
  return useQuery({
    queryKey: ['municipios', dep],
    queryFn: () => apiFetch<Municipio[]>(`/divipola/municipios?dep=${dep}`),
    enabled: dep.length === 2,
    staleTime: Infinity,
  })
}

export function useMunicipio(codigo: string) {
  return useQuery({
    queryKey: ['municipio', codigo],
    queryFn: () => apiFetch<Municipio>(`/divipola/municipios/${codigo}`),
    enabled: codigo.length === 5,
    staleTime: Infinity,
    select: (m) => m.nombre,
  })
}
