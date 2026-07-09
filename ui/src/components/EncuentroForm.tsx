import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useEncuentros, useVinculacionPreviewEncuentro, type DiagnosticoItem, type ValoresClinicos, type EncuentroInput, type Encuentro } from '../api/encuentros'
import { apiFetch } from '../api/client'
import { useCamposClinicosActivos } from '../api/campos_clinicos'
import DiagnosticoSearch from './DiagnosticoSearch'
import { SignosVitalesForm, ExamenFisicoForm, RevisionSistemasForm } from './CampoClinicoForm'
import AntecedentesTab from './AntecedentesTab'
import { NavigationGuard } from './NavigationGuard'
import FormulaTab from './FormulaTab'
import ExamenesTab, { type ItemOrden } from './ExamenesTab'
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

export type OrdenData = {
  items: ItemOrden[]
  indicaciones_generales: string
}

type Props = {
  documento: string
  genero?: string
  paciente?: PacienteInfo
  borradorId?: string
  borradorData?: Partial<FormState & {
    signos: Record<string, string>
    revision: ValoresClinicos
    examen: ValoresClinicos
    diagnosticos: DiagnosticoItem[]
  }>
  onSubmit: (data: EncuentroInput, formulas: FormulaData, orden: OrdenData, encuentroId: string) => Promise<void>
  isPending: boolean
  onCancelar?: () => void
  onBorradorCreado?: (id: string) => void
}

type TabKey = 'motivo' | 'antecedentes' | 'signos' | 'revision' | 'examen' | 'analisis' | 'diagnosticos' | 'formula' | 'examenes'

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
  analisis: 'Análisis',
  diagnosticos: 'Diagnósticos',
  formula: 'Fórmula',
  examenes: 'Exámenes',
}


