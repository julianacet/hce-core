import { useState, useEffect } from 'react'
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEncuentros, type DiagnosticoItem, type ValorNormalNotas, type EncuentroInput } from '../api/encuentros'
import { useCamposClinicosActivos } from '../api/campos_clinicos'
import DiagnosticoSearch from './DiagnosticoSearch'
import { SignosVitalesForm, ExamenFisicoForm, RevisionSistemasForm } from './CampoClinicoForm'
import AntecedentesTab from './AntecedentesTab'

type FormState = {
  motivo_consulta: string
  descripcion_ingreso: string
  plan_manejo: string
  finalidad_consulta: string
  causa_externa: string
  via_ingreso: string
  encuentro_padre_id: string
}

export type EncuentroFormInitial = Partial<FormState & {
  signos_vitales: Record<string, string>
  revision_sistemas: Record<string, ValorNormalNotas>
  examen_fisico: Record<string, string | ValorNormalNotas>
  diagnosticos: DiagnosticoItem[]
}>

type Props = {
  documento: string
  genero?: string
  initialValues?: EncuentroFormInitial
  onSubmit: (data: EncuentroInput) => Promise<void>
  onGuardarSeccion?: (data: Partial<EncuentroInput>) => Promise<void>
  isPending: boolean
  submitLabel: string
  onFinalizar?: () => Promise<void>
  isFinalizing?: boolean
  onCancelar?: () => void
}

type TabKey = 'motivo' | 'antecedentes' | 'signos' | 'revision' | 'examen' | 'diagnosticos'

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
}

