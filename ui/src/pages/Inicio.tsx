import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  UserSearch, Users, AlertTriangle, Activity,
  CalendarCheck, Star, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useDashboard } from '../api/dashboard'
import { useAuditoria } from '../api/auditoria'
import { useTema } from '../context/TemaContext'

const colorAccion: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

function Tarjeta({
  label,
  value,
  sub,
  icon: Icon,
  color = 'text-blue-700',
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`mt-0.5 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-sm text-slate-600 mt-1">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Inicio() {
  const navigate = useNavigate()
  const { tema } = useTema()
  const { data, isLoading } = useDashboard()
  const { data: logs = [] } = useAuditoria(30, 0)
  const [logAbierto, setLogAbierto] = useState(false)

  return (
    <div className="page-hce space-y-6">

      {/* Banner principal */}
      <div
        className="rounded-2xl flex items-center justify-between px-10 py-8 min-h-40 overflow-hidden relative"
        style={{ backgroundColor: tema.colorPrimario }}
      >
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white leading-tight">
            {tema.nombreSistema}
          </h1>
          <p className="text-white/70 text-sm mt-1">Historia Clínica Electrónica</p>
          <button
            onClick={() => navigate('/nueva-consulta')}
            className="mt-5 flex items-center gap-2 bg-white text-sm font-medium px-4 py-2 rounded-md transition-colors hover:bg-white/90"
            style={{ color: tema.colorPrimario }}
          >
            <UserSearch size={15} />
            Nueva consulta
          </button>
        </div>

        {tema.logoBase64 ? (
          <img
            src={tema.logoBase64}
            alt="Logo del consultorio"
            className="h-28 w-auto object-contain relative z-10 opacity-95"
          />
        ) : (
          <div className="h-28 w-28 rounded-full bg-white/10 flex items-center justify-center relative z-10">
            <span className="text-5xl font-bold text-white/30 select-none">
              {tema.nombreSistema.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Tarjetas de resumen */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <Tarjeta
            label="Encuentros hoy"
            value={data?.encuentros_hoy ?? 0}
            icon={CalendarCheck}
            color="text-blue-700"
          />
          <Tarjeta
            label="Pacientes este mes"
            value={data?.pacientes_mes ?? 0}
            icon={Users}
            color="text-indigo-600"
          />
          <Tarjeta
            label="Facturado este mes"
            value={formatCOP(data?.facturado_mes ?? 0)}
            icon={TrendingUp}
            color="text-emerald-600"
          />
          <Tarjeta
            label="Satisfacción promedio"
            value={data?.satisfaccion_promedio != null ? `${data.satisfaccion_promedio.toFixed(1)} / 5` : '—'}
            sub={data?.satisfaccion_promedio == null ? 'Sin encuestas aún' : undefined}
            icon={Star}
            color="text-amber-500"
          />
        </div>
      )}

      {/* Alerta de inventario — solo si hay insumos con stock bajo */}
      {(data?.insumos_stock_bajo.length ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Insumos con stock bajo</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {data!.insumos_stock_bajo.map((ins) => (
              <div key={ins.id} className="bg-white border border-amber-100 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-slate-700">{ins.nombre}</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {ins.stock_actual} {ins.unidad} disponibles · mínimo {ins.stock_minimo}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimos pacientes atendidos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <h3 className="text-sm font-medium text-slate-700">Últimos pacientes atendidos</h3>
          </div>
          <button
            onClick={() => navigate('/pacientes')}
            className="text-xs text-blue-700 hover:underline"
          >
            Ver todos
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Cargando...</div>
          )}
          {!isLoading && (data?.ultimos_pacientes.length ?? 0) === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              Sin encuentros registrados aún.
            </div>
          )}
          {data?.ultimos_pacientes.map((p) => (
            <button
              key={p.encuentro_id}
              onClick={() => navigate(`/pacientes/${p.paciente_documento}`)}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{p.nombre_paciente}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {p.codigo_diagnostico_principal}
                  {p.descripcion_diagnostico ? ` — ${p.descripcion_diagnostico}` : ''}
                </p>
              </div>
              <p className="text-xs text-slate-400 shrink-0 ml-4">
                {new Date(p.fecha_atencion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Log de auditoría — colapsable */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setLogAbierto((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-slate-400" />
            <h3 className="text-sm font-medium text-slate-700">Log de auditoría</h3>
          </div>
          {logAbierto ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </button>

        {logAbierto && (
          <div className="divide-y divide-slate-100">
            {logs.length === 0 && (
              <div className="px-5 py-6 text-center text-sm text-slate-400">Sin actividad registrada.</div>
            )}
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-center gap-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${colorAccion[log.accion] ?? 'bg-slate-100 text-slate-600'}`}>
                  {log.accion}
                </span>
                <span className="text-xs text-slate-400 font-mono shrink-0">{log.nombre_tabla}</span>
                <span className="text-xs text-slate-400 flex-1 truncate">{log.datos_nuevos ?? log.datos_anteriores ?? '—'}</span>
                <span className="text-xs text-slate-400 shrink-0">{log.usuario_id ?? '—'}</span>
                <span className="text-xs text-slate-400 shrink-0">
                  {new Date(log.fecha_cambio).toLocaleString('es-CO')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
