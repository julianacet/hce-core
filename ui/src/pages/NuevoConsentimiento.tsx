import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { pdf, PDFViewer } from '@react-pdf/renderer'
import { imprimirConVisorSO } from '../utils/impresion'
import { Printer, CheckCircle2, ChevronDown, AlertTriangle, Eye, EyeOff, UserRound } from 'lucide-react'
import { useMedico } from '../context/MedicoContext'
import { useTema } from '../context/TemaContext'
import { usePlantillas, useGenerarConsentimiento, useFirmarConsentimiento } from '../api/consentimientos'
import type { Paciente } from '../api/pacientes'
import { nombreCompleto } from '../utils/paciente'
import { TAMANO_PAGINA } from '../utils/impresion'
import { Breadcrumb } from '../components/Breadcrumb'
import { BuscadorPaciente } from '../components/BuscadorPaciente'
import EditorConsentimiento from '../components/EditorConsentimiento'
import ModalFirma from '../components/ModalFirma'
import { NavigationGuard } from '../components/NavigationGuard'
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
  const [pacienteFirmaBase64, setPacienteFirmaBase64] = useState<string | null>(null)
  const [imprimiendoSinFirma, setImprimiendoSinFirma] = useState(false)
  const [firmandoEImprimiendo, setFirmandoEImprimiendo] = useState(false)
  const [vistaPrevia, setVistaPrevia] = useState(true)
  const [mostrarModalFirma, setMostrarModalFirma] = useState(false)
  // Se imprime primero (sin guardar nada); solo después se decide si el
  // documento entra al historial. `documentoImpreso` marca que ya se
  // imprimió y hay una decisión pendiente; `resultado` es esa decisión.
  const [documentoImpreso, setDocumentoImpreso] = useState<'sin_firma' | 'firmado' | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState<'guardado' | 'descartado' | null>(null)

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
    setPacienteFirmaBase64(null)
    setDocumentoImpreso(null)
    setResultado(null)
  }

  function cambiarPaciente() {
    setPaciente(null)
    setPacienteFirmaBase64(null)
    setDocumentoImpreso(null)
    setResultado(null)
  }

  function construirDocPDF(firma: string | null) {
    if (!paciente) return null
    return (
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
        pacienteFirmaBase64={firma}
      />
    )
  }

  const docPDF = construirDocPDF(pacienteFirmaBase64)

  // Camino 1: imprimir/descargar el documento tal cual, sin firma digital
  // (para firma manuscrita en papel, o para revisar antes de firmar).
  // No persiste nada todavía — solo genera el PDF y lo manda a imprimir.
  async function handleImprimirSinFirma() {
    if (!paciente || htmlEstaVacio(contenido)) return
    setImprimiendoSinFirma(true)
    try {
      const blob = await pdf(construirDocPDF(null)!).toBlob()
      await imprimirConVisorSO(blob)
      setDocumentoImpreso('sin_firma')
    } finally {
      setImprimiendoSinFirma(false)
    }
  }

  // Camino 2: el paciente firma en la tableta y se imprime de inmediato con
  // la firma incrustada. Tampoco persiste nada — la firma capturada solo se
  // guarda en memoria para incluirla si luego se decide guardar en el historial.
  async function confirmarFirmarEImprimir(firmaBase64: string) {
    if (!paciente || htmlEstaVacio(contenido)) return
    setFirmandoEImprimiendo(true)
    try {
      const blob = await pdf(construirDocPDF(firmaBase64)!).toBlob()
      await imprimirConVisorSO(blob)
      setPacienteFirmaBase64(firmaBase64)
      setMostrarModalFirma(false)
      setDocumentoImpreso('firmado')
    } finally {
      setFirmandoEImprimiendo(false)
    }
  }

  // Única función que persiste algo en la base de datos: se ejecuta solo
  // tras la decisión explícita de guardar, después de haber impreso.
  async function confirmarGuardar() {
    if (!paciente) return
    setGuardando(true)
    try {
      const generado = await generar.mutateAsync({
        plantilla_id: plantillaId,
        paciente_documento: paciente.numero_documento,
        paciente_nombre: nombreCompleto(paciente),
        tipo_documento: paciente.tipo_documento,
        contenido_renderizado: contenido,
      })
      if (pacienteFirmaBase64) {
        await firmar.mutateAsync({ id: generado.id, firma_base64: pacienteFirmaBase64 })
      }
      setResultado('guardado')
    } finally {
      setGuardando(false)
    }
  }

  function descartar() {
    setResultado('descartado')
  }

  const puedeActuar = !!paciente && !htmlEstaVacio(contenido)
  const decisionPendiente = documentoImpreso !== null && resultado === null

  return (
    <div className="page-hce">
      <NavigationGuard when={decisionPendiente} onSaveAndProceed={confirmarGuardar} />

      <Breadcrumb items={[
        { label: 'Inicio', to: '/' },
        { label: 'Consentimientos', to: '/consentimientos' },
        { label: 'Nuevo consentimiento' },
      ]} />

      <div className="page-header">
        <div>
          <h2 className="page-title">Nuevo consentimiento</h2>
          <p className="page-desc">Selecciona el paciente y la plantilla, luego imprime sin firma o firma digitalmente en la tableta</p>
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

      {/* ── Búsqueda de paciente — ancho completo, fuera de las columnas ──── */}
      {!paciente && (
        <BuscadorPaciente
          selectedDocumento={null}
          onSelect={seleccionarPaciente}
        />
      )}

      {/* ── Contexto del paciente seleccionado — ancho completo ───────────── */}
      {paciente && (
        <div
          className="card-hce px-5 py-4 flex items-center gap-4 mb-5"
          style={{ borderColor: 'var(--hce-primary)', borderLeftWidth: '4px' }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--hce-primary)' }}
          >
            <UserRound size={18} style={{ color: '#fff' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--hce-text)' }}>
              {nombreCompleto(paciente)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
              {paciente.tipo_documento} {paciente.numero_documento}
              {paciente.edad != null ? ` · ${paciente.edad} años` : ''}
              {paciente.tipo_usuario_nombre ? ` · ${paciente.tipo_usuario_nombre}` : ''}
            </p>
          </div>
          <button
            onClick={cambiarPaciente}
            disabled={decisionPendiente}
            className="btn-secondary text-xs shrink-0 disabled:opacity-40"
            type="button"
          >
            Cambiar paciente
          </button>
        </div>
      )}

      <div className="flex gap-5 items-start">
      <div className="space-y-5 flex-1 min-w-0">

        {/* Plantilla + Contenido */}
        {paciente && (
        <div className="card-hce p-5 space-y-5">

          {decisionPendiente && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="card-hce p-6 w-full max-w-sm space-y-4 shadow-xl">
                <p className="text-sm font-medium" style={{ color: 'var(--hce-text)' }}>
                  ¿Desea guardar registro del documento {documentoImpreso === 'firmado' ? 'firmado' : 'impreso'}?
                </p>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={descartar} disabled={guardando} className="btn-secondary text-sm">
                    No guardar
                  </button>
                  <button type="button" onClick={confirmarGuardar} disabled={guardando} className="btn-primary text-sm">
                    {guardando ? 'Guardando...' : 'Guardar en el historial'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={documentoImpreso ? 'opacity-40 pointer-events-none space-y-5' : 'space-y-5'}>
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
          </div>

          {mostrarModalFirma && (
            <ModalFirma
              onGuardar={confirmarFirmarEImprimir}
              onCancelar={() => setMostrarModalFirma(false)}
              guardando={firmandoEImprimiendo}
            />
          )}

          {resultado && (
            <div
              className="rounded-md border px-4 py-3 flex items-center gap-2"
              style={{ backgroundColor: 'var(--hce-success-bg)', borderColor: 'var(--hce-success-border)' }}
            >
              <CheckCircle2 size={16} style={{ color: 'var(--hce-success)' }} className="shrink-0" />
              <p className="text-sm font-medium" style={{ color: 'var(--hce-success)' }}>
                {resultado === 'guardado'
                  ? 'Consentimiento guardado en el historial.'
                  : 'Consentimiento impreso, sin guardar en el historial.'}
              </p>
            </div>
          )}

          {/* Acciones: dos caminos independientes — con o sin firma digital.
              Se ocultan una vez impreso: a partir de ahí solo cabe la decisión
              de guardar o no guardar (panel de arriba). */}
          {!documentoImpreso && (
            <div className="flex flex-wrap gap-3 pt-2 border-t" style={{ borderColor: 'var(--hce-border)' }}>
              <button onClick={() => navigate('/consentimientos')} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleImprimirSinFirma}
                disabled={!puedeActuar || imprimiendoSinFirma}
                className="btn-secondary"
              >
                <Printer size={14} />
                {imprimiendoSinFirma ? 'Generando...' : 'Imprimir sin firma'}
              </button>
              <button
                onClick={() => setMostrarModalFirma(true)}
                disabled={!puedeActuar || firmandoEImprimiendo}
                className="btn-primary"
              >
                <CheckCircle2 size={14} />
                Firmar digitalmente e imprimir
              </button>
            </div>
          )}
        </div>
        )}
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
