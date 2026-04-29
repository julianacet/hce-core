import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCrearEncuentro } from '../../api/encuentros'

export default function NuevoEncuentro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const crear = useCrearEncuentro(id ?? '')

  const [form, setForm] = useState({
    motivo_consulta: '',
    examen_fisico: '',
    codigo_diagnostico_principal: '',
    plan_manejo: '',
    finalidad_consulta: '10',
    causa_externa: '13',
    via_ingreso: '02',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const encuentro = await crear.mutateAsync(form)
    navigate(`/pacientes/${id}/encuentros/${encuentro.encuentro_id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 max-w-2xl">
      <h3 className="text-sm font-semibold text-slate-700">Nuevo encuentro clínico</h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Finalidad de consulta</label>
          <select name="finalidad_consulta" value={form.finalidad_consulta} onChange={handleChange}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="10">Consulta de primera vez</option>
            <option value="11">Consulta de control</option>
            <option value="12">Urgencias</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Causa externa</label>
          <select name="causa_externa" value={form.causa_externa} onChange={handleChange}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="13">Enfermedad general</option>
            <option value="01">Accidente de trabajo</option>
            <option value="02">Accidente de tránsito</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Vía de ingreso</label>
          <select name="via_ingreso" value={form.via_ingreso} onChange={handleChange}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="02">Consulta externa</option>
            <option value="01">Urgencias</option>
            <option value="03">Hospitalización</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Motivo de consulta *</label>
        <textarea name="motivo_consulta" value={form.motivo_consulta} onChange={handleChange} required rows={3}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Examen físico</label>
        <textarea name="examen_fisico" value={form.examen_fisico} onChange={handleChange} rows={3}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Código diagnóstico principal (CIE-10) *</label>
        <input type="text" name="codigo_diagnostico_principal" value={form.codigo_diagnostico_principal}
          onChange={handleChange} required placeholder="Ej: J00"
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Plan de manejo</label>
        <textarea name="plan_manejo" value={form.plan_manejo} onChange={handleChange} rows={3}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {crear.isError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {(crear.error as Error)?.message ?? 'Error al guardar el encuentro.'}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={() => navigate(-1)}
          disabled={crear.isPending}
          className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={crear.isPending}
          className="text-sm bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50">
          {crear.isPending ? 'Guardando...' : 'Guardar encuentro'}
        </button>
      </div>
    </form>
  )
}
