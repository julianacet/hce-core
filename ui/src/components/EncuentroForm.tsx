import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEncuentros, type DiagnosticoItem, type ValorNormalNotas, type EncuentroInput } from '../api/encuentros'
import { useCamposClinicosActivos } from '../api/campos_clinicos'
import { useBuscarDiagnosticos } from '../api/diagnosticos'
import { DEBOUNCE_MS } from '../utils/constants'
import DiagnosticoSearch from './DiagnosticoSearch'
import { SignosVitalesForm, ExamenFisicoForm, RevisionSistemasForm } from './CampoClinicoForm'
import AntecedentesTab from './AntecedentesTab'
import { NavigationGuard } from './NavigationGuard'
import FormulaTab from './FormulaTab'
import { type Medicamento, medVacio } from './pdf/FormulaPDF'

type FormState = {
  motivo_consulta: string
  descripcion_ingreso: string
  plan_manejo: string
  finalidad_consulta: string
  causa_externa: string
  via_ingreso: string
  encuentro_padre_id: string
}

type PacienteInfo = {
  nombre: string
  documento: string
  tipoDocumento: string
  fechaNacimiento: string
}

export type FormulaData = {
  pos: Medicamento[]
  no_pos: Medicamento[]
}

type Props = {
  documento: string
  genero?: string
  paciente?: PacienteInfo
  onSubmit: (data: EncuentroInput, formulas: FormulaData) => Promise<void>
  isPending: boolean
  onCancelar?: () => void
}

type TabKey = 'motivo' | 'antecedentes' | 'signos' | 'revision' | 'examen' | 'diagnosticos' | 'formula'

const FORM_INICIAL: FormState = {
  motivo_consulta: '',
  descripcion_ingreso: '',
  plan_manejo: '',
  finalidad_consulta: '10',
  causa_externa: '13',
  via_ingreso: '02',
  encuentro_padre_id: '',
}

const TAB_LABELS: Record<TabKey, string> = {
  motivo: 'Motivo',
  antecedentes: 'Antecedentes',
  signos: 'Signos vitales',
  revision: 'Rev. por sistemas',
  examen: 'Examen físico',
  diagnosticos: 'Diagnósticos',
  formula: 'Fórmula',
}

