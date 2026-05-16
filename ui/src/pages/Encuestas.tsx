import { useState, useMemo } from 'react'
import { ClipboardList, BarChart2, CheckCircle2 } from 'lucide-react'
import { Breadcrumb } from '../components/Breadcrumb'
import { SortButton, type SortDir } from '../components/SortButton'
import { useTabParam } from '../hooks/useTabParam'
import { useEncuestas, useEncuestaResumen, useCrearEncuesta } from '../api/encuestas'
import type { EncuestaInput } from '../api/encuestas'

type Tab = 'registrar' | 'resultados'

const DIMENSIONES: { key: keyof EncuestaInput & string; label: string }[] = [
  { key: 'facilidad_cita', label: 'Facilidad para obtener cita' },
  { key: 'tiempo_espera', label: 'Tiempo de espera' },
  { key: 'calidad_atencion', label: 'Calidad de la atención médica' },
  { key: 'comunicacion_medico', label: 'Comunicación del médico' },
  { key: 'claridad_informacion', label: 'Claridad de la información recibida' },
  { key: 'comodidad_instalaciones', label: 'Comodidad de las instalaciones' },
  { key: 'satisfaccion_general', label: 'Satisfacción general' },
]

const ETIQUETAS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente']

function PuntajeSelector({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          title={ETIQUETAS[n]}
          className={`w-9 h-9 rounded-md text-sm font-semibold border transition-colors ${
            value === n
              ? 'text-white'
              : 'border-slate-200 text-slate-500'
          }`}
          style={value === n
            ? { backgroundColor: 'var(--hce-primary)', borderColor: 'var(--hce-primary)' }
            : undefined}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

const FORM_INICIAL: EncuestaInput = {
  fecha_atencion: '',
  paciente_documento: '',
  facilidad_cita: 0,
  tiempo_espera: 0,
  calidad_atencion: 0,
  comunicacion_medico: 0,
  claridad_informacion: 0,
  comodidad_instalaciones: 0,
  satisfaccion_general: 0,
  recomendaria: true,
  comentarios: '',
}

function TabRegistrar() {
  const [form, setForm] = useState<EncuestaInput>(FORM_INICIAL)
  const [exito, setExito] = useState(false)
  const crear = useCrearEncuesta()

  function setDim(key: string, value: number) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const completo =
    form.fecha_atencion &&
    DIMENSIONES.every((d) => (form[d.key as keyof EncuestaInput] as number) >= 1)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!completo) return

    const payload: EncuestaInput = {
      ...form,
      paciente_documento: form.paciente_documento || undefined,
      comentarios: form.comentarios || undefined,
    }

    await crear.mutateAsync(payload)
    setForm(FORM_INICIAL)
    setExito(true)
    setTimeout(() => setExito(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {exito && (
        <div className="form-success">
          <CheckCircle2 size={16} />
          Encuesta registrada exitosamente.
        </div>
      )}

      <div className="card-hce p-6 space-y-5">
        <h3 className="card-title">Datos de la visita</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-hce">Fecha de atención</label>
            <input
              type="date"
              required
              value={form.fecha_atencion}
              onChange={(e) => setForm((f) => ({ ...f, fecha_atencion: e.target.value }))}
              className="input-hce"
            />
          </div>
          <div>
            <label className="label-hce">Documento del paciente <span className="text-slate-400">(opcional)</span></label>
            <input
              type="text"
              placeholder="Para seguimiento anónimo"
              value={form.paciente_documento}
              onChange={(e) => setForm((f) => ({ ...f, paciente_documento: e.target.value }))}
              className="input-hce"
            />
          </div>
        </div>
      </div>

      <div className="card-hce p-6 space-y-5">
        <div>
          <h3 className="card-title">Calificaciones</h3>
          <p className="text-xs text-slate-400 mt-0.5">1 = Muy malo · 5 = Excelente</p>
        </div>

        <div className="space-y-4">
          {DIMENSIONES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-slate-700 flex-1">{label}</label>
              <PuntajeSelector
                value={form[key as keyof EncuestaInput] as number}
                onChange={(v) => setDim(key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card-hce p-6 space-y-5">
        <h3 className="card-title">Recomendación</h3>

        <div>
          <p className="text-sm text-slate-700 mb-3">¿Recomendaría este consultorio a un familiar o amigo?</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, recomendaria: true }))}
              className={`px-5 py-2 rounded-md text-sm font-medium border transition-colors ${
                form.recomendaria ? 'text-white' : 'border-slate-200 text-slate-600'
              }`}
              style={form.recomendaria
                ? { backgroundColor: 'var(--hce-primary)', borderColor: 'var(--hce-primary)' }
                : undefined}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, recomendaria: false }))}
              className={`px-5 py-2 rounded-md text-sm font-medium border transition-colors ${
                !form.recomendaria ? 'text-white' : 'border-slate-200 text-slate-600'
              }`}
              style={!form.recomendaria
                ? { backgroundColor: 'var(--hce-primary)', borderColor: 'var(--hce-primary)' }
                : undefined}
            >
              No
            </button>
          </div>
        </div>

        <div>
          <label className="label-hce">Comentarios adicionales <span className="text-slate-400">(opcional)</span></label>
          <textarea
            rows={3}
            placeholder="Sugerencias, observaciones..."
            value={form.comentarios}
            onChange={(e) => setForm((f) => ({ ...f, comentarios: e.target.value }))}
            className="input-hce resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!completo || crear.isPending}
          className="btn-primary"
        >
          {crear.isPending ? 'Guardando...' : 'Registrar encuesta'}
        </button>
      </div>
    </form>
  )
}

