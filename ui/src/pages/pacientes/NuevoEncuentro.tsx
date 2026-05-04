import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCrearEncuentro } from '../../api/encuentros'

type FormState = {
  motivo_consulta: string
  ta_sistolica: string
  ta_diastolica: string
  frecuencia_cardiaca: string
  frecuencia_respiratoria: string
  temperatura: string
  saturacion_o2: string
  peso: string
  talla: string
  examen_fisico: string
  codigo_diagnostico_principal: string
  descripcion_diagnostico: string
  plan_manejo: string
  finalidad_consulta: string
  causa_externa: string
  via_ingreso: string
}

const FORM_INICIAL: FormState = {
  motivo_consulta: '',
  ta_sistolica: '',
  ta_diastolica: '',
  frecuencia_cardiaca: '',
  frecuencia_respiratoria: '',
  temperatura: '',
  saturacion_o2: '',
  peso: '',
  talla: '',
  examen_fisico: '',
  codigo_diagnostico_principal: '',
  descripcion_diagnostico: '',
  plan_manejo: '',
  finalidad_consulta: '10',
  causa_externa: '13',
  via_ingreso: '02',
}

function numONull(v: string): number | null {
  const n = parseFloat(v)
  return v.trim() === '' || isNaN(n) ? null : n
}

function intONull(v: string): number | null {
  const n = parseInt(v, 10)
  return v.trim() === '' || isNaN(n) ? null : n
}

function calcularIMC(peso: string, talla: string): string {
  const p = parseFloat(peso)
  const t = parseFloat(talla)
  if (!p || !t || t === 0) return '—'
  const imc = p / Math.pow(t / 100, 2)
  return imc.toFixed(1)
}

export default function NuevoEncuentro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const crear = useCrearEncuentro(id ?? '')
  const [form, setForm] = useState<FormState>(FORM_INICIAL)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const encuentro = await crear.mutateAsync({
      motivo_consulta: form.motivo_consulta,
      ta_sistolica: intONull(form.ta_sistolica),
      ta_diastolica: intONull(form.ta_diastolica),
      frecuencia_cardiaca: intONull(form.frecuencia_cardiaca),
      frecuencia_respiratoria: intONull(form.frecuencia_respiratoria),
      temperatura: numONull(form.temperatura),
      saturacion_o2: intONull(form.saturacion_o2),
      peso: numONull(form.peso),
      talla: numONull(form.talla),
      examen_fisico: form.examen_fisico || undefined,
      codigo_diagnostico_principal: form.codigo_diagnostico_principal,
      descripcion_diagnostico: form.descripcion_diagnostico || undefined,
      plan_manejo: form.plan_manejo || undefined,
      finalidad_consulta: form.finalidad_consulta,
      causa_externa: form.causa_externa,
      via_ingreso: form.via_ingreso,
    })
    navigate(`/pacientes/${id}/encuentros/${encuentro.encuentro_id}`)
  }

  const imc = calcularIMC(form.peso, form.talla)

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">

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
        <textarea
          name="motivo_consulta"
          value={form.motivo_consulta}
          onChange={handleChange}
          required
          rows={3}
          className="input-hce resize-none"
        />
      </div>

      {/* Signos vitales */}
      <div className="card-hce p-6 space-y-4">
        <h3 className="card-title">Signos vitales <span className="font-normal text-slate-400">(opcional)</span></h3>

        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="label-hce">Tensión arterial (mmHg)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="ta_sistolica"
                value={form.ta_sistolica}
                onChange={handleChange}
                placeholder="Sistólica"
                min={40} max={300}
                className="input-hce"
              />
              <span className="text-slate-400 shrink-0">/</span>
              <input
                type="number"
                name="ta_diastolica"
                value={form.ta_diastolica}
                onChange={handleChange}
                placeholder="Diastólica"
                min={20} max={200}
                className="input-hce"
              />
            </div>
          </div>

          <div>
            <label className="label-hce">FC (lpm)</label>
            <input
              type="number"
              name="frecuencia_cardiaca"
              value={form.frecuencia_cardiaca}
              onChange={handleChange}
              placeholder="72"
              min={20} max={300}
              className="input-hce"
            />
          </div>

          <div>
            <label className="label-hce">FR (rpm)</label>
            <input
              type="number"
              name="frecuencia_respiratoria"
              value={form.frecuencia_respiratoria}
              onChange={handleChange}
              placeholder="16"
              min={4} max={60}
              className="input-hce"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="label-hce">Temperatura (°C)</label>
            <input
              type="number"
              name="temperatura"
              value={form.temperatura}
              onChange={handleChange}
              placeholder="36.5"
              step="0.1" min={30} max={45}
              className="input-hce"
            />
          </div>

          <div>
            <label className="label-hce">SpO₂ (%)</label>
            <input
              type="number"
              name="saturacion_o2"
              value={form.saturacion_o2}
              onChange={handleChange}
              placeholder="98"
              min={50} max={100}
              className="input-hce"
            />
          </div>

          <div>
            <label className="label-hce">Peso (kg)</label>
            <input
              type="number"
              name="peso"
              value={form.peso}
              onChange={handleChange}
              placeholder="70.0"
              step="0.1" min={1} max={300}
              className="input-hce"
            />
          </div>

          <div>
            <label className="label-hce">Talla (cm)</label>
            <input
              type="number"
              name="talla"
              value={form.talla}
              onChange={handleChange}
              placeholder="165"
              step="0.1" min={30} max={250}
              className="input-hce"
            />
          </div>
        </div>

        {(form.peso || form.talla) && (
          <p className="text-xs text-slate-500">
            IMC: <span className="font-semibold text-slate-700">{imc}</span>
            {imc !== '—' && ' kg/m²'}
          </p>
        )}
      </div>

      {/* Examen físico */}
      <div className="card-hce p-6">
        <label className="label-hce">Examen físico</label>
        <textarea
          name="examen_fisico"
          value={form.examen_fisico}
          onChange={handleChange}
          rows={3}
          placeholder="Hallazgos por sistemas..."
          className="input-hce resize-none"
        />
      </div>

      {/* Diagnóstico */}
      <div className="card-hce p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-hce">Código diagnóstico (CIE-10) *</label>
            <input
              type="text"
              name="codigo_diagnostico_principal"
              value={form.codigo_diagnostico_principal}
              onChange={handleChange}
              required
              placeholder="Ej: J00"
              className="input-hce uppercase"
            />
          </div>
          <div>
            <label className="label-hce">Descripción del diagnóstico</label>
            <input
              type="text"
              name="descripcion_diagnostico"
              value={form.descripcion_diagnostico}
              onChange={handleChange}
              placeholder="Rinofaringitis aguda"
              className="input-hce"
            />
          </div>
        </div>

        <div>
          <label className="label-hce">Plan de manejo</label>
          <textarea
            name="plan_manejo"
            value={form.plan_manejo}
            onChange={handleChange}
            rows={3}
            className="input-hce resize-none"
          />
        </div>
      </div>

      {crear.isError && (
        <p className="form-error">
          {(crear.error as Error)?.message ?? 'Error al guardar el encuentro.'}
        </p>
      )}

      <div className="flex justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={crear.isPending}
          className="btn-secondary"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={crear.isPending}
          className="btn-primary"
        >
          {crear.isPending ? 'Guardando...' : 'Guardar encuentro'}
        </button>
      </div>
    </form>
  )
}
