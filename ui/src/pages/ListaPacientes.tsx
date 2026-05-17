import { useState, useEffect } from 'react'
import { useDebounced } from '../hooks/useDebounced'
import { DEBOUNCE_FILTROS_MS } from '../utils/constants'
import { useNavigate } from 'react-router'
import { Search, UserPlus, Filter, Trash2, Users } from 'lucide-react'
import { Breadcrumb } from '../components/Breadcrumb'
import { SortButton } from '../components/SortButton'
import { usePacientesPaginados, exportarPacientes } from '../api/pacientes'
import { SelectorEps } from '../components/SelectorEps'
import { descargarCSV, descargarXLSX } from '../utils/csv'
import { nombreCompleto } from '../utils/paciente'
import { PaginationFooter } from '../components/PaginationFooter'
import { TableEmptyState } from '../components/TableEmptyState'
import { ExportButtons } from '../components/ExportButtons'

const TIPOS_USUARIO = [
  { value: '', label: 'Todos los tipos' },
  { value: '01', label: 'Contributivo' },
  { value: '02', label: 'Subsidiado' },
  { value: '03', label: 'Vinculado' },
  { value: '04', label: 'Particular' },
  { value: '05', label: 'Indígena' },
  { value: '06', label: 'No asegurado' },
]

const LIMIT = 25

type Orden = 'nombre' | 'edad' | 'tipoUsuario' | 'ultima_atencion' | 'fecha'
type Dir = 'asc' | 'desc'

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}


