import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search, Filter, Trash2, Receipt } from 'lucide-react'
import { Breadcrumb } from '../components/Breadcrumb'
import { useDebounced } from '../hooks/useDebounced'
import { DEBOUNCE_FILTROS_MS } from '../utils/constants'
import { useFacturasPaginadas, exportarFacturas } from '../api/facturas'
import { SortButton, type SortDir } from '../components/SortButton'
import { descargarCSV, descargarXLSX } from '../utils/csv'
import { PaginationFooter } from '../components/PaginationFooter'
import { TableEmptyState } from '../components/TableEmptyState'
import { ExportButtons } from '../components/ExportButtons'

const LIMIT = 25

type OrdenFactura = 'fecha' | 'paciente' | 'total'

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(valor)
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function Facturas() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [orden, setOrden] = useState<OrdenFactura>('fecha')
  const [dir, setDir] = useState<SortDir>('desc')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [filtros, setFiltros] = useState({ desde: '', hasta: '' })
  const [descargando, setDescargando] = useState<'csv' | 'xlsx' | null>(null)

  const qDebounced = useDebounced(q)
  const filtrosDebounced = useDebounced(filtros, DEBOUNCE_FILTROS_MS)

  const hayFiltros = Object.values(filtros).some(v => v !== '')

  function setFiltro<K extends keyof typeof filtros>(key: K, value: string) {
    setFiltros(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  function limpiarFiltros() {
    setFiltros({ desde: '', hasta: '' })
    setPage(1)
  }

  function ordenarPor(col: OrdenFactura) {
    if (orden === col) {
      setDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setOrden(col)
      setDir(col === 'fecha' || col === 'total' ? 'desc' : 'asc')
    }
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

  const { data, isLoading, isFetching, isError } = useFacturasPaginadas({
    q: qDebounced,
    page,
    limit: LIMIT,
    orden,
    dir,
    ...filtrosDebounced,
  })

  const facturas = data?.facturas ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const HEADERS = ['Fecha', 'Paciente', 'Documento', 'Subtotal', 'Total']

  async function obtenerFilas() {
    const { facturas } = await exportarFacturas({ q: qDebounced, orden, dir, ...filtrosDebounced })
    return facturas.map(f => [
      formatFecha(f.fecha_creacion),
      f.paciente_nombre || f.paciente_documento,
      f.paciente_documento,
      f.subtotal,
      f.total,
    ])
  }

  async function descargarCsv() {
    setDescargando('csv')
    try {
      descargarCSV(`facturas_${new Date().toISOString().slice(0, 10)}.csv`, HEADERS, await obtenerFilas())
    } finally { setDescargando(null) }
  }

  async function descargarExcel() {
    setDescargando('xlsx')
    try {
      descargarXLSX(`facturas_${new Date().toISOString().slice(0, 10)}.xlsx`, HEADERS, await obtenerFilas())
    } finally { setDescargando(null) }
  }

  return (
    <div className="page-hce">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Facturación' }]} />
      <div className="page-header">
        <div>
          <h2 className="page-title">Facturación</h2>
          <p className="page-desc">Facturas emitidas a pacientes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/facturas/nueva')} className="btn-primary">
            <Plus size={15} />
            Nueva factura
          </button>
        </div>
      </div>

      <div className="card-hce overflow-hidden">
        {/* Búsqueda y filtros */}
        <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: 'var(--hce-border)' }}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1) }}
                placeholder="Buscar por nombre o documento del paciente…"
                className="input-hce pl-9"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-hce">Desde</label>
                  <input type="date" className="input-hce" value={filtros.desde} onChange={e => setFiltro('desde', e.target.value)} />
                </div>
                <div>
                  <label className="label-hce">Hasta</label>
                  <input type="date" className="input-hce" value={filtros.hasta} onChange={e => setFiltro('hasta', e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button className="btn-ghost text-xs text-slate-400 hover:text-slate-600" onClick={limpiarFiltros}>
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
            <thead className="thead-sticky border-b" style={{ borderColor: 'var(--hce-border)' }}>
              <tr>
                <th className="th-hce px-5">
                  <SortButton activo={orden === 'paciente'} dir={dir} onClick={() => ordenarPor('paciente')}>Paciente</SortButton>
                </th>
                <th className="th-hce">
                  <SortButton activo={orden === 'fecha'} dir={dir} onClick={() => ordenarPor('fecha')}>Fecha</SortButton>
                </th>
                <th className="th-hce th-hce--right">
                  <SortButton activo={orden === 'total'} dir={dir} onClick={() => ordenarPor('total')}>Total</SortButton>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              <TableEmptyState
                isLoading={isLoading}
                isError={isError}
                isEmpty={facturas.length === 0}
                colSpan={4}
                hayBusqueda={!!(qDebounced || hayFiltros)}
                textoVacio="No hay facturas registradas."
                textoSinResultados="Sin resultados para ese criterio."
                icon={<Receipt size={28} className="text-slate-300" />}
              />
              {facturas.map(f => (
                <tr
                  key={f.factura_id}
                  onClick={() => navigate(`/facturas/${f.factura_id}`)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  style={{ color: 'var(--hce-text)' }}
                >
                  <td className="px-5 py-3">
                    <p className="font-medium leading-tight">{f.paciente_nombre || f.paciente_documento}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>{f.paciente_documento}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--hce-text-muted)' }}>
                    {formatFecha(f.fecha_creacion)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatCOP(f.total)}
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
          entityLabel="facturas"
        />
      </div>
    </div>
  )
}
