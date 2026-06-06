import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Printer, Download } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { imprimirConVisorSO } from '../utils/impresion'
import FormulaPDF, { type Medicamento, medVacio } from './pdf/FormulaPDF'
import { useMedico } from '../context/MedicoContext'
import { useTema } from '../context/TemaContext'
import { useMedicamentosPredefinidos, type MedicamentoPredefinido } from '../api/medicamentos_predefinidos'


function InputMed({
  tipo, value, onChange, onSelect,
}: {
  tipo: 'pos' | 'no_pos'
  value: string
  onChange: (v: string) => void
  onSelect: (m: MedicamentoPredefinido) => void
}) {
  const [q, setQ] = useState(value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: sugs = [] } = useMedicamentosPredefinidos(tipo, q.length >= 2 ? q : '')

  useEffect(() => { setQ(value) }, [value])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        value={q}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Nombre del medicamento"
        className="input-hce"
      />
      {open && sugs.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {sugs.map(m => (
            <button
              key={m.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(m); setQ(m.nombre); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-800">{m.nombre}</span>
              {(m.concentracion || m.forma_farmaceutica) && (
                <span className="text-xs text-slate-400 ml-2">
                  {[m.concentracion, m.forma_farmaceutica].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type PacienteInfo = {
  nombre: string
  documento: string
  tipoDocumento: string
  fechaNacimiento: string
}

type Props = {
  medsPos: Medicamento[]
  setMedsPos: (meds: Medicamento[]) => void
  medsNoPos: Medicamento[]
  setMedsNoPos: (meds: Medicamento[]) => void
  paciente: PacienteInfo | null
  diagnostico: string
}

export default function FormulaTab({ medsPos, setMedsPos, medsNoPos, setMedsNoPos, paciente, diagnostico }: Props) {
  const { medico } = useMedico()
  const { tema } = useTema()
  const [tab, setTab] = useState<'pos' | 'no_pos'>('pos')
  const [imprimiendo, setImprimiendo] = useState(false)
  const [descargando, setDescargando] = useState(false)

  const meds = tab === 'pos' ? medsPos : medsNoPos
  const setMeds = tab === 'pos' ? setMedsPos : setMedsNoPos

  const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const formulaValida = !!paciente && meds.some(m => m.nombre.trim())

  const fechaImpresion = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const docPDF = paciente ? (
    <FormulaPDF
      medico={medico}
      paciente={paciente}
      diagnostico={diagnostico}
      medicamentos={meds}
      incluirFirma={!!medico.firmaBase64}
      fecha={fecha}
      fechaImpresion={fechaImpresion}
      tipo={tab}
      colorPrimario={tema.colorPrimario}
      logoBase64={tema.logoBase64}
    />
  ) : null

  function cambiar(i: number, campo: keyof Medicamento, valor: string) {
    setMeds(meds.map((m, idx) => idx === i ? { ...m, [campo]: valor } : m))
  }

  function seleccionarCatalogo(i: number, m: MedicamentoPredefinido) {
    setMeds(meds.map((med, idx) => idx === i
      ? { ...med, nombre: m.nombre, concentracion: m.concentracion ?? '', formaFarmaceutica: m.forma_farmaceutica ?? '' }
      : med
    ))
  }

  async function imprimir() {
    if (!docPDF || !formulaValida) return
    setImprimiendo(true)
    try {
      const blob = await pdf(docPDF).toBlob()
      await imprimirConVisorSO(blob)
    } finally { setImprimiendo(false) }
  }

  async function descargar() {
    if (!docPDF || !paciente || !formulaValida) return
    setDescargando(true)
    try {
      const blob = await pdf(docPDF).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `formula_${tab}_${paciente.documento}_${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setDescargando(false) }
  }

  return (
    <div className="space-y-4">
      {/* POS / No-POS */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['pos', 'no_pos'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === t ? 'bg-white shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
            style={tab === t ? { color: 'var(--hce-primary)' } : {}}
          >
            {t === 'pos' ? 'POS — Alopático' : 'No POS — Homeopático'}
          </button>
        ))}
      </div>

      {/* Medicamentos */}
      {meds.map((m, i) => (
        <div key={i} className="border border-slate-100 rounded-lg p-4 space-y-3" style={{ background: 'var(--hce-bg)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--hce-text)' }}>Medicamento {i + 1}</span>
            {meds.length > 1 && (
              <button type="button" onClick={() => setMeds(meds.filter((_, idx) => idx !== i))}
                className="text-red-400 hover:text-red-600 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-hce">Nombre *</label>
              <InputMed tipo={tab} value={m.nombre} onChange={v => cambiar(i, 'nombre', v)} onSelect={cat => seleccionarCatalogo(i, cat)} />
            </div>
            <div>
              <label className="label-hce">Concentración</label>
              <input value={m.concentracion} onChange={e => cambiar(i, 'concentracion', e.target.value)} placeholder="Ej: 500 mg" className="input-hce" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-hce">Forma farmacéutica</label>
              <input value={m.formaFarmaceutica} onChange={e => cambiar(i, 'formaFarmaceutica', e.target.value)} placeholder="Tableta, Gotas…" className="input-hce" />
            </div>
            <div>
              <label className="label-hce">Dosis</label>
              <input value={m.dosis} onChange={e => cambiar(i, 'dosis', e.target.value)} placeholder="1 tableta" className="input-hce" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-hce">Frecuencia</label>
              <input value={m.frecuencia} onChange={e => cambiar(i, 'frecuencia', e.target.value)} placeholder="cada 8 horas" className="input-hce" />
            </div>
            <div>
              <label className="label-hce">Duración</label>
              <input value={m.duracion} onChange={e => cambiar(i, 'duracion', e.target.value)} placeholder="5 días" className="input-hce" />
            </div>
            <div>
              <label className="label-hce">Cantidad</label>
              <input value={m.cantidad} onChange={e => cambiar(i, 'cantidad', e.target.value)} placeholder="15 tabletas" className="input-hce" />
            </div>
          </div>
          <div>
            <label className="label-hce">Indicaciones especiales</label>
            <input value={m.indicaciones} onChange={e => cambiar(i, 'indicaciones', e.target.value)} placeholder="Tomar con alimentos" className="input-hce" />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setMeds([...meds, { ...medVacio }])}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: 'var(--hce-primary)' }}
      >
        <Plus size={14} /> Agregar medicamento
      </button>

      {/* Acciones PDF */}
      {formulaValida && (
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={imprimir} disabled={imprimiendo}
            className="btn-secondary text-sm disabled:opacity-50 flex items-center gap-1.5">
            <Printer size={14} />
            {imprimiendo ? 'Preparando…' : 'Imprimir fórmula'}
          </button>
          <button type="button" onClick={descargar} disabled={descargando}
            className="btn-secondary text-sm disabled:opacity-50 flex items-center gap-1.5">
            <Download size={14} />
            {descargando ? 'Generando…' : 'Descargar PDF'}
          </button>
          <p className="text-xs text-slate-400 self-center ml-1">
            La fórmula se guardará en BD al finalizar la consulta.
          </p>
        </div>
      )}
    </div>
  )
}