export default function EncuentroForm({
  documento,
  genero,
  paciente,
  borradorId: borradorIdInicial,
  borradorData,
  onSubmit,
  isPending,
  onCancelar,
  onBorradorCreado,
}: Props) {
  const { data: campos = [] } = useCamposClinicosActivos()
  const { data: encuentrosPrevios = [] } = useEncuentros(documento)
  const { data: previewVinculacion } = useVinculacionPreviewEncuentro(documento)

  const [form, setForm] = useState<FormState>({ ...FORM_INICIAL, ...(borradorData ?? {}) })
  const [signos, setSignos] = useState<Record<string, string>>(borradorData?.signos ?? {})
  const [revision, setRevision] = useState<ValoresClinicos>(borradorData?.revision ?? {})
  const [examen, setExamen] = useState<ValoresClinicos>(borradorData?.examen ?? {})
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>(borradorData?.diagnosticos ?? [])
  const [medsPos, setMedsPos] = useState<Medicamento[]>([{ ...medVacio }])
  const [medsNoPos, setMedsNoPos] = useState<Medicamento[]>([{ ...medVacio }])
  const [ordenItems, setOrdenItems] = useState<ItemOrden[]>([])
  const [ordenIndicaciones, setOrdenIndicaciones] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('motivo')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Autoguardado en BD — usamos ref para borradorId para evitar stale closures en el debounce
  const [borradorId, setBorradorId] = useState<string | undefined>(borradorIdInicial)
  const borradorIdRef = useRef<string | undefined>(borradorIdInicial)
  const [guardandoBorrador, setGuardandoBorrador] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sincronizar ref cuando la prop cambia (ej: usuario retoma borrador desde modal)
  useEffect(() => {
    if (borradorIdInicial && borradorIdRef.current !== borradorIdInicial) {
      borradorIdRef.current = borradorIdInicial
      setBorradorId(borradorIdInicial)
    }
  }, [borradorIdInicial])

  function setBorradorIdSync(id: string) {
    borradorIdRef.current = id
    setBorradorId(id)
  }

  const buildInput = useCallback((): EncuentroInput => {
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
      tipo_diagnostico_principal: diagnosticos.find(d => d.tipo === 'principal')?.tipo_clinico ?? '01',
      plan_manejo: form.plan_manejo || undefined,
      finalidad_consulta: form.finalidad_consulta,
      causa_externa: form.causa_externa,
      via_ingreso: form.via_ingreso,
      encuentro_padre_id: form.finalidad_consulta === '11' && form.encuentro_padre_id
        ? form.encuentro_padre_id : undefined,
    }
  }, [form, signos, revision, examen, diagnosticos])

  // guardarBorrador no depende de borradorId en closure — lee siempre el ref
  const guardarBorrador = useCallback(async () => {
    if (!documento) return
    setGuardandoBorrador(true)
    try {
      const input = buildInput()
      const idActual = borradorIdRef.current
      if (idActual) {
        await apiFetch(`/pacientes/${documento}/encuentros/${idActual}`, {
          method: 'PUT', body: JSON.stringify(input),
        })
      } else {
        const nuevo = await apiFetch<Encuentro>(`/pacientes/${documento}/encuentros`, {
          method: 'POST', body: JSON.stringify(input),
        })
        setBorradorIdSync(nuevo.encuentro_id)
        onBorradorCreado?.(nuevo.encuentro_id)
      }
    } catch {
      // silencioso — el usuario verá el error al intentar finalizar
    } finally {
      setGuardandoBorrador(false)
    }
  }, [documento, buildInput, onBorradorCreado])

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
    diagnosticos.length > 0
  )

  const availableTabs: TabKey[] = [
    'motivo',
    'antecedentes',
    ...(camposSignos.length > 0 ? ['signos' as TabKey] : []),
    ...(camposRevision.length > 0 ? ['revision' as TabKey] : []),
    ...(camposExamen.length > 0 ? ['examen' as TabKey] : []),
    'analisis',
    'diagnosticos',
    'formula',
    'examenes',
  ]

  // Debounce autoguardado: 2.5s después del último cambio
  useEffect(() => {
    if (!hasChanges) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { guardarBorrador() }, 2500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form, signos, revision, examen, diagnosticos])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function doSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const input = buildInput()
      let idParaFinalizar = borradorIdRef.current
      if (!idParaFinalizar) {
        const nuevo = await apiFetch<Encuentro>(`/pacientes/${documento}/encuentros`, {
          method: 'POST', body: JSON.stringify(input),
        })
        idParaFinalizar = nuevo.encuentro_id
        setBorradorIdSync(idParaFinalizar)
        onBorradorCreado?.(idParaFinalizar)
      } else {
        await apiFetch(`/pacientes/${documento}/encuentros/${idParaFinalizar}`, {
          method: 'PUT', body: JSON.stringify(input),
        })
      }
      await apiFetch(`/pacientes/${documento}/encuentros/${idParaFinalizar}/finalizar`, { method: 'PATCH' })
      await onSubmit(
        input,
        { pos: medsPos, no_pos: medsNoPos },
        { items: ordenItems, indicaciones_generales: ordenIndicaciones },
        idParaFinalizar,
      )
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
      <NavigationGuard
        when={hasChanges && !borradorId && !isPending && !submitting}
        onSaveAndProceed={guardarBorrador}
      />

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
                  </select>
                </div>
                <div>
                  <label className="label-hce">Causa externa</label>
                  <select name="causa_externa" value={form.causa_externa} onChange={handleChange} className="input-hce">
                    <option value="13">Enfermedad general</option>
                  </select>
                </div>
                <div>
                  <label className="label-hce">Vía de ingreso</label>
                  <select name="via_ingreso" value={form.via_ingreso} onChange={handleChange} className="input-hce">
                    <option value="02">Consulta externa</option>
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

        {activeTab === 'analisis' && (
          <div>
            <label className="label-hce">Análisis <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea
              name="plan_manejo"
              value={form.plan_manejo}
              onChange={handleChange}
              rows={8}
              className="input-hce"
              placeholder="Análisis clínico, correlación entre la anamnesis, examen físico y hallazgos…"
            />
          </div>
        )}

        {activeTab === 'diagnosticos' && (
          <div className="space-y-2">
            <label className="label-hce">Diagnósticos</label>
            <DiagnosticoSearch value={diagnosticos} onChange={setDiagnosticos} />
          </div>
        )}

        {activeTab === 'formula' && (
          <FormulaTab
            medsPos={medsPos}
            setMedsPos={setMedsPos}
            medsNoPos={medsNoPos}
            setMedsNoPos={setMedsNoPos}
            paciente={paciente ?? null}
            diagnostico={diagnosticos.find(d => d.tipo === 'principal')?.codigo ?? ''}
          />
        )}

        {activeTab === 'examenes' && (
          <ExamenesTab
            items={ordenItems}
            setItems={setOrdenItems}
            indicaciones={ordenIndicaciones}
            setIndicaciones={setOrdenIndicaciones}
            paciente={paciente ?? null}
            diagnostico={diagnosticos.find(d => d.tipo === 'principal')?.codigo ?? ''}
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

      {previewVinculacion && (
        <div
          className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm"
          style={{ background: 'var(--hce-primary-soft)', borderLeft: '3px solid var(--hce-primary)' }}
        >
          <Info size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--hce-primary)' }} />
          <p style={{ color: 'var(--hce-text)' }}>
            Al finalizar, esta consulta se vinculará automáticamente con la factura del{' '}
            <strong>
              {new Date(previewVinculacion.fecha_creacion).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </strong>
            {' · '}
            <span style={{ color: 'var(--hce-text-muted)' }}>
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(previewVinculacion.total)}
            </span>
          </p>
        </div>
      )}

      <div className="flex justify-between items-center pb-8">
        <span className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
          {guardandoBorrador ? 'Guardando borrador…' : borradorId ? 'Borrador guardado' : ''}
        </span>
        <div className="flex gap-3">
          {onCancelar && (
            <button type="button" onClick={onCancelar} disabled={isPending} className="btn-secondary">
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleFinalizarClick}
            disabled={isPending || submitting}
            className="btn-primary disabled:opacity-50"
          >
            {submitting ? 'Finalizando…' : 'Finalizar consulta'}
          </button>
        </div>
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