// ── Picker de impresión diagnóstica (único resultado) ─────────────────────────
function ImpresionPicker({
  value,
  onChange,
}: {
  value: DiagnosticoItem | null
  onChange: (v: DiagnosticoItem | null) => void
}) {
  const [q, setQ] = useState('')
  const [qD, setQD] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setQD(q), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [q])

  const { data: res = [] } = useBuscarDiagnosticos(qD)

  useEffect(() => {
    setShowDrop(qD.trim().length >= 2 && res.length > 0)
  }, [res, qD])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setShowDrop(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm bg-violet-50 border-violet-200 text-violet-800">
        {value.codigo && <span className="font-mono text-xs opacity-70">{value.codigo}</span>}
        <span className="flex-1">{value.descripcion}</span>
        <button type="button" onClick={() => onChange(null)} className="opacity-60 hover:opacity-100 shrink-0">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => qD.length >= 2 && res.length > 0 && setShowDrop(true)}
        placeholder="Buscar por código CIE-10 o nombre…"
        className="input-hce"
      />
      {showDrop && (
        <div
          ref={dropRef}
          className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"
        >
          {res.map(r => (
            <button
              key={r.codigo}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                onChange({ tipo: 'impresion', codigo: r.codigo, descripcion: r.nombre })
                setQ('')
                setShowDrop(false)
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-baseline gap-2 text-sm"
            >
              <span className="font-mono text-xs text-slate-500 shrink-0">{r.codigo}</span>
              <span className="text-slate-800">{r.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EncuentroForm({
  documento,
  genero,
  paciente,
  onSubmit,
  isPending,
  onCancelar,
}: Props) {
  const { data: campos = [] } = useCamposClinicosActivos()
  const { data: encuentrosPrevios = [] } = useEncuentros(documento)

  const DRAFT_KEY = `enc-draft-${documento}`

  const draft = (() => {
    try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') } catch { return null }
  })()

  const [form, setForm] = useState<FormState>({ ...FORM_INICIAL, ...(draft?.form ?? {}) })
  const [signos, setSignos] = useState<Record<string, string>>(draft?.signos ?? {})
  const [revision, setRevision] = useState<Record<string, ValorNormalNotas>>(draft?.revision ?? {})
  const [examen, setExamen] = useState<Record<string, string | ValorNormalNotas>>(draft?.examen ?? {})
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>(draft?.diagnosticos ?? [])
  const [impresion, setImpresion] = useState<DiagnosticoItem | null>(draft?.impresion ?? null)
  const [tipoDiagnosticoPrincipal, setTipoDiagnosticoPrincipal] = useState<string>(draft?.tipoDiagnosticoPrincipal ?? '01')
  const [medsPos, setMedsPos] = useState<Medicamento[]>(draft?.medsPos ?? [{ ...medVacio }])
  const [medsNoPos, setMedsNoPos] = useState<Medicamento[]>(draft?.medsNoPos ?? [{ ...medVacio }])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('motivo')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const camposSignos = campos.filter(c => c.seccion === 'signos_vitales')
  const camposRevision = campos.filter(c => c.seccion === 'revision_sistemas')
  const camposExamen = campos.filter(c => c.seccion === 'examen_fisico')
  const consultasPrevias = encuentrosPrevios.filter(e => e.finalidad_consulta !== '11')

  const seccionesIncompletas: string[] = [
    ...(!form.motivo_consulta.trim() ? ['Motivo de consulta'] : []),
    ...(!diagnosticos.some(d => d.tipo === 'principal') ? ['Diagnósticos — falta al menos uno principal'] : []),
  ]

  const hasChanges = !!(
    form.motivo_consulta.trim() ||
    form.descripcion_ingreso.trim() ||
    form.plan_manejo.trim() ||
    Object.values(signos).some(v => v.trim()) ||
    Object.keys(revision).length > 0 ||
    Object.keys(examen).length > 0 ||
    diagnosticos.length > 0 ||
    impresion
  )

  const availableTabs: TabKey[] = [
    'motivo',
    'antecedentes',
    ...(camposSignos.length > 0 ? ['signos' as TabKey] : []),
    ...(camposRevision.length > 0 ? ['revision' as TabKey] : []),
    ...(camposExamen.length > 0 ? ['examen' as TabKey] : []),
    'diagnosticos',
    'formula',
  ]

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, signos, revision, examen, diagnosticos, impresion, medsPos, medsNoPos, tipoDiagnosticoPrincipal })) } catch {}
  }, [form, signos, revision, examen, diagnosticos, impresion, medsPos, medsNoPos, DRAFT_KEY])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function buildInput(): EncuentroInput {
    const signosLimpios = Object.fromEntries(
      Object.entries(signos).filter(([, v]) => v.trim() !== '')
    )
    return {
      motivo_consulta: form.motivo_consulta,
      descripcion_ingreso: form.descripcion_ingreso || undefined,
      signos_vitales: Object.keys(signosLimpios).length > 0 ? signosLimpios : undefined,
      revision_sistemas: Object.keys(revision).length > 0 ? revision : undefined,
      examen_fisico: Object.keys(examen).length > 0 ? examen : undefined,
      diagnosticos: [...(impresion ? [impresion] : []), ...diagnosticos],
      tipo_diagnostico_principal: tipoDiagnosticoPrincipal,
      plan_manejo: form.plan_manejo || undefined,
      finalidad_consulta: form.finalidad_consulta,
      causa_externa: form.causa_externa,
      via_ingreso: form.via_ingreso,
      encuentro_padre_id: form.finalidad_consulta === '11' && form.encuentro_padre_id
        ? form.encuentro_padre_id : undefined,
    }
  }

  async function doSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(buildInput(), { pos: medsPos, no_pos: medsNoPos })
      try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
    } catch (err) {
      setSubmitting(false)
      setError((err as Error)?.message ?? 'Error al guardar la consulta.')
    }
  }

  function handleFinalizarClick() {
    if (seccionesIncompletas.length > 0) {
      setShowConfirmModal(true)
    } else {
      doSubmit()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleFinalizarClick()
  }

  const currentIdx = availableTabs.indexOf(activeTab)
  const isFirst = currentIdx === 0
  const isLast = currentIdx === availableTabs.length - 1


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <NavigationGuard when={hasChanges && !isPending && !submitting} />

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
        {availableTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-white shadow-sm font-medium'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            style={activeTab === tab ? { color: 'var(--hce-primary)' } : {}}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card-hce px-6 pt-5 pb-6 space-y-4">

        {activeTab === 'motivo' && (
          <>
            <div>
              <h4 className="card-title mb-3">Clasificación</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label-hce">Finalidad de consulta</label>
                  <select name="finalidad_consulta" value={form.finalidad_consulta} onChange={handleChange} className="input-hce">
                    <option value="10">Consulta de primera vez</option>
                    <option value="11">Consulta de control</option>
                    <option value="12">Urgencias</option>
                  </select>
                </div>
                <div>
                  <label className="label-hce">Causa externa</label>
                  <select name="causa_externa" value={form.causa_externa} onChange={handleChange} className="input-hce">
                    <option value="13">Enfermedad general</option>
                    <option value="01">Accidente de trabajo</option>
                    <option value="02">Accidente de tránsito</option>
                  </select>
                </div>
                <div>
                  <label className="label-hce">Vía de ingreso</label>
                  <select name="via_ingreso" value={form.via_ingreso} onChange={handleChange} className="input-hce">
                    <option value="02">Consulta externa</option>
                    <option value="01">Urgencias</option>
                    <option value="03">Hospitalización</option>
                  </select>
                </div>
              </div>
              {form.finalidad_consulta === '11' && (
                <div className="mt-3">
                  <label className="label-hce">Consulta de origen <span className="text-slate-400 font-normal">(opcional)</span></label>
                  <select name="encuentro_padre_id" value={form.encuentro_padre_id} onChange={handleChange} className="input-hce">
                    <option value="">— Sin vincular —</option>
                    {consultasPrevias.map(e => (
                      <option key={e.encuentro_id} value={e.encuentro_id}>
                        {new Date(e.fecha_atencion).toLocaleDateString('es-CO')}
                        {e.descripcion_diagnostico ? ` · ${e.descripcion_diagnostico}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Vincular permite aplicar la regla de primer control sin cargo.</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div>
                <label className="label-hce">Motivo de consulta</label>
                <textarea
                  name="motivo_consulta"
                  value={form.motivo_consulta}
                  onChange={handleChange}
                  rows={2}
                  className="input-hce"
                  placeholder="Describa el motivo de consulta…"
                />
              </div>
              <div>
                <label className="label-hce">
                  Descripción general del paciente <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  name="descripcion_ingreso"
                  value={form.descripcion_ingreso}
                  onChange={handleChange}
                  rows={4}
                  className="input-hce"
                  placeholder="Ej: Paciente llega por sus propios medios, consciente, orientado en tiempo y espacio…"
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'antecedentes' && (
          <AntecedentesTab documento={documento} genero={genero} />
        )}

        {activeTab === 'signos' && (
          <SignosVitalesForm campos={camposSignos} values={signos} onChange={setSignos} />
        )}

        {activeTab === 'revision' && (
          <RevisionSistemasForm campos={camposRevision} values={revision} onChange={setRevision} />
        )}

        {activeTab === 'examen' && (
          <ExamenFisicoForm campos={camposExamen} values={examen} onChange={setExamen} />
        )}

        {activeTab === 'diagnosticos' && (
          <>
            <div className="space-y-2">
              <div>
                <label className="label-hce">Impresión diagnóstica <span className="text-slate-400 font-normal">(opcional)</span></label>
                <p className="text-xs text-slate-400 mb-2">Diagnóstico presuntivo basado en la anamnesis y el examen físico, antes de confirmar.</p>
                <ImpresionPicker value={impresion} onChange={setImpresion} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <label className="label-hce">Diagnósticos confirmados</label>
              <DiagnosticoSearch value={diagnosticos} onChange={setDiagnosticos} />
            </div>

            <div>
              <label className="label-hce">Plan de manejo <span className="text-slate-400 font-normal">(opcional)</span></label>
              <textarea
                name="plan_manejo"
                value={form.plan_manejo}
                onChange={handleChange}
                rows={3}
                className="input-hce"
              />
            </div>

            <div>
              <label className="label-hce">Tipo de diagnóstico <span className="text-slate-400 font-normal">(RIPS)</span></label>
              <select
                value={tipoDiagnosticoPrincipal}
                onChange={e => setTipoDiagnosticoPrincipal(e.target.value)}
                className="input-hce"
              >
                <option value="01">01 — Impresión diagnóstica</option>
                <option value="02">02 — Confirmado clínicamente</option>
                <option value="03">03 — Confirmado por laboratorio</option>
              </select>
            </div>
          </>
        )}

        {activeTab === 'formula' && (
          <FormulaTab
            medsPos={medsPos}
            setMedsPos={setMedsPos}
            medsNoPos={medsNoPos}
            setMedsNoPos={setMedsNoPos}
            paciente={paciente ?? null}
            diagnostico={
              diagnosticos.find(d => d.tipo === 'principal')?.codigo ??
              impresion?.codigo ?? ''
            }
          />
        )}

        {/* Tab navigation */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab(availableTabs[currentIdx - 1])}
            disabled={isFirst}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-0 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={15} />
            {!isFirst && TAB_LABELS[availableTabs[currentIdx - 1]]}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab(availableTabs[currentIdx + 1])}
            disabled={isLast}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-0 disabled:pointer-events-none transition-colors"
          >
            {!isLast && TAB_LABELS[availableTabs[currentIdx + 1]]}
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="flex justify-end gap-3 pb-8">
        {onCancelar && (
          <button type="button" onClick={onCancelar} disabled={isPending} className="btn-secondary">
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleFinalizarClick}
          disabled={isPending}
          className="btn-primary disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Finalizar consulta'}
        </button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4" style={{ background: 'var(--hce-card)' }}>
            <div>
              <h3 className="font-semibold text-base" style={{ color: 'var(--hce-text)' }}>
                Secciones incompletas
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--hce-text-muted)' }}>
                Las siguientes secciones parecen estar incompletas:
              </p>
              <ul className="mt-2 space-y-1">
                {seccionesIncompletas.map(s => (
                  <li key={s} className="text-sm flex items-start gap-2" style={{ color: 'var(--hce-text)' }}>
                    <span className="mt-0.5 text-amber-500">·</span>
                    {s}
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-3" style={{ color: 'var(--hce-text-muted)' }}>
                ¿Desea guardar de todas formas?
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
              >
                Revisar
              </button>
              <button
                type="button"
                onClick={() => { setShowConfirmModal(false); doSubmit() }}
                className="btn-primary"
              >
                Guardar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
