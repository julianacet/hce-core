import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { pdf, PDFViewer } from '@react-pdf/renderer'
import { imprimirConVisorSO } from '../utils/impresion'
import { Printer, CheckCircle2, ChevronDown, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { useMedico } from '../context/MedicoContext'
import { useTema } from '../context/TemaContext'
import { usePlantillas, useGenerarConsentimiento, useFirmarConsentimiento } from '../api/consentimientos'
import type { Paciente } from '../api/pacientes'
import { nombreCompleto } from '../utils/paciente'
import { TAMANO_PAGINA } from '../utils/impresion'
import { Breadcrumb } from '../components/Breadcrumb'
import { BuscadorPaciente } from '../components/BuscadorPaciente'
import EditorConsentimiento from '../components/EditorConsentimiento'
import ConsentimientoPDF from '../components/pdf/ConsentimientoPDF'
import { asegurarHtml, escapeHtml, htmlEstaVacio } from '../utils/textoEnriquecido'

function formatFechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// Línea en blanco para completar a mano, como en un formulario impreso —
// se usa cuando una variable no tiene dato disponible (en vez de dejar el
// {{token}} literal o un vacío que rompe la redacción del documento legal).
const SIN_DATO = '_'.repeat(20)

// `contenido` ya es HTML (ver asegurarHtml). Los valores se escapan antes de
// insertarse para que datos del paciente/médico no puedan inyectar HTML.
function renderizarPlantilla(
  contenidoHtml: string, vars: Record<string, string>,
): { texto: string; faltantes: string[] } {
  const faltantes: string[] = []
  const texto = contenidoHtml.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    const v = vars[k]
    if (v && v.trim()) return escapeHtml(v)
    if (!faltantes.includes(k)) faltantes.push(k)
    return SIN_DATO
  })
  return { texto, faltantes }
}

