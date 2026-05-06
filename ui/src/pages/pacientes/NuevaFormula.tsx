import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { PDFViewer, pdf } from '@react-pdf/renderer'
import { Plus, Trash2, Download, Printer, ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { useMedico } from '../../context/MedicoContext'
import FormulaPDF, { type Medicamento } from '../../components/pdf/FormulaPDF'
import { usePaciente } from '../../api/pacientes'
import { useEncuentro } from '../../api/encuentros'
import { useCrearFormula } from '../../api/formulas'

const medVacio: Medicamento = {
  nombre: '',
  concentracion: '',
  formaFarmaceutica: 'tableta',
  dosis: '',
  frecuencia: '',
  duracion: '',
  cantidad: '',
  indicaciones: '',
}

const formasFarmaceuticas = [
  'tableta', 'cápsula', 'jarabe', 'suspensión', 'inyectable',
  'crema', 'ungüento', 'gotas', 'parche', 'supositorio', 'otro',
]

export default function NuevaFormula() {
  const { id, encId } = useParams()
  const navigate = useNavigate()
  const { medico } = useMedico()

  const { data: pacienteData, isLoading: cargandoPaciente } = usePaciente(id ?? '')
  const { data: encuentroData, isLoading: cargandoEncuentro } = useEncuentro(id ?? '', encId ?? '')

  const paciente = pacienteData ? {
    nombre: [pacienteData.nombre_primero, pacienteData.nombre_segundo, pacienteData.apellido_primero, pacienteData.apellido_segundo].filter(Boolean).join(' '),
    documento: pacienteData.numero_documento,
    tipoDocumento: pacienteData.tipo_documento,
    fechaNacimiento: new Date(pacienteData.fecha_nacimiento).toLocaleDateString('es-CO'),
  } : null

  const diagnostico = encuentroData
    ? [encuentroData.codigo_diagnostico_principal, encuentroData.descripcion_diagnostico].filter(Boolean).join(' - ')
    : ''

  const crearFormula = useCrearFormula(id ?? '', encId ?? '')

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([{ ...medVacio }])
  const [incluirFirma, setIncluirFirma] = useState(!!medico.firmaBase64)
  const [vistaPrevia, setVistaPrevia] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [guardadaId, setGuardadaId] = useState<string | null>(null)

  const fecha = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  function agregar() {
    setMedicamentos((prev) => [...prev, { ...medVacio }])
  }

  function quitar(i: number) {
    setMedicamentos((prev) => prev.filter((_, idx) => idx !== i))
  }

  function cambiar(i: number, campo: keyof Medicamento, valor: string) {
    setMedicamentos((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m))
    )
  }

  const formulaValida = !!paciente && medicamentos.every((m) => m.nombre)

  const docPDF = paciente ? (
    <FormulaPDF
      medico={medico}
      paciente={paciente}
      diagnostico={diagnostico}
      medicamentos={medicamentos}
      incluirFirma={incluirFirma}
      fecha={fecha}
    />
  ) : null

  async function guardarEnBD(): Promise<void> {
    if (guardadaId || crearFormula.isPending) return
    try {
      const result = await crearFormula.mutateAsync({
        tipo: 'pos',
        medicamentos: medicamentos.map((m) => ({
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
    } catch {
      // No bloqueamos la impresión si el guardado falla
    }
  }

  async function imprimir() {
    if (!docPDF || !formulaValida) return
    setImprimiendo(true)
    try {
      await guardarEnBD()
      const blob = await pdf(docPDF).toBlob()
      const url = URL.createObjectURL(blob)
      const ventana = window.open(url)
      if (ventana) {
        ventana.addEventListener('load', () => {
          ventana.focus()
          ventana.print()
          ventana.addEventListener('afterprint', () => URL.revokeObjectURL(url))
        })
      }
    } finally {
      setImprimiendo(false)
    }
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
      a.download = `formula_${paciente.documento}_${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: 'var(--hce-card)', borderBottom: '1px solid var(--hce-border)' }}>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/pacientes/${id}/encuentros/${encId}`)}
            className="transition-colors" style={{ color: 'var(--hce-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--hce-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--hce-text-muted)')}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="card-title">
              Nueva fórmula médica
            </h2>
            <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
              {cargandoPaciente || cargandoEncuentro
                ? 'Cargando...'
                : `${paciente?.nombre ?? ''} · ${diagnostico}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Incluir firma */}
          {medico.firmaBase64 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none"
              style={{ color: 'var(--hce-text-muted)' }}>
              <input
                type="checkbox"
                checked={incluirFirma}
                onChange={(e) => setIncluirFirma(e.target.checked)}
                className="rounded"
              />
              Incluir firma
            </label>
          )}

          {/* Toggle vista previa */}
          <button
            onClick={() => setVistaPrevia((v) => !v)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border transition-colors"
            style={{
              borderColor: 'var(--hce-border)',
              color: 'var(--hce-text-muted)',
              backgroundColor: 'transparent',
            }}
          >
            {vistaPrevia ? <EyeOff size={14} /> : <Eye size={14} />}
            {vistaPrevia ? 'Editar' : 'Vista previa'}
          </button>

          {/* Badge guardada */}
          {guardadaId && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              Guardada ✓
            </span>
          )}

          {/* Imprimir */}
          {formulaValida && docPDF && (
            <button
              onClick={imprimir}
              disabled={imprimiendo}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border transition-colors disabled:opacity-50"
              style={{
                borderColor: 'var(--hce-primary)',
                color: 'var(--hce-primary)',
                backgroundColor: 'transparent',
              }}
            >
              <Printer size={15} />
              {imprimiendo ? 'Preparando...' : guardadaId ? 'Reimprimir' : 'Imprimir'}
            </button>
          )}

          {/* Descargar PDF */}
          {formulaValida && docPDF && (
            <button
              onClick={descargar}
              disabled={descargando}
              className="btn-primary disabled:opacity-50"
            >
              <Download size={15} />
              {descargando ? 'Generando...' : 'Guardar PDF'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Panel izquierdo: formulario */}
        <div
          className={`overflow-auto p-6 space-y-4 ${vistaPrevia ? 'hidden' : 'flex-1'}`}
          style={{ backgroundColor: 'var(--hce-bg)' }}
        >
          {!medico.nombre && (
            <div className="rounded-lg px-4 py-3 text-sm bg-amber-50 text-amber-700 border border-amber-200">
              Los datos del médico no están configurados.{' '}
              <button onClick={() => navigate('/configuracion')} className="underline font-medium">
                Completar en Configuración
              </button>
            </div>
          )}

          {medicamentos.map((m, i) => (
            <div key={i} className="card-hce p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="card-title">
                  Medicamento {i + 1}
                </span>
                {medicamentos.length > 1 && (
                  <button onClick={() => quitar(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-hce">Nombre del medicamento *</label>
                  <input value={m.nombre} onChange={(e) => cambiar(i, 'nombre', e.target.value)}
                    placeholder="Ej: Acetaminofén" className="input-hce" />
                </div>
                <div>
                  <label className="label-hce">Concentración</label>
                  <input value={m.concentracion} onChange={(e) => cambiar(i, 'concentracion', e.target.value)}
                    placeholder="Ej: 500 mg" className="input-hce" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-hce">Forma farmacéutica</label>
                  <select value={m.formaFarmaceutica} onChange={(e) => cambiar(i, 'formaFarmaceutica', e.target.value)}
                    className="input-hce">
                    {formasFarmaceuticas.map((f) => (
                      <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                    ))}
                  </select>
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

        {/* Panel derecho o pantalla completa: visor PDF sin toolbar propio */}
        {(vistaPrevia || formulaValida) && docPDF && (
          <div className={`flex flex-col ${vistaPrevia ? 'flex-1' : 'w-96'}`}
            style={{ backgroundColor: '#525659' }}>
            <div className="px-4 py-2 flex items-center justify-between"
              style={{ backgroundColor: '#3c3f41' }}>
              <span className="text-xs" style={{ color: '#b0b0b0' }}>
                {vistaPrevia ? 'Vista previa completa' : 'Vista previa'}
              </span>
              {formulaValida && !vistaPrevia && (
                <span className="text-xs" style={{ color: '#888' }}>
                  Usá los botones de arriba para imprimir o guardar
                </span>
              )}
            </div>
            {/* showToolbar siempre false — usamos nuestros propios botones */}
            <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none', flex: 1 }}>
              {docPDF}
            </PDFViewer>
          </div>
        )}
      </div>
    </div>
  )
}
