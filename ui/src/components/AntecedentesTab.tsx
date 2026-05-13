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
  { key: 'personal',       label: 'Personales patológicos' },
  { key: 'familiar',       label: 'Familiares' },
  { key: 'farmacologico',  label: 'Farmacológicos — medicamentos actuales' },
  { key: 'alergico',       label: 'Alérgicos' },
  { key: 'quirurgico',     label: 'Quirúrgicos' },
  { key: 'habito',         label: 'Hábitos y tóxicos' },
  { key: 'gineco',         label: 'Gineco-obstétrico' },
]

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-xl p-5 space-y-4">
      <h4 className="text-sm font-semibold text-slate-600">{titulo}</h4>
      {children}
    </div>
  )
}

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
      <div className="space-y-1.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
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
    <div className="flex gap-4 items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500 flex-1">{pregunta.texto}</span>
      <div className="text-right shrink-0">
        <span className="text-sm text-slate-800">{display}</span>
        {answer.detalle && <p className="text-xs text-slate-400 mt-0.5">{answer.detalle}</p>}
      </div>
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
  const { tipo_respuesta, tiene_detalle, placeholder_detalle, opciones } = pregunta
  const mostrarDetalle = tiene_detalle && answer.valor === 'si'

  return (
    <div className="space-y-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <p className="text-sm text-slate-700">{pregunta.texto}</p>

      {tipo_respuesta === 'booleano' && (
        <select
          className="input-hce text-sm w-44"
          value={answer.valor}
          onChange={e => { onValor(e.target.value); if (!e.target.value) onDetalle('') }}
        >
          <option value="">— sin responder —</option>
          {ESTADOS_BOOLEANO.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      )}

      {tipo_respuesta === 'opciones' && (
        <select className="input-hce text-sm max-w-xs"
          value={answer.valor}
          onChange={e => onValor(e.target.value)}>
          <option value="">— seleccionar —</option>
          {(opciones as string[]).map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      )}

      {tipo_respuesta === 'texto' && (
        <input className="input-hce text-sm" value={answer.valor}
          onChange={e => onValor(e.target.value)} />
      )}

      {tipo_respuesta === 'numero' && (
        <input type="number" className="input-hce text-sm w-32" value={answer.valor}
          onChange={e => onValor(e.target.value)} />
      )}

      {tipo_respuesta === 'fecha' && (
        <input type="date" className="input-hce text-sm w-44" value={answer.valor}
          onChange={e => onValor(e.target.value)} />
      )}

      {tipo_respuesta === 'lista' && (
        <ListaField
          campos={opciones as ListaCampo[]}
          valor={answer.valor}
          onChange={onValor} />
      )}

      {mostrarDetalle && (
        <textarea
          className="input-hce text-sm resize-none"
          rows={2}
          placeholder={placeholder_detalle ?? 'Detalles...'}
          value={answer.detalle}
          onChange={e => onDetalle(e.target.value)} />
      )}
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
  const dataRef = useRef<typeof data | null>(null)

  useEffect(() => {
    if (!data || dataRef.current === data) return
    dataRef.current = data
    const init: Record<string, AnswerState> = {}
    Object.values(data).flat().forEach(p => {
      init[p.id] = { valor: normalizarBooleano(p.valor ?? ''), detalle: p.detalle ?? '' }
    })
    setAnswers(init)
  }, [data])

  function setValor(id: string, valor: string) {
    setAnswers(prev => ({ ...prev, [id]: { ...prev[id], valor } }))
  }

  function setDetalle(id: string, detalle: string) {
    setAnswers(prev => ({ ...prev, [id]: { ...prev[id], detalle } }))
  }

  async function handleGuardar() {
    const respuestas: RespuestaInput[] = Object.entries(answers)
      .filter(([, a]) => a.valor !== '')
      .map(([id, a]) => ({
        pregunta_id: id,
        valor: a.valor,
        detalle: a.detalle || undefined,
      }))
    await guardar.mutateAsync(respuestas)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400">Cargando antecedentes...</p>
  }

  const esGineco = genero === 'F' || genero === 'X'
  const cats = CATEGORIAS.filter(c => c.key !== 'gineco' || esGineco)

  const categoriasVisibles = cats
    .map(({ key, label }) => {
      const preguntas = (data?.[key] ?? []).filter(p =>
        readOnly ? !!answers[p.id]?.valor : true
      )
      return { key, label, preguntas }
    })
    .filter(c => c.preguntas.length > 0)

  if (readOnly && categoriasVisibles.length === 0) {
    return <p className="text-sm text-slate-400">Sin antecedentes registrados para este paciente.</p>
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <p className="text-xs text-slate-400">
          Esta información pertenece al paciente y queda disponible en todas las consultas.
        </p>
      )}

      {categoriasVisibles.map(({ key, label, preguntas }) => (
        <Seccion key={key} titulo={label}>
          {preguntas.map(p => readOnly ? (
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
        </Seccion>
      ))}

      {!readOnly && (
        <div className="flex justify-end items-center gap-3 pt-2">
          {guardado && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle size={15} /> Guardado
            </span>
          )}
          <button type="button" className="btn-primary" onClick={handleGuardar} disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando...' : 'Guardar antecedentes'}
          </button>
        </div>
      )}
    </div>
  )
}
