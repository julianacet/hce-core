import { useEffect, useRef, useState } from 'react'
import { Plus, X, CheckCircle } from 'lucide-react'
import {
  useAntecedentes,
  useGuardarAntecedentes,
  type ListaCampo,
  type PreguntaConRespuesta,
  type RespuestaInput,
} from '../api/antecedentes'

type AnswerState = { valor: string; detalle: string }

// Anchos de columna de la fila de pregunta (suman ~100% con el gap)
const W_LABEL    = '42%'
const W_RESPUESTA = '22%'
// La columna de detalle ocupa el resto (flex-1)

const ESTADOS_BOOLEANO = [
  { value: 'si',        label: 'Sí' },
  { value: 'no',        label: 'No' },
  { value: 'no_sabe',   label: 'No sabe' },
  { value: 'no_aplica', label: 'No aplica' },
]

const LABELS_BOOLEANO: Record<string, string> = {
  si: 'Sí', no: 'No', no_sabe: 'No sabe', no_aplica: 'No aplica',
}

function normalizarBooleano(v: string): string {
  if (v === 'true') return 'si'
  if (v === 'false') return 'no'
  return v
}

const CATEGORIAS = [
  { key: 'personal',      label: 'Personales' },
  { key: 'familiar',      label: 'Familiares' },
  { key: 'farmacologico', label: 'Farmacológicos' },
  { key: 'alergico',      label: 'Alérgicos' },
  { key: 'quirurgico',    label: 'Quirúrgicos' },
  { key: 'habito',        label: 'Hábitos' },
  { key: 'gineco',        label: 'Gineco-obstétrico' },
]

// ── Read-only display ─────────────────────────────────────────────────────────

