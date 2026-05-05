import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCrearEncuentro, type DiagnosticoItem, type ValorNormalNotas } from '../../api/encuentros'
import { usePaciente } from '../../api/pacientes'
import { useCamposClinicosActivos } from '../../api/campos_clinicos'
import AntecedentesTab from '../../components/AntecedentesTab'
import DiagnosticoSearch from '../../components/DiagnosticoSearch'
import { SignosVitalesForm, ExamenFisicoForm } from '../../components/CampoClinicoForm'

type FormState = {
  motivo_consulta: string
  plan_manejo: string
  finalidad_consulta: string
  causa_externa: string
  via_ingreso: string
}

const FORM_INICIAL: FormState = {
  motivo_consulta: '',
  plan_manejo: '',
  finalidad_consulta: '10',
  causa_externa: '13',
  via_ingreso: '02',
}

type Tab = 'consulta' | 'antecedentes'

export default function NuevoEncuentro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const crear = useCrearEncuentro(id ?? '')
  const { data: paciente } = usePaciente(id ?? '')
  const { data: campos = [] } = useCamposClinicosActivos()

  const [form, setForm] = useState<FormState>(FORM_INICIAL)
  const [signos, setSignos] = useState<Record<string, string>>({})
  const [examen, setExamen] = useState<Record<string, string | ValorNormalNotas>>({})
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>([])
  const [tab, setTab] = useState<Tab>('consulta')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!diagnosticos.some(d => d.tipo === 'principal')) return

    // Limpiar campos vacíos de signos vitales
    const signosLimpios = Object.fromEntries(
      Object.entries(signos).filter(([, v]) => v.trim() !== '')
    )

    const encuentro = await crear.mutateAsync({
      motivo_consulta: form.motivo_consulta,
      signos_vitales: Object.keys(signosLimpios).length > 0 ? signosLimpios : undefined,
      examen_fisico: Object.keys(examen).length > 0 ? examen : undefined,
      diagnosticos,
      plan_manejo: form.plan_manejo || undefined,
      finalidad_consulta: form.finalidad_consulta,
      causa_externa: form.causa_externa,
      via_ingreso: form.via_ingreso,
    })
    navigate(`/pacientes/${id}/encuentros/${encuentro.encuentro_id}`)
  }

  const faltaDiagnostico = !diagnosticos.some(d => d.tipo === 'principal')
  const camposSignos = campos.filter(c => c.seccion === 'signos_vitales')
  const camposExamen = campos.filter(c => c.seccion === 'examen_fisico')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'consulta', label: 'Consulta' },
    { key: 'antecedentes', label: 'Antecedentes' },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === key ? 'bg-white shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
            style={tab === key ? { color: 'var(--hce-primary)' } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'antecedentes' && (
        <div className="card-hce p-6">
          <h3 className="card-title mb-4">Antecedentes del paciente</h3>
          <AntecedentesTab documento={id ?? ''} genero={paciente?.genero} />
        </div>
      )}

      {tab === 'consulta' && (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Clasificación */}
          <div className="card-hce p-6 space-y-4">
            <h3 className="card-title">Nuevo encuentro clínico</h3>
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
          </div>

          {/* Motivo */}
          <div className="card-hce p-6">
            <label className="label-hce">Motivo de consulta *</label>
            <textarea name="motivo_consulta" value={form.motivo_consulta} onChange={handleChange}
              required rows={3} className="input-hce resize-none" />
          </div>

          {/* Signos vitales */}
          {camposSignos.length > 0 && (
            <div className="card-hce p-6 space-y-4">
              <h3 className="card-title">
                Signos vitales <span className="font-normal text-slate-400">(opcional)</span>
              </h3>
              <SignosVitalesForm campos={camposSignos} values={signos} onChange={setSignos} />
            </div>
          )}

          {/* Examen físico */}
          {camposExamen.length > 0 && (
            <div className="card-hce p-6 space-y-4">
              <h3 className="card-title">
                Examen físico <span className="font-normal text-slate-400">(marcar Normal o describir hallazgos)</span>
              </h3>
              <ExamenFisicoForm campos={camposExamen} values={examen} onChange={setExamen} />
            </div>
          )}

          {/* Diagnósticos */}
          <div className="card-hce p-6 space-y-4">
            <h3 className="card-title">Diagnósticos *</h3>
            <DiagnosticoSearch value={diagnosticos} onChange={setDiagnosticos} />
            <div>
              <label className="label-hce">Plan de manejo</label>
              <textarea name="plan_manejo" value={form.plan_manejo} onChange={handleChange}
                rows={3} className="input-hce resize-none" />
            </div>
          </div>

          {crear.isError && (
            <p className="form-error">
              {(crear.error as Error)?.message ?? 'Error al guardar el encuentro.'}
            </p>
          )}

          <div className="flex justify-end gap-3 pb-8">
            <button type="button" onClick={() => navigate(-1)} disabled={crear.isPending} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={crear.isPending || faltaDiagnostico} className="btn-primary">
              {crear.isPending ? 'Guardando...' : 'Guardar encuentro'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
