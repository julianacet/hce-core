import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTabParam } from '../../hooks/useTabParam'
import { PDFViewer, pdf } from '@react-pdf/renderer'
import { imprimirConVisorSO } from '../../utils/impresion'
import { Plus, Trash2, Download, Printer, ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { useMedico } from '../../context/MedicoContext'
import { useTema } from '../../context/TemaContext'
import { fmtFechaNacimiento } from '../../utils/paciente'
import FormulaPDF, { type Medicamento } from '../../components/pdf/FormulaPDF'
import { usePaciente } from '../../api/pacientes'
import { useEncuentro } from '../../api/encuentros'
import { useCrearFormula } from '../../api/formulas'
import { useMedicamentosPredefinidos, type MedicamentoPredefinido } from '../../api/medicamentos_predefinidos'
import { nombreCompleto } from '../../utils/paciente'

const medVacio: Medicamento = {
  nombre: '',
  concentracion: '',
  formaFarmaceutica: '',
  dosis: '',
  frecuencia: '',
  duracion: '',
  cantidad: '',
  indicaciones: '',
}

// Autocomplete de nombre de medicamento contra el catálogo
function InputMedicamento({
  tipo,
  value,
  onChange,
  onSelect,
}: {
  tipo: 'pos' | 'no_pos'
  value: string
  onChange: (v: string) => void
  onSelect: (m: MedicamentoPredefinido) => void
}) {
  const [q, setQ] = useState(value)
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: sugerencias = [] } = useMedicamentosPredefinidos(tipo, q.length >= 2 ? q : '')

  useEffect(() => { setQ(value) }, [value])

  useEffect(() => {
    function cerrar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          onChange(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Nombre del medicamento"
        className="input-hce"
      />
      {abierto && sugerencias.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {sugerencias.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(m)
                setQ(m.nombre)
                setAbierto(false)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
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

export default function NuevaFormula() {
  const { id, encId } = useParams()
  const navigate = useNavigate()
  const { medico } = useMedico()
  const { tema } = useTema()

  const { data: pacienteData, isLoading: cargandoPaciente } = usePaciente(id ?? '')
  const { data: encuentroData, isLoading: cargandoEncuentro } = useEncuentro(id ?? '', encId ?? '')

  const paciente = pacienteData ? {
    nombre: nombreCompleto(pacienteData),
    documento: pacienteData.numero_documento,
    tipoDocumento: pacienteData.tipo_documento,
    fechaNacimiento: fmtFechaNacimiento(pacienteData.fecha_nacimiento),
  } : null

  const diagnostico = encuentroData?.codigo_diagnostico_principal ?? ''

  const crearFormulaPos = useCrearFormula(id ?? '', encId ?? '')
  const crearFormulaNoPos = useCrearFormula(id ?? '', encId ?? '')

  const [tab, setTab] = useTabParam('tab', 'pos' as const, ['pos', 'no_pos'] as const)
  const [medsPos, setMedsPos] = useState<Medicamento[]>([{ ...medVacio }])
  const [medsNoPos, setMedsNoPos] = useState<Medicamento[]>([{ ...medVacio }])
  const [guardadaIdPos, setGuardadaIdPos] = useState<string | null>(null)
  const [guardadaIdNoPos, setGuardadaIdNoPos] = useState<string | null>(null)
  const [incluirFirma, setIncluirFirma] = useState(!!medico.firmaBase64)
  const [vistaPrevia, setVistaPrevia] = useState(false)

  useEffect(() => {
    if (medico.firmaBase64) setIncluirFirma(true)
  }, [medico.firmaBase64])
  const [imprimiendo, setImprimiendo] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)

  const meds = tab === 'pos' ? medsPos : medsNoPos
  const setMeds = tab === 'pos' ? setMedsPos : setMedsNoPos
  const guardadaId = tab === 'pos' ? guardadaIdPos : guardadaIdNoPos
  const setGuardadaId = tab === 'pos' ? setGuardadaIdPos : setGuardadaIdNoPos
  const crearFormula = tab === 'pos' ? crearFormulaPos : crearFormulaNoPos

  const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const formulaValida = !!paciente && meds.every((m) => m.nombre)

  const fechaImpresion = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const docPDF = paciente ? (
    <FormulaPDF
      medico={medico}
      paciente={paciente}
      diagnostico={diagnostico}
      medicamentos={meds}
      incluirFirma={incluirFirma}
      fecha={fecha}
      fechaImpresion={fechaImpresion}
      tipo={tab}
      colorPrimario={tema.colorPrimario}
      logoBase64={tema.logoBase64}
      logoTextoBase64={medico.logoTextoBase64}
    />
  ) : null

  function agregar() { setMeds((p) => [...p, { ...medVacio }]) }
  function quitar(i: number) { setMeds((p) => p.filter((_, idx) => idx !== i)) }
  function cambiar(i: number, campo: keyof Medicamento, valor: string) {
    setMeds((p) => p.map((m, idx) => idx === i ? { ...m, [campo]: valor } : m))
  }
  function seleccionarCatalogo(i: number, m: MedicamentoPredefinido) {
    setMeds((p) => p.map((med, idx) => idx === i ? {
      ...med,
      nombre: m.nombre,
      concentracion: m.concentracion ?? '',
      formaFarmaceutica: m.forma_farmaceutica ?? '',
    } : med))
  }

  async function guardarEnBD(): Promise<void> {
    if (guardadaId || crearFormula.isPending) return
    setErrorGuardado(null)
    try {
      const result = await crearFormula.mutateAsync({
        tipo: tab,
        medicamentos: meds.map((m) => ({
          nombre_medicamento: m.nombre,
          concentracion: m.concentracion || undefined,
          forma_farmaceutica: m.formaFarmaceutica || undefined,
          dosis: m.dosis,
          frecuencia: m.frecuencia,
          duracion_tratamiento: m.duracion,
          cantidad_dispensar: parseInt(m.cantidad) || undefined,
          indicaciones: m.indicaciones || undefined,
        })),
      })
      setGuardadaId(result.id)
    } catch (err) {
      setErrorGuardado((err as Error)?.message ?? 'No se pudo guardar la fórmula en BD.')
    }
  }

  async function imprimir() {
    if (!docPDF || !formulaValida) return
    setImprimiendo(true)
    try {
      await guardarEnBD()
      const blob = await pdf(docPDF).toBlob()
      await imprimirConVisorSO(blob)
    } finally { setImprimiendo(false) }
  }

  async function descargar() {
    if (!docPDF || !paciente || !formulaValida) return
    setDescargando(true)
    try {
      await guardarEnBD()
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: 'var(--hce-card)', borderBottom: '1px solid var(--hce-border)' }}>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/pacientes/${id}/encuentros/${encId}`)}
            className="transition-colors text-[var(--hce-text-muted)] hover:text-[var(--hce-text)]">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="card-title">Nueva fórmula médica</h2>
            <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
              {cargandoPaciente || cargandoEncuentro
                ? 'Cargando...'
                : `${paciente?.nombre ?? ''} · ${diagnostico}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {medico.firmaBase64 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none"
              style={{ color: 'var(--hce-text-muted)' }}>
              <input type="checkbox" checked={incluirFirma}
                onChange={(e) => setIncluirFirma(e.target.checked)} className="rounded" />
              Incluir firma
            </label>
          )}

          <button onClick={() => setVistaPrevia((v) => !v)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border transition-colors"
            style={{ borderColor: 'var(--hce-border)', color: 'var(--hce-text-muted)', backgroundColor: 'transparent' }}>
            {vistaPrevia ? <EyeOff size={14} /> : <Eye size={14} />}
            {vistaPrevia ? 'Editar' : 'Vista previa'}
          </button>

          {guardadaId && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              Guardada ✓
            </span>
          )}

          {formulaValida && docPDF && (
            <button onClick={imprimir} disabled={imprimiendo}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--hce-primary)', color: 'var(--hce-primary)', backgroundColor: 'transparent' }}>
              <Printer size={15} />
              {imprimiendo ? 'Preparando...' : guardadaId ? 'Reimprimir' : 'Imprimir'}
            </button>
          )}

          {formulaValida && docPDF && (
            <button onClick={descargar} disabled={descargando} className="btn-primary disabled:opacity-50">
              <Download size={15} />
              {descargando ? 'Generando...' : 'Guardar PDF'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: 'var(--hce-card)', borderBottom: '1px solid var(--hce-border)' }}
        className="px-6 flex gap-1">
        {(['pos', 'no_pos'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2"
            style={{
              borderBottomColor: tab === t ? 'var(--hce-primary)' : 'transparent',
              color: tab === t ? 'var(--hce-primary)' : 'var(--hce-text-muted)',
            }}
          >
            {t === 'pos' ? 'POS — Alopático' : 'No POS — Homeopático'}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Panel izquierdo: formulario */}
        <div className={`overflow-auto p-6 space-y-4 ${vistaPrevia ? 'hidden' : 'flex-1'}`}
          style={{ backgroundColor: 'var(--hce-bg)' }}>

          {!medico.nombre && (
            <div className="rounded-lg px-4 py-3 text-sm bg-amber-50 text-amber-700 border border-amber-200">
              Los datos del médico no están configurados.{' '}
              <button onClick={() => navigate('/configuracion')} className="underline font-medium">
                Completar en Configuración
              </button>
            </div>
          )}

          {errorGuardado && (
            <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">
              La fórmula se imprimió pero no se pudo guardar en BD: {errorGuardado}
            </div>
          )}

          {meds.map((m, i) => (
            <div key={i} className="card-hce p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="card-title">Medicamento {i + 1}</span>
                {meds.length > 1 && (
                  <button onClick={() => quitar(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-hce">Nombre del medicamento *</label>
                  <InputMedicamento
                    tipo={tab}
                    value={m.nombre}
                    onChange={(v) => cambiar(i, 'nombre', v)}
                    onSelect={(cat) => seleccionarCatalogo(i, cat)}
                  />
                </div>
                <div>
                  <label className="label-hce">Concentración</label>
                  <input value={m.concentracion}
                    onChange={(e) => cambiar(i, 'concentracion', e.target.value)}
                    placeholder="Ej: 500 mg" className="input-hce" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-hce">Forma farmacéutica</label>
                  <input value={m.formaFarmaceutica}
                    onChange={(e) => cambiar(i, 'formaFarmaceutica', e.target.value)}
                    placeholder="Ej: Tableta, Gotas, Jarabe…" className="input-hce" />
                </div>
                <div>
                  <label className="label-hce">Dosis</label>
                  <input value={m.dosis} onChange={(e) => cambiar(i, 'dosis', e.target.value)}
                    placeholder="Ej: 1 tableta" className="input-hce" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label-hce">Frecuencia</label>
                  <input value={m.frecuencia} onChange={(e) => cambiar(i, 'frecuencia', e.target.value)}
                    placeholder="cada 8 horas" className="input-hce" />
                </div>
                <div>
                  <label className="label-hce">Duración</label>
                  <input value={m.duracion} onChange={(e) => cambiar(i, 'duracion', e.target.value)}
                    placeholder="5 días" className="input-hce" />
                </div>
                <div>
                  <label className="label-hce">Cantidad</label>
                  <input value={m.cantidad} onChange={(e) => cambiar(i, 'cantidad', e.target.value)}
                    placeholder="15 tabletas" className="input-hce" />
                </div>
              </div>

              <div>
                <label className="label-hce">Indicaciones especiales</label>
                <input value={m.indicaciones} onChange={(e) => cambiar(i, 'indicaciones', e.target.value)}
                  placeholder="Ej: Tomar con alimentos" className="input-hce" />
              </div>
            </div>
          ))}

          <button onClick={agregar}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'var(--hce-primary)' }}>
            <Plus size={15} />
            Agregar otro medicamento
          </button>
        </div>

        {/* Vista previa PDF */}
        {(vistaPrevia || formulaValida) && docPDF && (
          <div className={`flex flex-col ${vistaPrevia ? 'flex-1' : 'w-96'}`}
            style={{ backgroundColor: '#525659' }}>
            <div className="px-4 py-2 flex items-center justify-between"
              style={{ backgroundColor: '#3c3f41' }}>
              <span className="text-xs" style={{ color: '#b0b0b0' }}>
                {vistaPrevia ? 'Vista previa completa' : 'Vista previa'}
              </span>
            </div>
            <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none', flex: 1 }}>
              {docPDF}
            </PDFViewer>
          </div>
        )}
      </div>
    </div>
  )
}
