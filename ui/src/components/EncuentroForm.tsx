import { useState, useEffect } from 'react'
import { CheckCircle, ChevronDown, Pencil } from 'lucide-react'
import { useEncuentros, type DiagnosticoItem, type ValorNormalNotas, type EncuentroInput } from '../api/encuentros'
import { useCamposClinicosActivos } from '../api/campos_clinicos'
import DiagnosticoSearch from './DiagnosticoSearch'
import { SignosVitalesForm, ExamenFisicoForm } from './CampoClinicoForm'

type FormState = {
  motivo_consulta: string
  plan_manejo: string
  finalidad_consulta: string
  causa_externa: string
  via_ingreso: string
  encuentro_padre_id: string
}

export type EncuentroFormInitial = Partial<FormState & {
  signos_vitales: Record<string, string>
  examen_fisico: Record<string, string | ValorNormalNotas>
  diagnosticos: DiagnosticoItem[]
}>

type Props = {
  documento: string
  initialValues?: EncuentroFormInitial
  onSubmit: (data: EncuentroInput) => Promise<void>
  onGuardarSeccion?: (data: Partial<EncuentroInput>) => Promise<void>
  isPending: boolean
  submitLabel: string
  onFinalizar?: () => Promise<void>
  isFinalizing?: boolean
  onCancelar?: () => void
}

type SectionKey = 'clasificacion' | 'motivo' | 'signos' | 'examen' | 'diagnosticos'

const FORM_INICIAL: FormState = {
  motivo_consulta: '',
  plan_manejo: '',
  finalidad_consulta: '10',
  causa_externa: '13',
  via_ingreso: '02',
  encuentro_padre_id: '',
}

const FINALIDAD_LABEL: Record<string, string> = {
  '10': 'Primera vez',
  '11': 'Control',
  '12': 'Urgencias',
}
const CAUSA_LABEL: Record<string, string> = {
  '13': 'Enf. general',
  '01': 'Acc. trabajo',
  '02': 'Acc. tránsito',
}
const VIA_LABEL: Record<string, string> = {
  '02': 'Consulta externa',
  '01': 'Urgencias',
  '03': 'Hospitalización',
}