export default function EncuentroForm({
  documento,
  genero,
  initialValues,
  onSubmit,
  onGuardarSeccion,
  isPending,
  submitLabel,
  onFinalizar,
  isFinalizing,
  onCancelar,
}: Props) {
  const { data: campos = [] } = useCamposClinicosActivos()
  const { data: encuentrosPrevios = [] } = useEncuentros(documento)

  const esBorrador = !!initialValues
  const DRAFT_KEY = `enc-draft-${documento}`

  const draft = !esBorrador ? (() => {
    try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') } catch { return null }
  })() : null

  const [form, setForm] = useState<FormState>({ ...FORM_INICIAL, ...(draft?.form ?? initialValues) })
  const [signos, setSignos] = useState<Record<string, string>>(initialValues?.signos_vitales ?? draft?.signos ?? {})
  const [revision, setRevision] = useState<Record<string, ValorNormalNotas>>(initialValues?.revision_sistemas ?? draft?.revision ?? {})
  const [examen, setExamen] = useState<Record<string, string | ValorNormalNotas>>(initialValues?.examen_fisico ?? draft?.examen ?? {})
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>(initialValues?.diagnosticos ?? draft?.diagnosticos ?? [])
  const [error, setError] = useState<string | null>(null)
  const [savingTab, setSavingTab] = useState<TabKey | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('motivo')

  const camposSignos = campos.filter(c => c.seccion === 'signos_vitales')
  const camposRevision = campos.filter(c => c.seccion === 'revision_sistemas')
  const camposExamen = campos.filter(c => c.seccion === 'examen_fisico')
  const consultasPrevias = encuentrosPrevios.filter(e => e.finalidad_consulta !== '11')
  const faltaDiagnostico = !diagnosticos.some(d => d.tipo === 'principal')

  const availableTabs: TabKey[] = [
    'motivo',
    'antecedentes',
    ...(camposSignos.length > 0 ? ['signos' as TabKey] : []),
    ...(camposRevision.length > 0 ? ['revision' as TabKey] : []),
    ...(camposExamen.length > 0 ? ['examen' as TabKey] : []),
    'diagnosticos',
  ]

  useEffect(() => {
    if (!initialValues) return
    setForm({ ...FORM_INICIAL, ...initialValues })
    setSignos(initialValues.signos_vitales ?? {})
    setRevision(initialValues.revision_sistemas ?? {})
    setExamen(initialValues.examen_fisico ?? {})
    setDiagnosticos(initialValues.diagnosticos ?? [])
  }, [initialValues?.motivo_consulta])

  useEffect(() => {
    if (esBorrador) return
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, signos, revision, examen, diagnosticos })) } catch {}
  }, [form, signos, revision, examen, diagnosticos, esBorrador, DRAFT_KEY])

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
      diagnosticos,
      plan_manejo: form.plan_manejo || undefined,
      finalidad_consulta: form.finalidad_consulta,
      causa_externa: form.causa_externa,
      via_ingreso: form.via_ingreso,
      encuentro_padre_id: form.finalidad_consulta === '11' && form.encuentro_padre_id
        ? form.encuentro_padre_id : undefined,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.motivo_consulta.trim()) {
      setError('El motivo de consulta es obligatorio.')
      setActiveTab('motivo')
      return
    }
    setError(null)
    try {
      await onSubmit(buildInput())
      try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
    } catch (err) {
      setError((err as Error)?.message ?? 'Error al guardar el encuentro.')
    }
  }

  async function handleFinalizar() {
    if (!onFinalizar) return
    setError(null)
    try {
      await onFinalizar()
    } catch (err) {
      setError((err as Error)?.message ?? 'Error al finalizar el encuentro.')
    }
  }

  async function guardarTabSeccion(tab: TabKey, data: Partial<EncuentroInput>) {
    if (!onGuardarSeccion) return
    setSavingTab(tab)
    try {
      await onGuardarSeccion(data)
    } catch (err) {
      setError((err as Error)?.message ?? 'Error al guardar.')
    }
    setSavingTab(null)
  }

  const currentIdx = availableTabs.indexOf(activeTab)
  const isFirst = currentIdx === 0
  const isLast = currentIdx === availableTabs.length - 1

  const signosLimpios = Object.fromEntries(Object.entries(signos).filter(([, v]) => v.trim() !== ''))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

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
                  rows={4}
                  className="input-hce resize-none"
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
                  rows={3}
                  className="input-hce resize-none"
                  placeholder="Ej: Paciente llega por sus propios medios, consciente, orientado en tiempo y espacio…"
                />
              </div>
            </div>

            {esBorrador && onGuardarSeccion && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => guardarTabSeccion('motivo', {
                    motivo_consulta: form.motivo_consulta,
                    descripcion_ingreso: form.descripcion_ingreso || undefined,
                    finalidad_consulta: form.finalidad_consulta,
                    causa_externa: form.causa_externa,
                    via_ingreso: form.via_ingreso,
                    encuentro_padre_id: form.finalidad_consulta === '11' && form.encuentro_padre_id
                      ? form.encuentro_padre_id : undefined,
                  })}
                  disabled={savingTab === 'motivo'}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {savingTab === 'motivo' ? 'Guardando...' : 'Guardar sección'}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'antecedentes' && (
          <AntecedentesTab documento={documento} genero={genero} />
        )}

        {activeTab === 'signos' && (
          <>
            <SignosVitalesForm campos={camposSignos} values={signos} onChange={setSignos} />
            {esBorrador && onGuardarSeccion && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => guardarTabSeccion('signos', {
                    signos_vitales: Object.keys(signosLimpios).length > 0 ? signosLimpios : undefined,
                  })}
                  disabled={savingTab === 'signos'}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {savingTab === 'signos' ? 'Guardando...' : 'Guardar sección'}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'revision' && (
          <>
            <RevisionSistemasForm campos={camposRevision} values={revision} onChange={setRevision} />
            {esBorrador && onGuardarSeccion && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => guardarTabSeccion('revision', {
                    revision_sistemas: Object.keys(revision).length > 0 ? revision : undefined,
                  })}
                  disabled={savingTab === 'revision'}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {savingTab === 'revision' ? 'Guardando...' : 'Guardar sección'}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'examen' && (
          <>
            <ExamenFisicoForm campos={camposExamen} values={examen} onChange={setExamen} />
            {esBorrador && onGuardarSeccion && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => guardarTabSeccion('examen', {
                    examen_fisico: Object.keys(examen).length > 0 ? examen : undefined,
                  })}
                  disabled={savingTab === 'examen'}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {savingTab === 'examen' ? 'Guardando...' : 'Guardar sección'}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'diagnosticos' && (
          <>
            <DiagnosticoSearch value={diagnosticos} onChange={setDiagnosticos} />
            <div>
              <label className="label-hce">Plan de manejo <span className="text-slate-400 font-normal">(opcional)</span></label>
              <textarea
                name="plan_manejo"
                value={form.plan_manejo}
                onChange={handleChange}
                rows={3}
                className="input-hce resize-none"
              />
            </div>
            {esBorrador && onGuardarSeccion && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => guardarTabSeccion('diagnosticos', {
                    diagnosticos,
                    plan_manejo: form.plan_manejo || undefined,
                  })}
                  disabled={savingTab === 'diagnosticos'}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {savingTab === 'diagnosticos' ? 'Guardando...' : 'Guardar sección'}
                </button>
              </div>
            )}
          </>
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
          <button type="button" onClick={onCancelar} disabled={isPending || isFinalizing} className="btn-secondary">
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || isFinalizing || faltaDiagnostico}
          className="btn-secondary disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : submitLabel}
        </button>
        {onFinalizar && (
          <button
            type="button"
            onClick={handleFinalizar}
            disabled={isPending || isFinalizing || faltaDiagnostico || !form.motivo_consulta.trim()}
            className="btn-primary disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle size={15} />
            {isFinalizing ? 'Finalizando...' : 'Finalizar consulta'}
          </button>
        )}
      </div>
    </form>
  )
}
