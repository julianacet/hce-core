import { useNavigate, useParams } from 'react-router'
import { FileText, Activity, Receipt, ScrollText, Download, Printer } from 'lucide-react'
import { useState } from 'react'
import { pdf, PDFDownloadLink } from '@react-pdf/renderer'
import { useEncuentro } from '../../api/encuentros'
import { useAuditoriaEncuentro } from '../../api/auditoria'
import { usePaciente } from '../../api/pacientes'
import { usePlantillas, useConsentimientoEncuentro, useRegistrarConsentimiento } from '../../api/consentimientos'
import { useMedico } from '../../context/MedicoContext'
import ConsentimientoPDF from '../../components/pdf/ConsentimientoPDF'

const finalidades: Record<string, string> = {
  '10': 'Consulta de primera vez',
  '11': 'Consulta de control',
  '12': 'Urgencias',
}

const causasExternas: Record<string, string> = {
  '13': 'Enfermedad general',
  '01': 'Accidente de trabajo',
  '02': 'Accidente de tránsito',
}

const viasIngreso: Record<string, string> = {
  '02': 'Consulta externa',
  '01': 'Urgencias',
  '03': 'Hospitalización',
}

const colorAccion: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
}

function renderContenido(contenido: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (text, [key, val]) => text.replaceAll(`{{${key}}}`, val),
    contenido,
  )
}

