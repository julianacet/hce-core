import { useNavigate } from 'react-router'
import {
  Users, CalendarCheck, Star, TrendingUp,
  Package, Clock, AlertTriangle, CalendarDays, Stethoscope,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useDashboard } from '../api/dashboard'
import { useTema } from '../context/TemaContext'

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(value)
}

function fmtFechaCorta(iso: string): string {
  const [, mes, dia] = iso.split('-')
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(dia)} ${meses[parseInt(mes) - 1]}`
}

function fmtHora(hora: string): string {
  return hora.slice(0, 5)
}

const COLOR_ESTADO: Record<string, string> = {
  programada: 'bg-[var(--hce-primary-soft)] text-[var(--hce-primary)]',
  cancelada:  'bg-red-100 text-red-600',
}

const LABEL_ESTADO: Record<string, string> = {
  programada: 'Programada',
  cancelada:  'Cancelada',
}

function Tarjeta({
  label, value, sub, icon: Icon,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType
}) {
  return (
    <div className="card-hce p-5 flex flex-col items-center text-center gap-2">
      <Icon size={20} style={{ color: 'var(--hce-primary)' }} />
      <p className="text-2xl font-bold leading-none" style={{ color: 'var(--hce-text)' }}>{value}</p>
      <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>{label}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>{sub}</p>}
    </div>
  )
}

export default function Inicio() {
  const navigate = useNavigate()
  const { tema } = useTema()
  const { data, isLoading } = useDashboard()

  const citasHoy      = data?.citas_hoy              ?? []
  const consultasDias = data?.consultas_por_dia       ?? []
  const topDiag       = data?.top_diagnosticos        ?? []
  const stockBajo     = data?.insumos_stock_bajo      ?? []
  const porVencer     = data?.insumos_proximos_vencer ?? []
  const ultimosPac    = data?.ultimos_pacientes       ?? []



  return (
    <div className="page-hce space-y-6">

      {/* ── Banner ──────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl flex items-center justify-between px-10 py-8 min-h-40 overflow-hidden relative"
        style={{ backgroundColor: tema.colorPrimario }}
      >
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white leading-tight">{tema.nombreSistema}</h1>
          <p className="text-white/70 text-sm mt-1">{tema.subtituloSidebar}</p>
        </div>
        {tema.logoBase64 ? (
          <img src={tema.logoBase64} alt="Logo" className="h-28 w-auto object-contain relative z-10 opacity-95" />
        ) : (
          <div className="h-28 w-28 rounded-full bg-white/10 flex items-center justify-center relative z-10">
            <span className="text-5xl font-bold text-white/30 select-none">{tema.nombreSistema.charAt(0)}</span>
          </div>
        )}
      </div>

      {/* ── Citas de hoy ─────────────────────────────────────────────────── */}
      <div className="card-hce overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--hce-border)' }}>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} style={{ color: 'var(--hce-text-muted)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--hce-text)' }}>
              Citas de hoy
              {citasHoy.length > 0 && (
                <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full bg-[var(--hce-primary-soft)] text-[var(--hce-primary)]">
                  {citasHoy.length}
                </span>
              )}
            </h3>
          </div>
          <button onClick={() => navigate('/agenda')} className="text-xs hover:underline" style={{ color: tema.colorPrimario }}>
            Ver agenda completa →
          </button>
        </div>

        {isLoading ? (
          <div className="px-5 py-6 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>Cargando…</div>
        ) : citasHoy.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>
            Sin citas programadas para hoy.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--hce-border)' }}>
            {citasHoy.map((cita) => (
              <div
                key={cita.id}
                className={`px-5 py-3 flex items-center gap-4 ${cita.paciente_documento ? 'cursor-pointer hover:bg-[var(--hce-bg)] transition-colors' : ''}`}
                onClick={() => cita.paciente_documento && navigate(`/pacientes/${cita.paciente_documento}`)}
              >
                <div className="flex items-center gap-1.5 shrink-0 w-14">
                  <Clock size={13} style={{ color: 'var(--hce-text-muted)' }} />
                  <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--hce-text)' }}>
                    {fmtHora(cita.hora_inicio)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--hce-text)' }}>{cita.paciente_nombre}</p>
                  {cita.motivo && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>{cita.motivo}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${COLOR_ESTADO[cita.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                  {LABEL_ESTADO[cita.estado] ?? cita.estado}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Métricas del mes ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-hce p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <Tarjeta label="Consultas hoy"       value={data?.encuentros_hoy ?? 0}                                icon={CalendarCheck} />
          <Tarjeta label="Pacientes este mes"  value={data?.pacientes_mes ?? 0}                                 icon={Users} />
          <Tarjeta label="Facturado este mes"  value={formatCOP(data?.facturado_mes ?? 0)}                      icon={TrendingUp} />
          <Tarjeta
            label="Satisfacción promedio"
            value={data?.satisfaccion_promedio != null ? `${data.satisfaccion_promedio.toFixed(1)} / 5` : '—'}
            sub={data?.satisfaccion_promedio == null ? 'Sin encuestas aún' : undefined}
            icon={Star}
          />
        </div>
      )}

      {/* ── Gráfica + Top diagnósticos ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Consultas últimos 30 días */}
        <div className="card-hce p-5 col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope size={16} style={{ color: 'var(--hce-text-muted)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--hce-text)' }}>Consultas — últimos 30 días</h3>
          </div>
          {consultasDias.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--hce-text-muted)' }}>
              Sin datos aún.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={consultasDias} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <XAxis
                  dataKey="fecha"
                  tickFormatter={fmtFechaCorta}
                  tick={{ fontSize: 10 }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                  stroke="var(--hce-text-muted)"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  stroke="var(--hce-text-muted)"
                />
                <Tooltip
                  formatter={(v) => [v, 'Consultas']}
                  labelFormatter={(label) => fmtFechaCorta(String(label))}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid var(--hce-border)',
                    background: 'var(--hce-card)',
                    color: 'var(--hce-text)',
                  }}
                />
                <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                  {consultasDias.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.fecha === new Date().toISOString().slice(0, 10)
                        ? tema.colorPrimario
                        : `${tema.colorPrimario}60`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top diagnósticos del mes */}
        <div className="card-hce p-5">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope size={16} style={{ color: 'var(--hce-text-muted)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--hce-text)' }}>Top diagnósticos del mes</h3>
          </div>
          {topDiag.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--hce-text-muted)' }}>
              Sin consultas este mes.
            </div>
          ) : (
            <div className="divide-y overflow-y-auto max-h-56" style={{ borderColor: 'var(--hce-border)' }}>
              {topDiag.map((d, i) => (
                <div key={d.codigo} className="flex items-center gap-3 py-2.5">
                  <span className="text-xs tabular-nums w-4 shrink-0 text-right" style={{ color: 'var(--hce-text-muted)' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono font-medium" style={{ color: 'var(--hce-primary)' }}>{d.codigo}</span>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>{d.descripcion || '—'}</p>
                  </div>
                  <span className="text-xs font-medium tabular-nums px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: 'var(--hce-primary-soft)', color: 'var(--hce-primary)' }}>
                    {d.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Alertas operativas ───────────────────────────────────────────── */}
      {(stockBajo.length > 0 || porVencer.length > 0) && (
        <div className="grid grid-cols-2 gap-4">

          {stockBajo.length > 0 && (
            <div className="rounded-xl border border-amber-200 p-4" style={{ background: '#fffbeb' }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">Stock bajo</h3>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-48">
                {stockBajo.map((ins) => (
                  <div key={ins.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                    <p className="text-sm font-medium text-slate-700 truncate">{ins.nombre}</p>
                    <p className="text-xs text-amber-700 ml-3 shrink-0">
                      {ins.stock_actual} / {ins.stock_minimo} {ins.unidad}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {porVencer.length > 0 && (
            <div className="rounded-xl border border-orange-200 p-4" style={{ background: '#fff7ed' }}>
              <div className="flex items-center gap-2 mb-3">
                <Package size={15} className="text-orange-600" />
                <h3 className="text-sm font-semibold text-orange-800">Próximos a vencer</h3>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-48">
                {porVencer.map((ins) => (
                  <div key={ins.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                    <p className="text-sm font-medium text-slate-700 truncate">{ins.nombre}</p>
                    <p className="text-xs text-orange-700 ml-3 shrink-0">
                      {ins.dias_restantes === 1 ? 'Mañana' : `${ins.dias_restantes} días`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Últimos pacientes atendidos ──────────────────────────────────── */}
      <div className="card-hce overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--hce-border)' }}>
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: 'var(--hce-text-muted)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--hce-text)' }}>Últimos pacientes atendidos</h3>
          </div>
          <button onClick={() => navigate('/pacientes')} className="text-xs hover:underline" style={{ color: tema.colorPrimario }}>
            Ver todos →
          </button>
        </div>
        <div className="divide-y overflow-y-auto max-h-64" style={{ borderColor: 'var(--hce-border)' }}>
          {isLoading && (
            <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>Cargando…</div>
          )}
          {!isLoading && ultimosPac.length === 0 && (
            <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>
              Sin consultas registradas aún.
            </div>
          )}
          {ultimosPac.map((p) => (
            <button
              key={p.encuentro_id}
              onClick={() => navigate(`/pacientes/${p.paciente_documento}`)}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-[var(--hce-bg)] transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--hce-text)' }}>{p.nombre_paciente}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
                  {p.codigo_diagnostico_principal}
                  {p.descripcion_diagnostico ? ` — ${p.descripcion_diagnostico}` : ''}
                </p>
              </div>
              <p className="text-xs shrink-0 ml-4" style={{ color: 'var(--hce-text-muted)' }}>
                {new Date(p.fecha_atencion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              </p>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