function CollapsibleSection({
  title,
  isOpen,
  summary,
  onToggle,
  children,
  locked,
  onEditar,
  onGuardar,
  isSaving,
}: {
  title: string
  isOpen: boolean
  summary?: string
  onToggle: () => void
  children: React.ReactNode
  locked?: boolean
  onEditar?: () => void
  onGuardar?: () => void
  isSaving?: boolean
}) {
  return (
    <div className="card-hce overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <span className="card-title block">{title}</span>
          {!isOpen && summary && (
            <span className="text-sm text-slate-500 truncate block mt-0.5">{summary}</span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`ml-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 px-6 pt-4 pb-6 space-y-4">
          {children}
          <div className="flex justify-end gap-2 pt-2">
            {locked ? (
              onEditar && (
                <button type="button" onClick={onEditar} className="btn-ghost text-sm flex items-center gap-1.5">
                  <Pencil size={13} />
                  Editar sección
                </button>
              )
            ) : (
              onGuardar && (
                <button
                  type="button"
                  onClick={onGuardar}
                  disabled={isSaving}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar y continuar'}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function EncuentroForm({
  documento,
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

  const [form, setForm] = useState<FormState>({ ...FORM_INICIAL, ...initialValues })
  const [signos, setSignos] = useState<Record<string, string>>(initialValues?.signos_vitales ?? {})
  const [examen, setExamen] = useState<Record<string, string | ValorNormalNotas>>(initialValues?.examen_fisico ?? {})
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>(initialValues?.diagnosticos ?? [])
  const [error, setError] = useState<string | null>(null)

  // En borrador: todas las secciones empiezan colapsadas y bloqueadas
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    esBorrador ? new Set() : new Set<SectionKey>(['clasificacion'])
  )
  const [lockedSections, setLockedSections] = useState<Set<SectionKey>>(
    esBorrador
      ? new Set<SectionKey>(['clasificacion', 'motivo', 'signos', 'examen', 'diagnosticos'])
      : new Set<SectionKey>()
  )
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null)

  useEffect(() => {
    if (!initialValues) return
    setForm({ ...FORM_INICIAL, ...initialValues })
    setSignos(initialValues.signos_vitales ?? {})
    setExamen(initialValues.examen_fisico ?? {})
    setDiagnosticos(initialValues.diagnosticos ?? [])
  }, [initialValues?.motivo_consulta])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function buildInput(): EncuentroInput {
    const signosLimpios = Object.fromEntries(
      Object.entries(signos).filter(([, v]) => v.trim() !== '')
    )
    return {
      motivo_consulta: form.motivo_consulta,
      signos_vitales: Object.keys(signosLimpios).length > 0 ? signosLimpios : undefined,
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
    setError(null)
    try {
      await onSubmit(buildInput())
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

  function toggleSection(key: SectionKey) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function unlockSection(key: SectionKey) {
    setLockedSections(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  async function guardarSeccion(key: SectionKey, data: Partial<EncuentroInput>, availableSections: SectionKey[]) {
    if (onGuardarSeccion) {
      setSavingSection(key)
      try {
        await onGuardarSeccion(data)
      } catch (err) {
        setError((err as Error)?.message ?? 'Error al guardar.')
        setSavingSection(null)
        return
      }
      setSavingSection(null)
    }
    setLockedSections(prev => new Set([...prev, key]))
    const idx = availableSections.indexOf(key)
    const next = availableSections[idx + 1]
    setOpenSections(prev => {
      const s = new Set(prev)
      s.delete(key)
      if (next) s.add(next)
      return s
    })
  }

  const camposSignos = campos.filter(c => c.seccion === 'signos_vitales')
  const camposExamen = campos.filter(c => c.seccion === 'examen_fisico')
  const consultasPrevias = encuentrosPrevios.filter(e => e.finalidad_consulta !== '11')
  const faltaDiagnostico = !diagnosticos.some(d => d.tipo === 'principal')

  const availableSections: SectionKey[] = [
    'clasificacion',
    'motivo',
    ...(camposSignos.length > 0 ? ['signos' as SectionKey] : []),
    ...(camposExamen.length > 0 ? ['examen' as SectionKey] : []),
    'diagnosticos',
  ]

  const signosLimpios = Object.fromEntries(Object.entries(signos).filter(([, v]) => v.trim() !== ''))

  const clasifSummary = `${FINALIDAD_LABEL[form.finalidad_consulta] ?? '—'} · ${CAUSA_LABEL[form.causa_externa] ?? '—'} · ${VIA_LABEL[form.via_ingreso] ?? '—'}`
  const motivoSummary = form.motivo_consulta
    ? form.motivo_consulta.length > 80 ? form.motivo_consulta.slice(0, 77) + '…' : form.motivo_consulta
    : undefined
  const signosCount = Object.values(signos).filter(v => v.trim() !== '').length
  const signosSummary = signosCount > 0 ? `${signosCount} ${signosCount === 1 ? 'signo registrado' : 'signos registrados'}` : undefined
  const examenCount = Object.keys(examen).length
  const examenSummary = examenCount > 0 ? `${examenCount} ${examenCount === 1 ? 'campo evaluado' : 'campos evaluados'}` : undefined
  const dxPrincipal = diagnosticos.find(d => d.tipo === 'principal')
  const diagSummary = dxPrincipal
    ? `${dxPrincipal.codigo ? dxPrincipal.codigo + ' · ' : ''}${dxPrincipal.descripcion}`
    : undefined

  const clasifLocked = lockedSections.has('clasificacion')
  const motivoLocked = lockedSections.has('motivo')
  const signosLocked = lockedSections.has('signos')
  const examenLocked = lockedSections.has('examen')
  const diagLocked = lockedSections.has('diagnosticos')

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      <CollapsibleSection
        title="Clasificación"
        isOpen={openSections.has('clasificacion')}
        summary={clasifSummary}
        onToggle={() => toggleSection('clasificacion')}
        locked={clasifLocked}
        onEditar={() => unlockSection('clasificacion')}
        onGuardar={() => guardarSeccion('clasificacion', {
          finalidad_consulta: form.finalidad_consulta,
          causa_externa: form.causa_externa,
          via_ingreso: form.via_ingreso,
          encuentro_padre_id: form.finalidad_consulta === '11' && form.encuentro_padre_id ? form.encuentro_padre_id : undefined,
        }, availableSections)}
        isSaving={savingSection === 'clasificacion'}
      >
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label-hce">Finalidad de consulta</label>
            <select name="finalidad_consulta" value={form.finalidad_consulta} onChange={handleChange} disabled={clasifLocked} className="input-hce">
              <option value="10">Consulta de primera vez</option>
              <option value="11">Consulta de control</option>
              <option value="12">Urgencias</option>
            </select>
          </div>
          <div>
            <label className="label-hce">Causa externa</label>
            <select name="causa_externa" value={form.causa_externa} onChange={handleChange} disabled={clasifLocked} className="input-hce">
              <option value="13">Enfermedad general</option>
              <option value="01">Accidente de trabajo</option>
              <option value="02">Accidente de tránsito</option>
            </select>
          </div>
          <div>
            <label className="label-hce">Vía de ingreso</label>
            <select name="via_ingreso" value={form.via_ingreso} onChange={handleChange} disabled={clasifLocked} className="input-hce">
              <option value="02">Consulta externa</option>
              <option value="01">Urgencias</option>
              <option value="03">Hospitalización</option>
            </select>
          </div>
        </div>

        {form.finalidad_consulta === '11' && (
          <div>
            <label className="label-hce">Consulta de origen <span className="text-slate-400 font-normal">(opcional)</span></label>
            <select name="encuentro_padre_id" value={form.encuentro_padre_id} onChange={handleChange} disabled={clasifLocked} className="input-hce">
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Motivo de consulta"
        isOpen={openSections.has('motivo')}
        summary={motivoSummary}
        onToggle={() => toggleSection('motivo')}
        locked={motivoLocked}
        onEditar={() => unlockSection('motivo')}
        onGuardar={() => guardarSeccion('motivo', { motivo_consulta: form.motivo_consulta }, availableSections)}
        isSaving={savingSection === 'motivo'}
      >
        <textarea
          name="motivo_consulta"
          value={form.motivo_consulta}
          onChange={handleChange}
          required
          rows={4}
          disabled={motivoLocked}
          className="input-hce resize-none"
          placeholder="Describa el motivo de consulta…"
        />
      </CollapsibleSection>

      {camposSignos.length > 0 && (
        <CollapsibleSection
          title="Signos vitales"
          isOpen={openSections.has('signos')}
          summary={signosSummary ?? 'Opcional'}
          onToggle={() => toggleSection('signos')}
          locked={signosLocked}
          onEditar={() => unlockSection('signos')}
          onGuardar={() => guardarSeccion('signos', {
            signos_vitales: Object.keys(signosLimpios).length > 0 ? signosLimpios : undefined,
          }, availableSections)}
          isSaving={savingSection === 'signos'}
        >
          <SignosVitalesForm campos={camposSignos} values={signos} onChange={setSignos} disabled={signosLocked} />
        </CollapsibleSection>
      )}

      {camposExamen.length > 0 && (
        <CollapsibleSection
          title="Examen físico"
          isOpen={openSections.has('examen')}
          summary={examenSummary ?? 'Opcional — marcar Normal o describir hallazgos'}
          onToggle={() => toggleSection('examen')}
          locked={examenLocked}
          onEditar={() => unlockSection('examen')}
          onGuardar={() => guardarSeccion('examen', {
            examen_fisico: Object.keys(examen).length > 0 ? examen : undefined,
          }, availableSections)}
          isSaving={savingSection === 'examen'}
        >
          <ExamenFisicoForm campos={camposExamen} values={examen} onChange={setExamen} disabled={examenLocked} />
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Diagnósticos y plan de manejo"
        isOpen={openSections.has('diagnosticos')}
        summary={diagSummary}
        onToggle={() => toggleSection('diagnosticos')}
        locked={diagLocked}
        onEditar={() => unlockSection('diagnosticos')}
        onGuardar={() => guardarSeccion('diagnosticos', {
          diagnosticos,
          plan_manejo: form.plan_manejo || undefined,
        }, availableSections)}
        isSaving={savingSection === 'diagnosticos'}
      >
        <div className="space-y-4">
          <DiagnosticoSearch value={diagnosticos} onChange={setDiagnosticos} disabled={diagLocked} />
          <div>
            <label className="label-hce">Plan de manejo <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea
              name="plan_manejo"
              value={form.plan_manejo}
              onChange={handleChange}
              rows={3}
              disabled={diagLocked}
              className="input-hce resize-none"
            />
          </div>
        </div>
      </CollapsibleSection>

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