export default function NuevoConsentimiento() {
  const navigate = useNavigate()
  const { medico } = useMedico()
  const { tema } = useTema()
  const { data: plantillas = [] } = usePlantillas()
  const plantillasActivas = plantillas.filter(p => p.esta_activo)

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [plantillaId, setPlantillaId] = useState(plantillasActivas[0]?.id ?? '')
  const [contenido, setContenido] = useState('')
  const [variablesFaltantes, setVariablesFaltantes] = useState<string[]>([])
  const [idGenerado, setIdGenerado] = useState<string | null>(null)
  const [firmadoExito, setFirmadoExito] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [vistaPrevia, setVistaPrevia] = useState(false)

  const generar = useGenerarConsentimiento()
  const firmar = useFirmarConsentimiento()

  useEffect(() => {
    if (!plantillaId && plantillasActivas.length > 0) {
      setPlantillaId(plantillasActivas[0].id)
    }
  }, [plantillasActivas.length])

  useEffect(() => {
    const plantilla = plantillasActivas.find(p => p.id === plantillaId)
    if (!plantilla) { setContenido(''); setVariablesFaltantes([]); return }
    const vars: Record<string, string> = {
      paciente_nombre: paciente ? nombreCompleto(paciente) : '',
      paciente_documento: paciente?.numero_documento ?? '',
      tipo_documento: paciente?.tipo_documento ?? '',
      paciente_edad: paciente?.edad != null ? String(paciente.edad) : '',
      paciente_genero: paciente?.genero_nombre ?? '',
      paciente_direccion: paciente?.direccion ?? '',
      paciente_telefono: paciente?.telefono ?? '',
      responsable_nombre: paciente?.nombre_responsable ?? '',
      responsable_parentesco: paciente?.parentesco_responsable ?? '',
      responsable_telefono: paciente?.telefono_responsable ?? '',
      medico_nombre: medico.nombre ?? '',
      consultorio: medico.nombreConsultorio ?? '',
      ciudad: medico.ciudad ?? '',
      fecha: formatFechaLarga(new Date()),
    }
    const { texto, faltantes } = renderizarPlantilla(asegurarHtml(plantilla.contenido), vars)
    setContenido(texto)
    setVariablesFaltantes(faltantes)
  }, [plantillaId, paciente, plantillasActivas.length])

  function seleccionarPaciente(p: Paciente) {
    setPaciente(p)
    setIdGenerado(null)
    setFirmadoExito(false)
  }

  const docPDF = paciente ? (
    <ConsentimientoPDF
      medico={medico}
      pacienteNombre={nombreCompleto(paciente)}
      pacienteDocumento={paciente.numero_documento}
      tipoDocumento={paciente.tipo_documento}
      contenidoRenderizado={contenido}
      fecha={formatFechaLarga(new Date())}
      fechaImpresion={new Date().toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
      })}
      tamano={TAMANO_PAGINA[medico.impresion.consentimiento]}
      colorPrimario={tema.colorPrimario}
      logoBase64={tema.logoBase64}
      logoTextoBase64={medico.logoTextoBase64}
    />
  ) : null

  async function handleGenerarImprimir() {
    if (!paciente || htmlEstaVacio(contenido) || !docPDF) return
    setGenerando(true)
    try {
      const c = await generar.mutateAsync({
        plantilla_id: plantillaId,
        paciente_documento: paciente.numero_documento,
        paciente_nombre: nombreCompleto(paciente),
        tipo_documento: paciente.tipo_documento,
        contenido_renderizado: contenido,
      })
      setIdGenerado(c.id)

      const blob = await pdf(docPDF).toBlob()
      await imprimirConVisorSO(blob)
    } finally {
      setGenerando(false)
    }
  }

  async function handleFirmar() {
    if (!idGenerado) return
    await firmar.mutateAsync(idGenerado)
    setFirmadoExito(true)
  }

  const puedeGenerar = !!paciente && !htmlEstaVacio(contenido) && !generando

  return (
    <div className="page-hce">
      <Breadcrumb items={[
        { label: 'Inicio', to: '/' },
        { label: 'Consentimientos', to: '/consentimientos' },
        { label: 'Nuevo consentimiento' },
      ]} />

      <div className="page-header">
        <div>
          <h2 className="page-title">Nuevo consentimiento</h2>
          <p className="page-desc">Selecciona el paciente, la plantilla y genera el PDF para imprimir</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setVistaPrevia(v => !v)}
            disabled={!docPDF}
            className="btn-secondary flex items-center gap-1.5 disabled:opacity-40"
          >
            {vistaPrevia ? <EyeOff size={14} /> : <Eye size={14} />}
            {vistaPrevia ? 'Ocultar vista previa' : 'Vista previa'}
          </button>
          <button onClick={() => navigate('/consentimientos')} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
      <div className="space-y-5 flex-1 min-w-0">

        {/* Paciente */}
        <div>
          <label className="label-hce">Paciente</label>
          <BuscadorPaciente
            selectedDocumento={paciente?.numero_documento ?? null}
            onSelect={seleccionarPaciente}
          />
        </div>

        {/* Plantilla + Contenido */}
        <div className="card-hce p-5 space-y-5">

          <div>
            <label className="label-hce">Plantilla</label>
            {plantillasActivas.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--hce-text-muted)' }}>
                No hay plantillas activas. Crea una en Administración → Consentimientos.
              </p>
            ) : (
              <div className="relative max-w-sm">
                <select
                  value={plantillaId}
                  onChange={e => setPlantillaId(e.target.value)}
                  className="input-hce appearance-none pr-8"
                >
                  {plantillasActivas.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--hce-text-muted)' }} />
              </div>
            )}
          </div>

          <div>
            <label className="label-hce">Contenido</label>
            {variablesFaltantes.length > 0 && (
              <div
                className="rounded-md border px-3 py-2 mb-2 flex items-start gap-2"
                style={{ backgroundColor: 'var(--hce-warning-bg)', borderColor: 'var(--hce-warning-border)' }}
              >
                <AlertTriangle size={14} style={{ color: 'var(--hce-warning)' }} className="shrink-0 mt-0.5" />
                <div className="text-xs" style={{ color: 'var(--hce-warning)' }}>
                  <p className="font-medium mb-1">
                    Estas variables no tienen datos disponibles y se dejarán en blanco (línea para completar a mano):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {variablesFaltantes.map(v => (
                      <span
                        key={v}
                        title={`{{${v}}} no tiene dato disponible. Se imprime como una línea en blanco para completar a mano — puedes editar el texto de abajo para escribir el valor manualmente o dejarlo en blanco.`}
                        className="font-mono px-1.5 py-0.5 rounded border cursor-help"
                        style={{ borderColor: 'var(--hce-warning-border)' }}
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <EditorConsentimiento
              value={contenido}
              onChange={setContenido}
              placeholder="Selecciona una plantilla para ver el contenido..."
            />
            <p className="text-xs mt-1" style={{ color: 'var(--hce-text-muted)' }}>
              Puedes editar el texto antes de generar el PDF. Usa "Vista previa" para ver cómo queda el documento.
            </p>
          </div>

          {/* Estado post-generación */}
          {idGenerado && !firmadoExito && (
            <div
              className="rounded-md border px-4 py-3"
              style={{ backgroundColor: 'var(--hce-warning-bg)', borderColor: 'var(--hce-warning-border)' }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--hce-warning)' }}>
                Consentimiento generado e impreso
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--hce-warning)' }}>
                Entrega el documento al paciente para que lo firme. Una vez firmado, regístralo aquí.
              </p>
              <button onClick={handleFirmar} disabled={firmar.isPending} className="btn-primary">
                <CheckCircle2 size={14} />
                {firmar.isPending ? 'Registrando...' : 'Registrar como firmado'}
              </button>
            </div>
          )}

          {firmadoExito && (
            <div
              className="rounded-md border px-4 py-3 flex items-center justify-between gap-4"
              style={{ backgroundColor: 'var(--hce-success-bg)', borderColor: 'var(--hce-success-border)' }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} style={{ color: 'var(--hce-success)' }} className="shrink-0" />
                <p className="text-sm font-medium" style={{ color: 'var(--hce-success)' }}>
                  Consentimiento registrado como firmado.
                </p>
              </div>
              <button onClick={() => navigate('/consentimientos')} className="btn-primary shrink-0">
                Ir a consentimientos
              </button>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--hce-border)' }}>
            <button onClick={() => navigate('/consentimientos')} className="btn-secondary">
              Cancelar
            </button>
            <button
              onClick={handleGenerarImprimir}
              disabled={!puedeGenerar}
              className="btn-primary"
            >
              <Printer size={14} />
              {generando ? 'Generando...' : 'Generar e imprimir'}
            </button>
          </div>
        </div>
      </div>

      {vistaPrevia && docPDF && (
        <div
          className="w-[440px] shrink-0 sticky top-4 flex flex-col rounded-lg overflow-hidden"
          style={{ height: 'calc(100vh - 160px)', backgroundColor: '#525659' }}
        >
          <div className="px-4 py-2 flex items-center justify-between shrink-0" style={{ backgroundColor: '#3c3f41' }}>
            <span className="text-xs" style={{ color: '#b0b0b0' }}>Vista previa</span>
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