function PreguntaReadOnly({ pregunta, answer }: { pregunta: PreguntaConRespuesta; answer: AnswerState }) {
  const { tipo_respuesta, opciones } = pregunta
  if (!answer.valor) return null

  if (tipo_respuesta === 'lista') {
    let items: Record<string, string>[] = []
    try { items = JSON.parse(answer.valor) } catch { return null }
    if (!items.length) return null
    const campos = opciones as ListaCampo[]
    return (
      <div className="py-2.5 border-b border-slate-100 last:border-0 last:pb-0 space-y-1.5">
        <p className="text-sm text-slate-500">{pregunta.texto}</p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className="bg-slate-100 rounded-full px-3 py-1 text-sm text-slate-700">
              {campos.map(c => item[c.campo]).filter(Boolean).join(' · ')}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const display = tipo_respuesta === 'booleano' ? (LABELS_BOOLEANO[answer.valor] ?? answer.valor) : answer.valor

  return (
    <div className="flex items-baseline gap-3 py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500 shrink-0" style={{ width: W_LABEL }}>{pregunta.texto}</span>
      <span className="text-sm text-slate-800 shrink-0" style={{ width: W_RESPUESTA }}>{display}</span>
      {answer.detalle && (
        <span className="flex-1 text-xs text-slate-400 leading-relaxed">{answer.detalle}</span>
      )}
    </div>
  )
}

// ── Lista type field ──────────────────────────────────────────────────────────

function ListaField({ campos, valor, onChange }: {
  campos: ListaCampo[]
  valor: string
  onChange: (v: string) => void
}) {
  const items: Record<string, string>[] = (() => {
    try { return JSON.parse(valor || '[]') } catch { return [] }
  })()
  const [draft, setDraft] = useState<Record<string, string>>({})

  function agregar() {
    const requeridos = campos.filter(c => c.requerido)
    if (requeridos.some(c => !draft[c.campo]?.trim())) return
    onChange(JSON.stringify([...items, draft]))
    setDraft({})
  }

  function eliminar(idx: number) {
    const updated = items.filter((_, i) => i !== idx)
    onChange(updated.length > 0 ? JSON.stringify(updated) : '')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1 text-sm text-slate-700">
            <span>{campos.map(c => item[c.campo]).filter(Boolean).join(' · ')}</span>
            <button type="button" onClick={() => eliminar(i)} className="text-slate-400 hover:text-red-500 transition-colors">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-end">
        {campos.map(c => (
          <div key={c.campo} className={c.requerido ? 'flex-1' : 'w-28'}>
            <label className="label-hce">{c.label}{c.requerido ? '' : ' (opcional)'}</label>
            <input className="input-hce text-sm"
              value={draft[c.campo] ?? ''}
              onChange={e => setDraft(d => ({ ...d, [c.campo]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }} />
          </div>
        ))}
        <button
          type="button"
          className="btn-primary h-10 px-3 shrink-0"
          onClick={agregar}
          disabled={campos.filter(c => c.requerido).some(c => !draft[c.campo]?.trim())}>
          <Plus size={15} />
        </button>
      </div>
    </div>
  )
}

// ── Single question field ─────────────────────────────────────────────────────

function PreguntaField({ pregunta, answer, onValor, onDetalle }: {
  pregunta: PreguntaConRespuesta
  answer: AnswerState
  onValor: (v: string) => void
  onDetalle: (v: string) => void
}) {
  const { tipo_respuesta, placeholder_detalle, opciones } = pregunta

  // Lista ocupa toda la fila — layout propio
  if (tipo_respuesta === 'lista') {
    return (
      <div className="py-2.5 border-b border-slate-100 last:border-0 last:pb-0 space-y-2">
        <p className="text-sm text-slate-700">{pregunta.texto}</p>
        <ListaField
          campos={opciones as ListaCampo[]}
          valor={answer.valor}
          onChange={onValor} />
      </div>
    )
  }

  function renderInput() {
    if (tipo_respuesta === 'booleano') return (
      <select
        className="input-hce text-sm"
        value={answer.valor}
        onChange={e => onValor(e.target.value)}
      >
        <option value="">— sin responder —</option>
        {ESTADOS_BOOLEANO.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    )
    if (tipo_respuesta === 'opciones') return (
      <select className="input-hce text-sm"
        value={answer.valor}
        onChange={e => onValor(e.target.value)}>
        <option value="">— seleccionar —</option>
        {(opciones as string[]).map(op => (
          <option key={op} value={op}>{op}</option>
        ))}
      </select>
    )
    if (tipo_respuesta === 'numero') return (
      <input type="text" inputMode="decimal" className="input-hce text-sm"
        value={answer.valor}
        onChange={e => onValor(e.target.value.replace(',', '.'))} />
    )
    if (tipo_respuesta === 'fecha') return (
      <input type="date" className="input-hce text-sm"
        value={answer.valor}
        onChange={e => onValor(e.target.value)} />
    )
    // texto
    return (
      <input className="input-hce text-sm" value={answer.valor}
        onChange={e => onValor(e.target.value)} />
    )
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
      <p className="text-sm text-slate-700 shrink-0 leading-snug" style={{ width: W_LABEL }}>{pregunta.texto}</p>
      <div className="shrink-0" style={{ width: W_RESPUESTA }}>
        {renderInput()}
      </div>
      <div className="flex-1">
        <textarea
          className="input-hce text-sm resize-none w-full"
          rows={1}
          placeholder={placeholder_detalle || 'Observaciones…'}
          value={answer.detalle}
          onChange={e => onDetalle(e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AntecedentesTab({
  documento,
  genero,
  readOnly = false,
}: {
  documento: string
  genero?: string
  readOnly?: boolean
}) {
  const { data, isLoading } = useAntecedentes(documento)
  const guardar = useGuardarAntecedentes(documento)
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [guardado, setGuardado] = useState(false)
  const [subTab, setSubTab] = useState<string>('')
  const dataRef = useRef<typeof data | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!data || dataRef.current === data) return
    dataRef.current = data
    initialized.current = false
    const init: Record<string, AnswerState> = {}
    Object.values(data).flat().forEach(p => {
      init[p.id] = { valor: normalizarBooleano(p.valor ?? ''), detalle: p.detalle ?? '' }
    })
    setAnswers(init)
    setTimeout(() => { initialized.current = true }, 0)
  }, [data])

  useEffect(() => {
    if (!initialized.current || readOnly) return
    const t = setTimeout(async () => {
      const respuestas: RespuestaInput[] = Object.entries(answers)
        .filter(([, a]) => a.valor !== '')
        .map(([id, a]) => ({ pregunta_id: id, valor: a.valor, detalle: a.detalle || undefined }))
      try {
        await guardar.mutateAsync(respuestas)
        setGuardado(true)
        setTimeout(() => setGuardado(false), 2000)
      } catch { /* silent */ }
    }, 800)
    return () => clearTimeout(t)
  }, [answers])

  function setValor(id: string, valor: string) {
    setAnswers(prev => ({ ...prev, [id]: { ...prev[id], valor } }))
  }

  function setDetalle(id: string, detalle: string) {
    setAnswers(prev => ({ ...prev, [id]: { ...prev[id], detalle } }))
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400">Cargando antecedentes...</p>
  }

  const esGineco = genero === 'F' || genero === 'X'
  const cats = CATEGORIAS.filter(c => c.key !== 'gineco' || esGineco)

  // En modo lectura solo mostramos tabs con al menos una respuesta
  const tabs = cats
    .map(({ key, label }) => {
      const preguntas = data?.[key] ?? []
      const tieneRespuestas = preguntas.some(p => !!answers[p.id]?.valor)
      return { key, label, preguntas, tieneRespuestas }
    })
    .filter(c => c.preguntas.length > 0 && (!readOnly || c.tieneRespuestas))

  if (readOnly && tabs.length === 0) {
    return <p className="text-sm text-slate-400">Sin antecedentes registrados para este paciente.</p>
  }

  const tabActivo = subTab && tabs.some(t => t.key === subTab)
    ? subTab
    : tabs[0]?.key ?? ''

  const preguntasActivas = tabs.find(t => t.key === tabActivo)?.preguntas ?? []
  const preguntasVisibles = readOnly
    ? preguntasActivas.filter(p => !!answers[p.id]?.valor)
    : preguntasActivas

  return (
    <div className="space-y-4">
      {!readOnly && (
        <p className="text-xs text-slate-400">
          Esta información pertenece al paciente y queda disponible en todas las consultas.
        </p>
      )}

      {/* Sub-tabs de categoría */}
      <div className="flex border-b border-slate-200">
        {tabs.map(({ key, label, tieneRespuestas }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubTab(key)}
            className="flex-1 py-2 text-xs whitespace-nowrap font-medium transition-colors border-b-2 -mb-px flex items-center justify-center gap-1.5"
            style={{
              borderBottomColor: tabActivo === key ? 'var(--hce-primary)' : 'transparent',
              color: tabActivo === key ? 'var(--hce-primary)' : 'var(--hce-text-muted)',
            }}
          >
            {label}
            {!readOnly && tieneRespuestas && (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--hce-primary)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Preguntas de la categoría activa */}
      <div className="space-y-0">
        {preguntasVisibles.length === 0 ? (
          <p className="text-sm text-slate-400">Sin datos registrados en esta categoría.</p>
        ) : preguntasVisibles.map(p => readOnly ? (
          <PreguntaReadOnly
            key={p.id}
            pregunta={p}
            answer={answers[p.id] ?? { valor: '', detalle: '' }}
          />
        ) : (
          <PreguntaField
            key={p.id}
            pregunta={p}
            answer={answers[p.id] ?? { valor: '', detalle: '' }}
            onValor={v => setValor(p.id, v)}
            onDetalle={d => setDetalle(p.id, d)}
          />
        ))}
      </div>

      {!readOnly && (
        <div className="flex justify-end items-center h-5">
          {guardar.isPending && (
            <span className="text-xs text-slate-400">Guardando...</span>
          )}
          {guardado && !guardar.isPending && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle size={12} /> Guardado
            </span>
          )}
        </div>
      )}
    </div>
  )
}
