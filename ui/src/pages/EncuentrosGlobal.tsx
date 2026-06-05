import { useState, useEffect } from 'react'
import { useDebounced } from '../hooks/useDebounced'
import { DEBOUNCE_FILTROS_MS } from '../utils/constants'
import { useNavigate } from 'react-router'
import {
  Search, Plus, Filter, Trash2, ClipboardList, AlertTriangle,
} from 'lucide-react'
import { Breadcrumb } from '../components/Breadcrumb'
import { useEncuentrosPaginados, exportarEncuentros, useEliminarEncuentro } from '../api/encuentros'
import { SortButton, type SortDir } from '../components/SortButton'
import { descargarCSV, descargarXLSX } from '../utils/csv'
import { PaginationFooter } from '../components/PaginationFooter'
import { TableEmptyState } from '../components/TableEmptyState'
import { ExportButtons } from '../components/ExportButtons'

const LIMIT = 30

type OrdenEncuentro = 'fecha' | 'paciente' | 'finalidad' | 'diagnostico' | 'estado'

const FINALIDADES = [
  { value: '', label: 'Todas las finalidades' },
  { value: '10', label: 'Primera vez' },
  { value: '11', label: 'Control / seguimiento' },
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
  const [orden, setOrden] = useState<OrdenEncuentro>('fecha')
  const [dir, setDir] = useState<SortDir>('desc')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [filtros, setFiltros] = useState({
    desde: '', hasta: '', finalidad: '', estado: '',
  })

  const qDebounced = useDebounced(q)
  const filtrosDebounced = useDebounced(filtros, DEBOUNCE_FILTROS_MS)

  useEffect(() => { setPage(1) }, [qDebounced, filtrosDebounced])

  function ordenarPor(col: OrdenEncuentro) {
    if (orden === col) {
      setDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setOrden(col)
      setDir(col === 'fecha' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  function setFiltro<K extends keyof typeof filtros>(key: K, value: string) {
    setFiltros(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  function limpiarFiltros() {
    setFiltros({ desde: '', hasta: '', finalidad: '', estado: '' })
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
    const { encuentros } = await exportarEncuentros({ q: qDebounced, orden, dir, ...filtrosDebounced })
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
      descargarCSV(`consultas_${new Date().toISOString().slice(0, 10)}.csv`, HEADERS_ENC, await obtenerFilas())
    } finally { setDescargando(null) }
  }

  async function descargarExcel() {
    setDescargando('xlsx')
    try {
      descargarXLSX(`consultas_${new Date().toISOString().slice(0, 10)}.xlsx`, HEADERS_ENC, await obtenerFilas())
    } finally { setDescargando(null) }
  }

  const { data, isLoading, isFetching, isError } = useEncuentrosPaginados({
    q: qDebounced,
    page,
    limit: LIMIT,
    orden,
    dir,
    ...filtrosDebounced,
  })

  const encuentros = data?.encuentros ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const eliminar = useEliminarEncuentro()

  return (
    <div className="page-hce">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Consultas' }]} />
      <div className="page-header">
        <div>
          <h2 className="page-title">Consultas</h2>
          <p className="page-desc">Todas las consultas clínicas registradas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/nueva-consulta/nuevo')}
            className="btn-primary"
          >
            <Plus size={15} />
            Nueva consulta
          </button>
        </div>
      </div>

      <div className="card-hce overflow-hidden">
        {/* Banner borradores — solo cuando hay borradores en la lista actual */}
        {encuentros.some(e => e.estado === 'borrador') && (
          <div className="px-5 py-2.5 flex items-center gap-2 text-xs border-b"
            style={{ background: 'var(--hce-warning-soft, #fef9c3)', borderColor: 'var(--hce-border)', color: '#92400e' }}>
            <AlertTriangle size={13} className="shrink-0" />
            Las consultas en <strong>borrador</strong> no son visibles en la historia clínica ni en facturación hasta ser finalizadas.
          </div>
        )}

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
              {hayFiltros && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--hce-primary)' }} />}
            </button>
          </div>

          {filtrosAbiertos && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="label-hce">Estado</label>
                  <select
                    className="input-hce"
                    value={filtros.estado}
                    onChange={e => setFiltro('estado', e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="finalizado">Finalizadas</option>
                    <option value="borrador">Borradores</option>
                  </select>
                </div>
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
              <div className="flex items-center justify-between">
                <button
                  className="btn-ghost text-xs text-slate-400 hover:text-slate-600"
                  onClick={limpiarFiltros}
                >
                  <Trash2 size={13} /> Limpiar filtros
                </button>
                <ExportButtons onCsv={descargarCsv} onExcel={descargarExcel} descargando={descargando} disabled={total === 0} />
              </div>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '30%' }} />
            </colgroup>
            <thead className="thead-sticky border-b" style={{ borderColor: 'var(--hce-border)' }}>
              <tr>
                <th className="th-hce px-5">
                  <SortButton activo={orden === 'paciente'} dir={dir} onClick={() => ordenarPor('paciente')}>Paciente</SortButton>
                </th>
                <th className="th-hce">
                  <SortButton activo={orden === 'fecha'} dir={dir} onClick={() => ordenarPor('fecha')}>Fecha</SortButton>
                </th>
                <th className="th-hce">
                  <SortButton activo={orden === 'estado'} dir={dir} onClick={() => ordenarPor('estado')}>Estado</SortButton>
                </th>
                <th className="th-hce">
                  <SortButton activo={orden === 'finalidad'} dir={dir} onClick={() => ordenarPor('finalidad')}>Finalidad</SortButton>
                </th>
                <th className="th-hce">
                  <SortButton activo={orden === 'diagnostico'} dir={dir} onClick={() => ordenarPor('diagnostico')}>Diagnóstico</SortButton>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              <TableEmptyState
                isLoading={isLoading}
                isError={isError}
                isEmpty={encuentros.length === 0}
                colSpan={5}
                hayBusqueda={!!(qDebounced || hayFiltros)}
                textoVacio="Aún no hay consultas registradas."
                textoSinResultados="Sin resultados para esa búsqueda."
                icon={<ClipboardList size={28} className="text-slate-300" />}
              />
              {encuentros.map(e => (
                <tr
                  key={e.encuentro_id}
                  className="transition-colors cursor-pointer hover:bg-[var(--hce-bg)]"
                  style={{ color: 'var(--hce-text)' }}
                  onClick={() => {
                    if (e.estado === 'borrador') {
                      navigate('/nueva-consulta/nuevo', { state: { documento: e.paciente_documento } })
                    } else {
                      navigate(`/pacientes/${e.paciente_documento}/encuentros/${e.encuentro_id}`)
                    }
                  }}
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
                  <td className="px-4 py-3">
                    {e.estado === 'borrador' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        Borrador
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Finalizada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                    {e.finalidad_consulta_nombre}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
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
                      </div>
                      {e.estado === 'borrador' && (
                        <button
                          type="button"
                          title="Eliminar borrador"
                          disabled={eliminar.isPending}
                          onClick={ev => {
                            ev.stopPropagation()
                            if (confirm('¿Eliminar este borrador? Esta acción no se puede deshacer.')) {
                              eliminar.mutate({ doc: e.paciente_documento, encuentroId: e.encuentro_id })
                            }
                          }}
                          className="shrink-0 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationFooter
          page={page}
          totalPages={totalPages}
          total={total}
          limit={LIMIT}
          isLoading={isLoading}
          isFetching={isFetching}
          onPageChange={setPage}
          entityLabel={`consulta${total !== 1 ? 's' : ''}`}
        />
      </div>
    </div>
  )
}
