import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { PDFViewer, PDFDownloadLink, pdf } from '@react-pdf/renderer'
import { Plus, Trash2, Download, Printer, ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { useMedico } from '../../context/MedicoContext'
import FormulaPDF, { type Medicamento } from '../../components/pdf/FormulaPDF'

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

// Vendrán de la API cuando el backend esté listo
const pacienteMock = {
  nombre: 'María García López',
  documento: '1234567890',
  tipoDocumento: 'CC',
  fechaNacimiento: '12/03/1985',
}
const diagnosticoMock = 'J00 - Rinofaringitis aguda'

export default function NuevaFormula() {
  const { id, encId } = useParams()
  const navigate = useNavigate()
  const { medico } = useMedico()

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([{ ...medVacio }])
  const [incluirFirma, setIncluirFirma] = useState(!!medico.firmaBase64)
  const [vistaPrevia, setVistaPrevia] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)

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

  const formulaValida = medicamentos.every((m) => m.nombre && m.dosis && m.frecuencia)

  const docPDF = (
    <FormulaPDF
      medico={medico}
      paciente={pacienteMock}
      diagnostico={diagnosticoMock}
      medicamentos={medicamentos}
      incluirFirma={incluirFirma}
      fecha={fecha}
    />
  )

  // Genera el PDF como blob y abre el diálogo de impresión del sistema operativo
  async function imprimir() {
    setImprimiendo(true)
    try {
      const blob = await pdf(docPDF).toBlob()
      const url = URL.createObjectURL(blob)
      const ventana = window.open(url)
      if (ventana) {
        ventana.addEventListener('load', () => {
          ventana.focus()
          ventana.print()
          // Libera la URL del blob cuando se cierre el diálogo
          ventana.addEventListener('afterprint', () => URL.revokeObjectURL(url))
        })
      }
    } finally {
      setImprimiendo(false)
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
            <h2 className="text-base font-semibold" style={{ color: 'var(--hce-text)' }}>
              Nueva fórmula médica
            </h2>
            <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
              {pacienteMock.nombre} · {diagnosticoMock}
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

          {/* Imprimir */}
          {formulaValida && (
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
              {imprimiendo ? 'Preparando...' : 'Imprimir'}
            </button>
          )}

          {/* Descargar PDF */}
          {formulaValida && (
            <PDFDownloadLink
              document={docPDF}
              fileName={`formula_${pacienteMock.documento}_${Date.now()}.pdf`}
            >
              {({ loading }) => (
                <button
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  <Download size={15} />
                  {loading ? 'Generando...' : 'Guardar PDF'}
                </button>
              )}
            </PDFDownloadLink>
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
                <span className="text-sm font-medium" style={{ color: 'var(--hce-text)' }}>
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
                  <label className="label-hce">Dosis *</label>
                  <input value={m.dosis} onChange={(e) => cambiar(i, 'dosis', e.target.value)}
                    placeholder="Ej: 1 tableta" className="input-hce" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label-hce">Frecuencia *</label>
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
        {(vistaPrevia || formulaValida) && (
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