export default function DetalleEncuentro() {
  const { id, encId } = useParams()
  const navigate = useNavigate()
  const { medico } = useMedico()
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState('')
  const [imprimiendo, setImprimiendo] = useState(false)

  const { data: e, isLoading, isError } = useEncuentro(id ?? '', encId ?? '')
  const { data: logs = [] } = useAuditoriaEncuentro(encId ?? '')
  const { data: paciente } = usePaciente(id ?? '')
  const { data: plantillas = [] } = usePlantillas()
  const { data: consentimientoPrevio } = useConsentimientoEncuentro(id ?? '', encId ?? '')
  const registrar = useRegistrarConsentimiento(id ?? '', encId ?? '')

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-400">Cargando encuentro...</div>
  }

  if (isError || !e) {
    return <div className="p-6 text-sm text-red-500">Error al cargar el encuentro.</div>
  }

  const diagnostico = [e.codigo_diagnostico_principal, e.descripcion_diagnostico].filter(Boolean).join(' - ')

  const pacienteNombre = paciente
    ? [paciente.nombre_primero, paciente.nombre_segundo, paciente.apellido_primero, paciente.apellido_segundo]
        .filter(Boolean).join(' ')
    : id ?? ''

  const plantillaActiva = plantillas.find((p) => p.id === plantillaSeleccionada)
  const fecha = new Date(e.fecha_atencion).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  const vars: Record<string, string> = {
    paciente_nombre: pacienteNombre,
    paciente_documento: paciente?.numero_documento ?? id ?? '',
    tipo_documento: paciente?.tipo_documento ?? '',
    medico_nombre: medico.nombre,
    consultorio: medico.nombreConsultorio,
    ciudad: medico.ciudad,
    fecha,
  }

  const contenidoRenderizado = plantillaActiva ? renderContenido(plantillaActiva.contenido, vars) : ''

  const docPDF = contenidoRenderizado ? (
    <ConsentimientoPDF
      medico={medico}
      pacienteNombre={pacienteNombre}
      pacienteDocumento={paciente?.numero_documento ?? id ?? ''}
      tipoDocumento={paciente?.tipo_documento ?? ''}
      contenidoRenderizado={contenidoRenderizado}
      fecha={fecha}
    />
  ) : null

  async function handleImprimir() {
    if (!docPDF) return
    setImprimiendo(true)
    try {
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
      await registrar.mutateAsync({ plantilla_id: plantillaSeleccionada, contenido_renderizado: contenidoRenderizado })
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Detalle del encuentro */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Detalle del encuentro clínico</h3>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">v{e.numero_version}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            ['Fecha', new Date(e.fecha_atencion).toLocaleString('es-CO')],
            ['Finalidad', finalidades[e.finalidad_consulta] ?? e.finalidad_consulta],
            ['Causa externa', causasExternas[e.causa_externa] ?? e.causa_externa],
            ['Vía de ingreso', viasIngreso[e.via_ingreso] ?? e.via_ingreso],
            ['Registrado por', e.creado_por],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 mb-0.5">{label}</p>
              <p className="text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          {[
            ['Motivo de consulta', e.motivo_consulta],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="text-sm text-slate-800 leading-relaxed">{value}</p>
            </div>
          ))}

          {/* Signos vitales */}
          {(e.ta_sistolica || e.frecuencia_cardiaca || e.temperatura || e.saturacion_o2 || e.peso) && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Signos vitales</p>
              <div className="grid grid-cols-4 gap-3">
                {e.ta_sistolica && e.ta_diastolica && (
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-slate-800">{e.ta_sistolica}/{e.ta_diastolica}</p>
                    <p className="text-xs text-slate-400">TA mmHg</p>
                  </div>
                )}
                {e.frecuencia_cardiaca && (
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-slate-800">{e.frecuencia_cardiaca}</p>
                    <p className="text-xs text-slate-400">FC lpm</p>
                  </div>
                )}
                {e.frecuencia_respiratoria && (
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-slate-800">{e.frecuencia_respiratoria}</p>
                    <p className="text-xs text-slate-400">FR rpm</p>
                  </div>
                )}
                {e.temperatura && (
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-slate-800">{e.temperatura}°C</p>
                    <p className="text-xs text-slate-400">Temperatura</p>
                  </div>
                )}
                {e.saturacion_o2 && (
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-slate-800">{e.saturacion_o2}%</p>
                    <p className="text-xs text-slate-400">SpO₂</p>
                  </div>
                )}
                {e.peso && (
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-slate-800">{e.peso} kg</p>
                    <p className="text-xs text-slate-400">Peso</p>
                  </div>
                )}
                {e.talla && (
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-slate-800">{e.talla} cm</p>
                    <p className="text-xs text-slate-400">Talla</p>
                  </div>
                )}
                {e.peso && e.talla && (
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-slate-800">
                      {(e.peso / Math.pow(e.talla / 100, 2)).toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-400">IMC kg/m²</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {[
            ['Examen físico', e.examen_fisico],
            ['Diagnóstico principal', diagnostico],
            ['Plan de manejo', e.plan_manejo],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="text-sm text-slate-800 leading-relaxed">{value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">Este registro es inmutable. Para modificar, se creará una nueva versión.</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/pacientes/${id}/encuentros/${encId}/formula`)}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-blue-700 text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <FileText size={15} />
              Fórmula médica
            </button>
            <button
              onClick={() => navigate(`/pacientes/${id}/encuentros/${encId}/facturas/nueva`)}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-md transition-colors"
            >
              <Receipt size={15} />
              Generar factura
            </button>
          </div>
        </div>
      </div>

      {/* Consentimiento informado */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ScrollText size={16} className="text-slate-400" />
          <h3 className="text-sm font-medium text-slate-700">Consentimiento informado</h3>
          {consentimientoPrevio && (
            <span className="ml-auto text-xs text-slate-400">
              Generado el {new Date(consentimientoPrevio.fecha_generacion).toLocaleDateString('es-CO')}
            </span>
          )}
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label-hce">Plantilla</label>
            <select
              value={plantillaSeleccionada}
              onChange={(e) => setPlantillaSeleccionada(e.target.value)}
              className="input-hce"
            >
              <option value="">Seleccioná una plantilla…</option>
              {plantillas.filter((p) => p.esta_activo).map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleImprimir}
            disabled={!plantillaSeleccionada || imprimiendo}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            <Printer size={14} />
            {imprimiendo ? 'Preparando...' : 'Imprimir'}
          </button>

          {docPDF && (
            <PDFDownloadLink
              document={docPDF}
              fileName={`consentimiento_${paciente?.numero_documento ?? id}_${Date.now()}.pdf`}
            >
              {({ loading }) => (
                <button
                  disabled={loading || !plantillaSeleccionada}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-blue-700 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40"
                >
                  <Download size={14} />
                  {loading ? 'Generando...' : 'Descargar PDF'}
                </button>
              )}
            </PDFDownloadLink>
          )}
        </div>
      </div>

      {/* Log de auditoría del encuentro */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Activity size={16} className="text-slate-400" />
          <h3 className="text-sm font-medium text-slate-700">Historial de cambios</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {logs.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-slate-400">Sin registros de cambios.</div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-4 text-sm">
              <span className={`mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${colorAccion[log.accion] ?? 'bg-slate-100 text-slate-600'}`}>
                {log.accion}
              </span>
              <div className="flex-1 min-w-0 text-xs text-slate-400 truncate">
                {log.datos_nuevos ?? log.datos_anteriores ?? '—'}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">{log.usuario_id ?? '—'}</p>
                <p className="text-xs text-slate-400">{new Date(log.fecha_cambio).toLocaleString('es-CO')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
