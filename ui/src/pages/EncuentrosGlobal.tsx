import { useState, useEffect } from 'react'
import { useDebounced } from '../hooks/useDebounced'
import { DEBOUNCE_FILTROS_MS } from '../utils/constants'
import { useNavigate } from 'react-router'
import {
  Search, Plus, Filter, Trash2, ChevronLeft, ChevronRight, ClipboardList, Download,
} from 'lucide-react'
import { useEncuentrosPaginados, exportarEncuentros } from '../api/encuentros'
import { descargarCSV, descargarXLSX } from '../utils/csv'

const LIMIT = 30

const FINALIDADES = [
  { value: '', label: 'Todas las finalidades' },
  { value: '10', label: 'Primera vez' },
  { value: '11', label: 'Control / seguimiento' },
  { value: '12', label: 'Urgencias' },
]

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function EncuentrosGlobal() {
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [filtros, setFiltros] = useState({
    desde: '', hasta: '', finalidad: '',
  })

  const qDebounced = useDebounced(q)
  const filtrosDebounced = useDebounced(filtros, DEBOUNCE_FILTROS_MS)

  useEffect(() => { setPage(1) }, [qDebounced, filtrosDebounced])

  function setFiltro<K extends keyof typeof filtros>(key: K, value: string) {
    setFiltros(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  function limpiarFiltros() {
    setFiltros({ desde: '', hasta: '', finalidad: '' })
    setPage(1)
  }

  function toggleFiltros() {
    if (filtrosAbiertos) {
      limpiarFiltros()
      setFiltrosAbiertos(false)
    } else {
      setFiltrosAbiertos(true)
    }
  }

  const hayFiltros = Object.values(filtros).some(v => v !== '')
  const [descargando, setDescargando] = useState<'csv' | 'xlsx' | null>(null)

  const HEADERS_ENC = ['Fecha', 'Paciente', 'Tipo doc', 'Documento', 'Finalidad', 'Código diagnóstico', 'Diagnóstico']

  async function obtenerFilas() {
    const { encuentros } = await exportarEncuentros({ q: qDebounced, ...filtrosDebounced })
    return encuentros.map(e => [
      new Date(e.fecha_atencion).toLocaleDateString('es-CO'),
      e.paciente_nombre, e.tipo_documento, e.paciente_documento,
      e.finalidad_consulta_nombre,
      e.codigo_diagnostico_principal, e.descripcion_diagnostico ?? '',
    ])
  }

  async function descargarCsv() {
    setDescargando('csv')
    try {
      descargarCSV(`encuentros_${new Date().toISOString().slice(0, 10)}.csv`, HEADERS_ENC, await obtenerFilas())
    } finally { setDescargando(null) }
  }

  async function descargarExcel() {
    setDescargando('xlsx')
    try {
      descargarXLSX(`encuentros_${new Date().toISOString().slice(0, 10)}.xlsx`, HEADERS_ENC, await obtenerFilas())
    } finally { setDescargando(null) }
  }

  const { data, isLoading, isFetching, isError } = useEncuentrosPaginados({
    q: qDebounced,
    page,
    limit: LIMIT,
    ...filtrosDebounced,
  })

  const encuentros = data?.encuentros ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const desde = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const hasta = Math.min(page * LIMIT, total)

  return (
    <div className="page-hce">
      <div className="page-header">
        <div>
          <h2 className="page-title">Consultas</h2>
          <p className="page-desc">Todos los encuentros clínicos registrados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={descargarCsv}
            disabled={descargando !== null || total === 0}
            className="btn-secondary flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download size={14} />
            {descargando === 'csv' ? 'Generando…' : 'CSV'}
          </button>
          <button
            onClick={descargarExcel}
            disabled={descargando !== null || total === 0}
            className="btn-secondary flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download size={14} />
            {descargando === 'xlsx' ? 'Generando…' : 'Excel'}
          </button>
          <button
            onClick={() => navigate('/nueva-consulta/nuevo')}
            className="btn-primary"
          >
            <Plus size={15} />
            Nuevo encuentro
          </button>
        </div>
      </div>

      <div className="card-hce overflow-hidden">
        {/* Barra de búsqueda y filtros */}
        <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: 'var(--hce-border)' }}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por nombre o documento del paciente…"
                className="input-hce pl-9"
                autoFocus
              />
            </div>
            <button
              onClick={toggleFiltros}
              className={`btn-secondary flex items-center gap-1.5 shrink-0 ${filtrosAbiertos ? 'bg-slate-100' : ''}`}
            >
              <Filter size={14} />
              Filtros
              {hayFiltros && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
            </button>
          </div>

          {filtrosAbiertos && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="label-hce">Finalidad</label>
                  <select
                    className="input-hce"
                    value={filtros.finalidad}
                    onChange={e => setFiltro('finalidad', e.target.value)}
                  >
                    {FINALIDADES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-hce">Desde</label>
                  <input
                    type="date"
                    className="input-hce"
                    value={filtros.desde}
                    onChange={e => setFiltro('desde', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-hce">Hasta</label>
                  <input
                    type="date"
                    className="input-hce"
                    value={filtros.hasta}
                    onChange={e => setFiltro('hasta', e.target.value)}
                  />
                </div>
              </div>
              <button
                className="btn-ghost text-xs text-slate-400 hover:text-slate-600"
                onClick={limpiarFiltros}
              >
                <Trash2 size={13} /> Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Contador */}
        <div
          className="px-5 py-2 flex items-center justify-between text-xs"
          style={{ background: 'var(--hce-bg)', borderBottom: '1px solid var(--hce-border)' }}
        >
          <span style={{ color: 'var(--hce-text-muted)' }}>
            {isLoading
              ? 'Cargando…'
              : total === 0
              ? 'Sin resultados'
              : `Mostrando ${desde}–${hasta} de ${total} consulta${total !== 1 ? 's' : ''}`}
          </span>
          {isFetching && !isLoading && (
            <span className="text-slate-400">Actualizando…</span>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs font-medium border-b"
                style={{
                  background: 'var(--hce-bg)',
                  borderColor: 'var(--hce-border)',
                  color: 'var(--hce-text-muted)',
                }}
              >
                <th className="px-5 py-2.5">Paciente</th>
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Finalidad</th>
                <th className="px-4 py-2.5">Diagnóstico</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              {isError && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-red-500">
                    Error al cargar. Intenta de nuevo.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && encuentros.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <ClipboardList size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
                      {qDebounced || hayFiltros
                        ? 'Sin resultados para esa búsqueda.'
                        : 'Aún no hay consultas registradas.'}
                    </p>
                  </td>
                </tr>
              )}
              {encuentros.map(e => (
                <tr
                  key={e.encuentro_id}
                  className="transition-colors cursor-pointer hover:bg-[var(--hce-bg)]"
                  style={{ color: 'var(--hce-text)' }}
                  onClick={() =>
                    navigate(`/pacientes/${e.paciente_documento}/encuentros/${e.encuentro_id}`)
                  }
                >
                  <td className="px-5 py-3">
                    <p className="font-medium leading-tight">{e.paciente_nombre}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
                      {e.tipo_documento} {e.paciente_documento}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--hce-text-muted)' }}>
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
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs" style={{ color: 'var(--hce-primary)' }}>
                      Ver →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div
            className="px-5 py-3 flex items-center justify-between border-t text-sm"
            style={{ borderColor: 'var(--hce-border)' }}
          >
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 btn-ghost disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ color: 'var(--hce-text-muted)' }}>
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 btn-ghost disabled:opacity-30"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
