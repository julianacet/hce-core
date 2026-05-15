import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search, Receipt } from 'lucide-react'
import { useFacturas } from '../api/facturas'
import { DEBOUNCE_MS } from '../utils/constants'

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)
}

export default function Facturas() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [query, setQuery] = useState<string | undefined>(undefined)

  useEffect(() => {
    const t = setTimeout(() => setQuery(busqueda.trim() || undefined), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [busqueda])

  const { data: facturas = [], isLoading } = useFacturas(query)

  return (
    <div className="page-hce">
      <div className="page-header">
        <div>
          <h2 className="page-title">Facturación</h2>
          <p className="page-desc">Facturas emitidas a pacientes</p>
        </div>
        <button onClick={() => navigate('/facturas/nueva')} className="btn-primary">
          <Plus size={15} />
          Nueva factura
        </button>
      </div>

      <div className="card-hce overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o documento del paciente…"
              className="input-hce pl-9"
            />
          </div>
        </div>

        {isLoading && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Cargando...</div>
        )}

        {!isLoading && facturas.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Receipt size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">
              {query ? `Sin resultados para "${query}"` : 'No hay facturas registradas.'}
            </p>
          </div>
        )}

        {!isLoading && facturas.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs text-slate-500 font-medium">Paciente</th>
                <th className="px-5 py-3 text-left text-xs text-slate-500 font-medium">Fecha</th>
                <th className="px-5 py-3 text-right text-xs text-slate-500 font-medium">Total</th>
                <th className="px-5 py-3 text-left text-xs text-slate-500 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facturas.map((f) => (
                <tr
                  key={f.factura_id}
                  onClick={() => navigate(`/facturas/${f.factura_id}`)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="text-sm text-slate-800">{f.paciente_nombre || f.paciente_documento}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{f.paciente_documento}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">
                    {new Date(f.fecha_creacion).toLocaleDateString('es-CO', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-slate-800">
                    {formatCOP(f.total)}
                  </td>
                  <td className="px-5 py-3">
                    {f.estado === 'anulada' ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Anulada
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Activa
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
