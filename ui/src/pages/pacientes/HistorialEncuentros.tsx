import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Search, X, ClipboardList, ChevronRight } from 'lucide-react'
import { useEncuentros, type FiltrosEncuentro, type Encuentro } from '../../api/encuentros'
import { SortButton, type SortDir } from '../../components/SortButton'

type OrdenHistorial = 'fecha' | 'finalidad'

const FINALIDADES = [
  { value: '', label: 'Todas' },
  { value: '10', label: 'Primera vez' },
  { value: '11', label: 'Control' },
  { value: '12', label: 'Urgencias' },
]

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function HistorialEncuentros() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({ desde: '', hasta: '', diagnostico: '', finalidad: '' })
  const [filtros, setFiltros] = useState<FiltrosEncuentro>({})
  const [filtrosDebounced, setFiltrosDebounced] = useState<FiltrosEncuentro>({})
  const [orden, setOrden] = useState<OrdenHistorial>('fecha')
  const [dir, setDir] = useState<SortDir>('desc')

  useEffect(() => {
    const t = setTimeout(() => setFiltrosDebounced(filtros), 350)
    return () => clearTimeout(t)
  }, [filtros])

  const { data: encuentros = [], isLoading, isError } = useEncuentros(id ?? '', filtrosDebounced)

  function aplicar() {
    setFiltros({
      desde: form.desde || undefined,
      hasta: form.hasta || undefined,
      diagnostico: form.diagnostico || undefined,
    })
  }

  function limpiar() {
    setForm({ desde: '', hasta: '', diagnostico: '', finalidad: '' })
    setFiltros({})
    setFiltrosDebounced({})
  }

  const hayFiltros = !!(form.desde || form.hasta || form.diagnostico)

  function ordenarPor(col: OrdenHistorial) {
    if (orden === col) {
      setDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setOrden(col)
      setDir(col === 'fecha' ? 'desc' : 'asc')
    }
  }

  const filtrados = form.finalidad
    ? encuentros.filter((e: Encuentro) => e.finalidad_consulta === form.finalidad)
    : encuentros

  const visibles = useMemo(() => {
    const sorted = [...filtrados].sort((a, b) => {
      let cmp = 0
      if (orden === 'fecha') {
        cmp = a.fecha_atencion < b.fecha_atencion ? -1 : a.fecha_atencion > b.fecha_atencion ? 1 : 0
      } else {
        cmp = (a.finalidad_consulta_nombre ?? '').localeCompare(b.finalidad_consulta_nombre ?? '', 'es')
      }
      return dir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filtrados, orden, dir])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card-hce px-5 py-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label-hce">Desde</label>
            <input
              type="date"
              value={form.desde}
              onChange={e => setForm(p => ({ ...p, desde: e.target.value }))}
              className="input-hce"
            />
          </div>
          <div>
            <label className="label-hce">Hasta</label>
            <input
              type="date"
              value={form.hasta}
              onChange={e => setForm(p => ({ ...p, hasta: e.target.value }))}
              className="input-hce"
            />
          </div>
          <div>
            <label className="label-hce">Finalidad</label>
            <select
              className="input-hce"
              value={form.finalidad}
              onChange={e => setForm(p => ({ ...p, finalidad: e.target.value }))}
            >
              {FINALIDADES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="label-hce">Diagnóstico</label>
            <input
              type="text"
              value={form.diagnostico}
              placeholder="Código CIE-10 o descripción"
              onChange={e => setForm(p => ({ ...p, diagnostico: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && aplicar()}
              className="input-hce"
            />
          </div>
          <div className="flex gap-2 pb-0.5">
            <button onClick={aplicar} className="btn-primary">
              <Search size={13} /> Filtrar
            </button>
            {(hayFiltros || form.finalidad) && (
              <button onClick={limpiar} className="btn-secondary">
                <X size={13} /> Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card-hce overflow-hidden">
        <div
          className="px-5 py-2 text-xs border-b"
          style={{ background: 'var(--hce-bg)', borderColor: 'var(--hce-border)', color: 'var(--hce-text-muted)' }}
        >
          {isLoading
            ? 'Cargando…'
            : `${visibles.length} consulta${visibles.length !== 1 ? 's' : ''}${hayFiltros || form.finalidad ? ' (filtrado)' : ''}`}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--hce-border)', background: 'var(--hce-fondo)' }}>
                <th className="px-5 py-3 text-left">
                  <SortButton activo={orden === 'fecha'} dir={dir} onClick={() => ordenarPor('fecha')}>Fecha</SortButton>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortButton activo={orden === 'finalidad'} dir={dir} onClick={() => ordenarPor('finalidad')}>Finalidad</SortButton>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Diagnóstico</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              {isError && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-red-500">
                    Error al cargar. Intenta de nuevo.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && visibles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <ClipboardList size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
                      {hayFiltros || form.finalidad
                        ? 'Sin consultas para esos filtros.'
                        : 'Este paciente no tiene consultas registradas.'}
                    </p>
                  </td>
                </tr>
              )}
              {visibles.map(e => (
                <tr
                  key={e.encuentro_id}
                  className="cursor-pointer transition-colors hover:bg-[var(--hce-bg)]"
                  style={{ color: 'var(--hce-text)' }}
                  onClick={() => navigate(`/pacientes/${id}/encuentros/${e.encuentro_id}`)}
                >
                  <td className="px-5 py-3 whitespace-nowrap" style={{ color: 'var(--hce-text-muted)' }}>
                    {formatFecha(e.fecha_atencion)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                    {e.finalidad_consulta_nombre}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {e.descripcion_diagnostico ? (
                      <p className="truncate text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                        {e.codigo_diagnostico_principal && (
                          <span className="font-mono mr-1.5">{e.codigo_diagnostico_principal}</span>
                        )}
                        {e.descripcion_diagnostico}
                      </p>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--hce-text)' }}>
                        {e.motivo_consulta.slice(0, 60)}{e.motivo_consulta.length > 60 ? '…' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={15} className="text-slate-300 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
