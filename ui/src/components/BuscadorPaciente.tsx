import { useState } from 'react'
import { Search, Filter, Trash2, Check, ChevronRight } from 'lucide-react'
import { usePacientesPaginados, type Paciente } from '../api/pacientes'
import { SelectorEps } from './SelectorEps'
import { useDebounced } from '../hooks/useDebounced'
import { DEBOUNCE_FILTROS_MS } from '../utils/constants'
import { nombreCompleto } from '../utils/paciente'

const TIPOS_USUARIO = [
  { value: '', label: 'Todos los tipos' },
  { value: '01', label: 'Contributivo' },
  { value: '02', label: 'Subsidiado' },
  { value: '03', label: 'Vinculado' },
  { value: '04', label: 'Particular' },
  { value: '05', label: 'Indígena' },
  { value: '06', label: 'No asegurado' },
]

type Props = {
  selectedDocumento: string | null
  onSelect: (p: Paciente) => void
}

export function BuscadorPaciente({ selectedDocumento, onSelect }: Props) {
  const [q, setQ] = useState('')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [filtros, setFiltros] = useState({
    tipo_usuario: '', genero: '', zona_residencia: '', eps: '', telefono: '',
    min_atencion: '', max_atencion: '',
  })
  const [epsResetKey, setEpsResetKey] = useState(0)

  const qDebounced = useDebounced(q)
  const filtrosDebounced = useDebounced(filtros, DEBOUNCE_FILTROS_MS)

  function setFiltro<K extends keyof typeof filtros>(key: K, value: string) {
    setFiltros(f => ({ ...f, [key]: value }))
  }

  function limpiarFiltros() {
    setFiltros({ tipo_usuario: '', genero: '', zona_residencia: '', eps: '', telefono: '', min_atencion: '', max_atencion: '' })
    setEpsResetKey(k => k + 1)
  }

  function toggleModo() {
    if (filtrosAbiertos) {
      limpiarFiltros()
      setFiltrosAbiertos(false)
    } else {
      setQ('')
      setFiltrosAbiertos(true)
    }
  }

  const hayFiltros = Object.values(filtros).some(v => v !== '')

  const { data, isLoading, isError } = usePacientesPaginados({
    q: qDebounced,
    page: 1,
    limit: 30,
    orden: 'nombre',
    dir: 'asc',
    ...filtrosDebounced,
  })

  const resultados = data?.pacientes ?? []
  const total = data?.total ?? 0

  return (
    <div className="card-hce overflow-hidden mb-4">
      <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: 'var(--hce-border)' }}>
        <div className="flex gap-2">
          {!filtrosAbiertos && (
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Nombre, apellido, documento o teléfono…"
                className="input-hce pl-9"
                autoFocus
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
            {hayFiltros && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
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
                onChange={v => setFiltro('eps', v)}
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

      <div className="border-t" style={{ borderColor: 'var(--hce-border)' }}>
        <div className="px-5 py-2 flex items-center justify-between" style={{ background: 'var(--hce-bg)' }}>
          <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
            {isLoading ? 'Buscando…' : `${total} paciente${total !== 1 ? 's' : ''} — haga clic en uno para seleccionarlo`}
          </p>
        </div>
        <div className="overflow-y-auto divide-y" style={{ maxHeight: '14rem', borderColor: 'var(--hce-border)' }}>
          {isError && (
            <div className="px-5 py-6 text-center text-sm text-red-500">Error al cargar. Intente de nuevo.</div>
          )}
          {!isLoading && !isError && resultados.length === 0 && (
            <div className="px-5 py-6 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>
              {(qDebounced || hayFiltros) ? 'Sin resultados para esa búsqueda.' : 'Escriba para buscar un paciente.'}
            </div>
          )}
          {resultados.map(p => {
            const seleccionado = selectedDocumento === p.numero_documento
            return (
              <button
                key={p.numero_documento}
                onClick={() => onSelect(p)}
                className={`w-full px-5 py-3 flex items-center gap-3 text-left transition-colors${!seleccionado ? ' hover:bg-[var(--hce-bg)]' : ''}`}
                style={{ background: seleccionado ? 'var(--hce-primary)' : undefined }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: seleccionado ? '#fff' : 'var(--hce-text)' }}>
                    {nombreCompleto(p)}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: seleccionado ? 'rgba(255,255,255,0.75)' : 'var(--hce-text-muted)' }}>
                    {p.tipo_documento} {p.numero_documento}
                    {p.telefono ? ` · ${p.telefono}` : ''}
                    {p.edad != null ? ` · ${p.edad} años` : ''}
                  </p>
                </div>
                {seleccionado
                  ? <Check size={15} className="shrink-0" style={{ color: '#fff' }} />
                  : <ChevronRight size={14} className="shrink-0 text-slate-300" />
                }
              </button>
            )
          })}
        </div>
        {total > 30 && (
          <p className="px-5 py-2 text-xs text-center border-t" style={{ borderColor: 'var(--hce-border)', color: 'var(--hce-text-muted)' }}>
            Mostrando 30 de {total} — refina la búsqueda para ver más
          </p>
        )}
      </div>
    </div>
  )
}
