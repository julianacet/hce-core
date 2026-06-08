import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { pdf } from '@react-pdf/renderer'
import { imprimirConVisorSO } from '../utils/impresion'
import { Printer, CheckCircle2, ChevronDown } from 'lucide-react'
import { useMedico } from '../context/MedicoContext'
import { useTema } from '../context/TemaContext'
import { usePlantillas, useGenerarConsentimiento, useFirmarConsentimiento } from '../api/consentimientos'
import type { Paciente } from '../api/pacientes'
import { nombreCompleto } from '../utils/paciente'
import { TAMANO_PAGINA } from '../utils/impresion'
import { Breadcrumb } from '../components/Breadcrumb'
import { BuscadorPaciente } from '../components/BuscadorPaciente'
import ConsentimientoPDF from '../components/pdf/ConsentimientoPDF'

function formatFechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function renderizarPlantilla(contenido: string, vars: Record<string, string>): string {
  return contenido.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
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
  const [idGenerado, setIdGenerado] = useState<string | null>(null)
  const [firmadoExito, setFirmadoExito] = useState(false)
  const [generando, setGenerando] = useState(false)

  const generar = useGenerarConsentimiento()
  const firmar = useFirmarConsentimiento()

  useEffect(() => {
    if (!plantillaId && plantillasActivas.length > 0) {
      setPlantillaId(plantillasActivas[0].id)
    }
  }, [plantillasActivas.length])

  useEffect(() => {
    const plantilla = plantillasActivas.find(p => p.id === plantillaId)
    if (!plantilla) { setContenido(''); return }
    const vars: Record<string, string> = {
      paciente_nombre: paciente ? nombreCompleto(paciente) : '{{paciente_nombre}}',
      paciente_documento: paciente?.numero_documento ?? '{{paciente_documento}}',
      tipo_documento: paciente?.tipo_documento ?? '{{tipo_documento}}',
      medico_nombre: medico.nombre ?? '',
      consultorio: medico.nombreConsultorio ?? '',
      ciudad: medico.ciudad ?? '',
      fecha: formatFechaLarga(new Date()),
    }
    setContenido(renderizarPlantilla(plantilla.contenido, vars))
  }, [plantillaId, paciente, plantillasActivas.length])

  function seleccionarPaciente(p: Paciente) {
    setPaciente(p)
    setIdGenerado(null)
    setFirmadoExito(false)
  }

  async function handleGenerarImprimir() {
    if (!paciente || !contenido.trim()) return
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

      const tamano = TAMANO_PAGINA[medico.impresion.consentimiento]
      const blob = await pdf(
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
          tamano={tamano}
          colorPrimario={tema.colorPrimario}
          logoBase64={tema.logoBase64}
          logoTextoBase64={medico.logoTextoBase64}
        />
      ).toBlob()
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

  const puedeGenerar = !!paciente && !!contenido.trim() && !generando

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
        <button onClick={() => navigate('/consentimientos')} className="btn-secondary">
          Cancelar
        </button>
      </div>

      <div className="space-y-5">

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
            <textarea
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              rows={14}
              placeholder="Selecciona una plantilla para ver el contenido..."
              className="input-hce resize-y font-mono leading-relaxed"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--hce-text-muted)' }}>
              Puedes editar el texto antes de generar el PDF.
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
    </div>
  )
}
