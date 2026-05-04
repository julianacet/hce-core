import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ChevronRight, PlusCircle, Search, X } from 'lucide-react'
import { useEncuentros, type FiltrosEncuentro } from '../../api/encuentros'

export default function HistorialEncuentros() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [filtros, setFiltros] = useState<FiltrosEncuentro>({})
  const [form, setForm] = useState({ desde: '', hasta: '', diagnostico: '' })

  const { data: encuentros = [], isLoading, isError } = useEncuentros(id ?? '', filtros)

  function aplicar() {
    setFiltros({
      desde: form.desde || undefined,
      hasta: form.hasta || undefined,
      diagnostico: form.diagnostico || undefined,
    })
  }

  function limpiar() {
    setForm({ desde: '', hasta: '', diagnostico: '' })
    setFiltros({})
  }

  const hayFiltros = !!(filtros.desde || filtros.hasta || filtros.diagnostico)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {isLoading ? 'Cargando...' : `${encuentros.length} encuentro(s)${hayFiltros ? ' (filtrado)' : ''}`}
        </p>
        <button
          onClick={() => navigate(`/pacientes/${id}/encuentros/nuevo`)}
          className="btn-primary"
        >
          <PlusCircle size={15} />
          Nuevo encuentro
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Desde</label>
          <input type="date" value={form.desde} onChange={(e) => setForm((p) => ({ ...p, desde: e.target.value }))}
            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Hasta</label>
          <input type="date" value={form.hasta} onChange={(e) => setForm((p) => ({ ...p, hasta: e.target.value }))}
            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-slate-400 mb-1">Diagnóstico</label>
          <input type="text" value={form.diagnostico} placeholder="Código CIE-10 o descripción"
            onChange={(e) => setForm((p) => ({ ...p, diagnostico: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && aplicar()}
            className="input-hce" />
        </div>
        <div className="flex gap-2">
          <button onClick={aplicar}
            className="btn-primary">
            <Search size={13} /> Filtrar
          </button>
          {hayFiltros && (
            <button onClick={limpiar}
              className="btn-secondary">
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {isError && (
            <div className="px-5 py-8 text-center text-sm text-red-500">
              Error al cargar encuentros. Intenta de nuevo.
            </div>
          )}

          {!isLoading && !isError && encuentros.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              No hay encuentros registrados para este paciente.
            </div>
          )}

          {encuentros.map((e) => (
            <button
              key={e.encuentro_id}
              onClick={() => navigate(`/pacientes/${id}/encuentros/${e.encuentro_id}`)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {e.codigo_diagnostico_principal}
                  {e.descripcion_diagnostico ? ` - ${e.descripcion_diagnostico}` : ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {e.motivo_consulta} · {new Date(e.fecha_atencion).toLocaleString('es-CO')} · v{e.numero_version}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
