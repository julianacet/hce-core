import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Download, X, RefreshCw } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'

type VersionInfo = {
  actual: string
  disponible?: string
  hay_actualizacion: boolean
  url_descarga?: string
  error?: string
}

export default function BannerActualizacion() {
  const { tieneRol } = useAuth()
  const [descartado, setDescartado] = useState(false)
  const [instalando, setInstalando] = useState(false)

  const { data } = useQuery<VersionInfo>({
    queryKey: ['sistema-version'],
    queryFn: () => apiFetch('/sistema/version'),
    refetchInterval: 60 * 60 * 1000, // cada hora
    staleTime: 30 * 60 * 1000,
    retry: false,
  })

  const actualizar = useMutation({
    mutationFn: (url: string) =>
      apiFetch('/sistema/actualizar', { method: 'POST', body: JSON.stringify({ url }) }),
    onSuccess: () => setInstalando(true),
  })

  // Solo visible para admin y medico, cuando hay actualización y no fue descartada
  if (!tieneRol('medico')) return null
  if (!data?.hay_actualizacion) return null
  if (descartado) return null

  if (instalando) {
    return (
      <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm">
        <RefreshCw size={15} className="animate-spin" />
        <span>Instalando actualización {data.disponible}... El sistema se reiniciará en unos segundos.</span>
      </div>
    )
  }

  return (
    <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <span>
        Nueva versión disponible: <strong>{data.disponible}</strong>
        {' '}(instalada: {data.actual})
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {data.url_descarga && (
          <button
            onClick={() => actualizar.mutate(data.url_descarga!)}
            disabled={actualizar.isPending}
            className="flex items-center gap-1.5 bg-white text-emerald-700 font-medium px-3 py-1 rounded text-xs hover:bg-emerald-50 disabled:opacity-60"
          >
            <Download size={13} />
            Actualizar ahora
          </button>
        )}
        <button
          onClick={() => setDescartado(true)}
          className="text-white/70 hover:text-white"
          title="Descartar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