function Barra({ valor, max = 5 }: { valor: number; max?: number }) {
  const pct = Math.round((valor / max) * 100)
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-[var(--hce-primary)]' : 'bg-amber-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="card-title w-8 text-right">
        {valor.toFixed(1)}
      </span>
    </div>
  )
}

type OrdenEncuesta = 'fecha' | 'documento' | 'facilidad_cita' | 'tiempo_espera' | 'calidad_atencion' |
  'comunicacion_medico' | 'claridad_informacion' | 'comodidad_instalaciones' | 'satisfaccion_general' | 'recomendaria'

function TabResultados() {
  const { data: resumen, isLoading: cargandoRes } = useEncuestaResumen()
  const { data: encuestas = [], isLoading: cargandoLista } = useEncuestas()
  const [orden, setOrden] = useState<OrdenEncuesta>('fecha')
  const [dir, setDir] = useState<SortDir>('desc')

  function ordenarPor(col: OrdenEncuesta) {
    if (orden === col) {
      setDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setOrden(col)
      setDir('desc')
    }
  }

  const encuestasOrdenadas = useMemo(() => {
    return [...encuestas].sort((a, b) => {
      let cmp = 0
      if (orden === 'fecha') {
        cmp = a.fecha_atencion < b.fecha_atencion ? -1 : a.fecha_atencion > b.fecha_atencion ? 1 : 0
      } else if (orden === 'documento') {
        cmp = (a.paciente_documento ?? '').localeCompare(b.paciente_documento ?? '', 'es')
      } else if (orden === 'recomendaria') {
        cmp = (a.recomendaria === b.recomendaria ? 0 : a.recomendaria ? 1 : -1)
      } else {
        cmp = (a[orden] as number) - (b[orden] as number)
      }
      return dir === 'asc' ? cmp : -cmp
    })
  }, [encuestas, orden, dir])

  if (cargandoRes || cargandoLista) {
    return <div className="text-sm text-slate-400 py-6">Cargando resultados...</div>
  }

  if (!resumen || resumen.total === 0) {
    return (
      <div className="text-sm text-slate-400 py-8 text-center">
        Aún no hay encuestas registradas.
      </div>
    )
  }

  const dimensionLabels: { key: keyof typeof resumen; label: string }[] = [
    { key: 'facilidad_cita', label: 'Facilidad para obtener cita' },
    { key: 'tiempo_espera', label: 'Tiempo de espera' },
    { key: 'calidad_atencion', label: 'Calidad de la atención' },
    { key: 'comunicacion_medico', label: 'Comunicación del médico' },
    { key: 'claridad_informacion', label: 'Claridad de la información' },
    { key: 'comodidad_instalaciones', label: 'Comodidad de instalaciones' },
    { key: 'satisfaccion_general', label: 'Satisfacción general' },
  ]

  return (
    <div className="space-y-4">
      {/* Tarjetas resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{resumen.total}</p>
          <p className="text-xs text-slate-400 mt-0.5">Encuestas recibidas</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{resumen.satisfaccion_general.toFixed(1)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Satisfacción general / 5</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{Math.round(resumen.porcentaje_nps)}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Recomendaría el consultorio</p>
        </div>
      </div>

      {/* Promedios por dimensión */}
      <div className="card-hce p-6 space-y-4">
        <h3 className="card-title">Promedio por dimensión</h3>
        <div className="space-y-3">
          {dimensionLabels.map(({ key, label }) => (
            <div key={key}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <Barra valor={resumen[key] as number} />
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de respuestas */}
      <div className="card-hce overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="card-title">Respuestas individuales</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="thead-sticky border-b" style={{ borderColor: 'var(--hce-border)' }}>
              <tr>
                <th className="th-hce px-4">
                  <SortButton activo={orden === 'fecha'} dir={dir} onClick={() => ordenarPor('fecha')}>Fecha atención</SortButton>
                </th>
                <th className="th-hce px-4">
                  <SortButton activo={orden === 'documento'} dir={dir} onClick={() => ordenarPor('documento')}>Documento</SortButton>
                </th>
                <th className="th-hce px-2 text-center" title="Facilidad cita">
                  <SortButton activo={orden === 'facilidad_cita'} dir={dir} onClick={() => ordenarPor('facilidad_cita')}>FC</SortButton>
                </th>
                <th className="th-hce px-2 text-center" title="Tiempo espera">
                  <SortButton activo={orden === 'tiempo_espera'} dir={dir} onClick={() => ordenarPor('tiempo_espera')}>TE</SortButton>
                </th>
                <th className="th-hce px-2 text-center" title="Calidad atención">
                  <SortButton activo={orden === 'calidad_atencion'} dir={dir} onClick={() => ordenarPor('calidad_atencion')}>CA</SortButton>
                </th>
                <th className="th-hce px-2 text-center" title="Comunicación médico">
                  <SortButton activo={orden === 'comunicacion_medico'} dir={dir} onClick={() => ordenarPor('comunicacion_medico')}>CM</SortButton>
                </th>
                <th className="th-hce px-2 text-center" title="Claridad información">
                  <SortButton activo={orden === 'claridad_informacion'} dir={dir} onClick={() => ordenarPor('claridad_informacion')}>CI</SortButton>
                </th>
                <th className="th-hce px-2 text-center" title="Comodidad instalaciones">
                  <SortButton activo={orden === 'comodidad_instalaciones'} dir={dir} onClick={() => ordenarPor('comodidad_instalaciones')}>CO</SortButton>
                </th>
                <th className="th-hce px-2 text-center" title="Satisfacción general">
                  <SortButton activo={orden === 'satisfaccion_general'} dir={dir} onClick={() => ordenarPor('satisfaccion_general')}>SG</SortButton>
                </th>
                <th className="th-hce px-2 text-center">
                  <SortButton activo={orden === 'recomendaria'} dir={dir} onClick={() => ordenarPor('recomendaria')}>¿Rec.?</SortButton>
                </th>
                <th className="th-hce px-4">Comentarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {encuestasOrdenadas.map((enc) => (
                <tr key={enc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{enc.fecha_atencion}</td>
                  <td className="px-4 py-2 text-slate-500">{enc.paciente_documento ?? '—'}</td>
                  {[enc.facilidad_cita, enc.tiempo_espera, enc.calidad_atencion,
                    enc.comunicacion_medico, enc.claridad_informacion,
                    enc.comodidad_instalaciones, enc.satisfaccion_general].map((v, i) => (
                    <td key={i} className="px-2 py-2 text-center font-medium text-slate-700">{v}</td>
                  ))}
                  <td className="px-2 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${enc.recomendaria ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {enc.recomendaria ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 max-w-[200px] truncate">
                    {enc.comentarios ?? '—'}
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

export default function Encuestas() {
  const [tab, setTab] = useTabParam('tab', 'registrar' as Tab, ['registrar', 'resultados'] as const)

  return (
    <div className="page-hce space-y-6">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Encuestas' }]} />
      <div className="page-header">
        <div>
          <h2 className="page-title">Encuestas de satisfacción</h2>
          <p className="page-desc">Registro de percepción del servicio por parte de los pacientes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { id: 'registrar', label: 'Registrar encuesta', icon: ClipboardList },
          { id: 'resultados', label: 'Resultados', icon: BarChart2 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`tab-hce ${tab === id ? 'tab-hce--active' : 'tab-hce--inactive'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'registrar' && <TabRegistrar />}
      {tab === 'resultados' && <TabResultados />}
    </div>
  )
}