export default function ListaPacientes() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [orden, setOrden] = useState<Orden>('nombre')
  const [dir, setDir] = useState<Dir>('asc')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [filtros, setFiltros] = useState({
    tipo_usuario: '', genero: '', zona_residencia: '', eps: '', telefono: '',
    min_atencion: '', max_atencion: '',
  })
  const [epsResetKey, setEpsResetKey] = useState(0)

  const qDebounced = useDebounced(q)
  const filtrosDebounced = useDebounced(filtros, DEBOUNCE_FILTROS_MS)

  useEffect(() => { setPage(1) }, [qDebounced])

  function setFiltro<K extends keyof typeof filtros>(key: K, value: string) {
    setFiltros(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  function limpiarFiltros() {
    setFiltros({ tipo_usuario: '', genero: '', zona_residencia: '', eps: '', telefono: '', min_atencion: '', max_atencion: '' })
    setEpsResetKey(k => k + 1)
    setPage(1)
  }

  function toggleModo() {
    if (filtrosAbiertos) {
      limpiarFiltros()
      setFiltrosAbiertos(false)
    } else {
      setQ('')
      setFiltrosAbiertos(true)
      setPage(1)
    }
  }

  function ordenarPor(col: Orden) {
    if (orden === col) {
      setDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setOrden(col)
      setDir('asc')
    }
    setPage(1)
  }

  const { data, isLoading, isFetching, isError } = usePacientesPaginados({
    q: qDebounced,
    page,
    limit: LIMIT,
    orden,
    dir,
    ...filtrosDebounced,
  })

  const pacientes = data?.pacientes ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const hayFiltros = Object.values(filtros).some(v => v !== '')
  const [descargando, setDescargando] = useState<'csv' | 'xlsx' | null>(null)

  const HEADERS_PAC = ['Tipo doc', 'Documento', 'Primer nombre', 'Segundo nombre', 'Primer apellido',
    'Segundo apellido', 'Fecha nacimiento', 'Edad', 'Género', 'Tipo usuario', 'EPS',
    'Teléfono', 'Correo', 'Zona residencia', 'Última atención', 'Fecha registro']

  async function obtenerFilas() {
    const { pacientes } = await exportarPacientes({ q: qDebounced, orden, dir, ...filtrosDebounced })
    return pacientes.map(p => [
      p.tipo_documento, p.numero_documento,
      p.nombre_primero, p.nombre_segundo ?? '',
      p.apellido_primero, p.apellido_segundo ?? '',
      p.fecha_nacimiento, p.edad,
      p.genero_nombre, p.tipo_usuario_nombre,
      p.codigo_eps ?? '', p.telefono ?? '', p.correo_electronico ?? '',
      p.zona_residencia_nombre,
      p.ultima_atencion ?? '', p.fecha_creacion,
    ])
  }

  async function descargarCsv() {
    setDescargando('csv')
    try {
      descargarCSV(`pacientes_${new Date().toISOString().slice(0, 10)}.csv`, HEADERS_PAC, await obtenerFilas())
    } finally { setDescargando(null) }
  }

  async function descargarExcel() {
    setDescargando('xlsx')
    try {
      descargarXLSX(`pacientes_${new Date().toISOString().slice(0, 10)}.xlsx`, HEADERS_PAC, await obtenerFilas())
    } finally { setDescargando(null) }
  }

  return (
    <div className="page-hce">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Pacientes' }]} />
      <div className="page-header">
        <div>
          <h2 className="page-title">Pacientes</h2>
          <p className="page-desc">Listado general de pacientes registrados</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons
            onCsv={descargarCsv}
            onExcel={descargarExcel}
            descargando={descargando}
            disabled={total === 0}
          />
          <button onClick={() => navigate('/pacientes/nuevo')} className="btn-primary">
            <UserPlus size={15} />
            Nuevo paciente
          </button>
        </div>
      </div>

      <div className="card-hce overflow-hidden">
        {/* Búsqueda y filtros */}
        <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: 'var(--hce-border)' }}>
          <div className="flex gap-2">
            {!filtrosAbiertos && (
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre, documento, teléfono..."
                  className="input-hce pl-9"
                />
              </div>
            )}
            {filtrosAbiertos && <div className="flex-1" />}
            <button
              onClick={toggleModo}
              className={`btn-secondary flex items-center gap-1.5 shrink-0 ${filtrosAbiertos ? 'bg-slate-100' : ''}`}
            >
              <Filter size={14} />
              Filtros
              {hayFiltros && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--hce-primary)' }} />}
            </button>
          </div>

          {filtrosAbiertos && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label-hce">Tipo de usuario</label>
                  <select className="input-hce" value={filtros.tipo_usuario} onChange={e => setFiltro('tipo_usuario', e.target.value)}>
                    {TIPOS_USUARIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-hce">Género</label>
                  <select className="input-hce" value={filtros.genero} onChange={e => setFiltro('genero', e.target.value)}>
                    <option value="">Todos</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="X">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="label-hce">Zona de residencia</label>
                  <select className="input-hce" value={filtros.zona_residencia} onChange={e => setFiltro('zona_residencia', e.target.value)}>
                    <option value="">Todas</option>
                    <option value="U">Urbana</option>
                    <option value="R">Rural</option>
                  </select>
                </div>
                <SelectorEps
                  key={epsResetKey}
                  value={filtros.eps}
                  onChange={(v) => setFiltro('eps', v)}
                />
                <div>
                  <label className="label-hce">Teléfono</label>
                  <input className="input-hce" placeholder="Buscar por teléfono..." value={filtros.telefono} onChange={e => setFiltro('telefono', e.target.value)} />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <div className="border rounded-md p-3 space-y-2" style={{ borderColor: 'var(--hce-border)', background: 'var(--hce-bg)' }}>
                    <p className="label-hce mb-0">Última atención</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="label-hce">Desde</p>
                        <input className="input-hce" type="date" value={filtros.min_atencion} onChange={e => setFiltro('min_atencion', e.target.value)} />
                      </div>
                      <span className="text-slate-300 text-sm shrink-0 mt-4">—</span>
                      <div className="flex-1">
                        <p className="label-hce">Hasta</p>
                        <input className="input-hce" type="date" value={filtros.max_atencion} onChange={e => setFiltro('max_atencion', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button className="btn-ghost text-xs text-slate-400 hover:text-slate-600" onClick={limpiarFiltros}>
                <Trash2 size={13} />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead className="thead-sticky border-b" style={{ borderColor: 'var(--hce-border)' }}>
              <tr>
                <th className="th-hce px-5">
                  <SortButton activo={orden === 'nombre'} dir={dir} onClick={() => ordenarPor('nombre')}>Paciente</SortButton>
                </th>
                <th className="th-hce">
                  <SortButton activo={orden === 'edad'} dir={dir} onClick={() => ordenarPor('edad')}>Edad</SortButton>
                </th>
                <th className="th-hce">Teléfono</th>
                <th className="th-hce">
                  <SortButton activo={orden === 'tipoUsuario'} dir={dir} onClick={() => ordenarPor('tipoUsuario')}>Tipo</SortButton>
                </th>
                <th className="th-hce">
                  <SortButton activo={orden === 'ultima_atencion'} dir={dir} onClick={() => ordenarPor('ultima_atencion')}>Última atención</SortButton>
                </th>
                <th className="th-hce">
                  <SortButton activo={orden === 'fecha'} dir={dir} onClick={() => ordenarPor('fecha')}>Registrado</SortButton>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              <TableEmptyState
                isLoading={isLoading}
                isError={isError}
                isEmpty={pacientes.length === 0}
                colSpan={7}
                hayBusqueda={!!(q || hayFiltros)}
                icon={<Users size={28} className="text-slate-300" />}
                textoVacio="Aún no hay pacientes registrados."
                textoSinResultados="No se encontraron pacientes con ese criterio."
                textoError="Error al cargar pacientes."
              />
              {pacientes.map((p) => (
                <tr
                  key={p.numero_documento}
                  onClick={() => navigate(`/pacientes/${p.numero_documento}`)}
                  className="cursor-pointer hover:bg-slate-100"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium" style={{ color: 'var(--hce-text)' }}>{nombreCompleto(p)}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
                      {p.tipo_documento} {p.numero_documento}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.edad ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.telefono || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">{p.tipo_usuario_nombre}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {p.ultima_atencion ? formatFecha(p.ultima_atencion) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatFecha(p.fecha_creacion)}</td>
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
          entityLabel="pacientes"
        />
      </div>
    </div>
  )
}
