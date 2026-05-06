import { useNavigate, useParams } from 'react-router'
import { FileText, Activity, Receipt, ScrollText, Download, Printer, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { pdf, PDFDownloadLink } from '@react-pdf/renderer'
import { useEncuentro, type ValorNormalNotas } from '../../api/encuentros'
import { useAuditoriaEncuentro } from '../../api/auditoria'
import { usePaciente } from '../../api/pacientes'
import { usePlantillas, useConsentimientoEncuentro, useRegistrarConsentimiento } from '../../api/consentimientos'
import { useMedico } from '../../context/MedicoContext'
import ConsentimientoPDF from '../../components/pdf/ConsentimientoPDF'
import FormulaPDF, { type Medicamento } from '../../components/pdf/FormulaPDF'
import { useAntecedentes } from '../../api/antecedentes'
import { useCamposClinicosActivos } from '../../api/campos_clinicos'
import { useFormulas, type FormulaGuardada } from '../../api/formulas'


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
  const [imprimiendoFormulaId, setImprimiendoFormulaId] = useState<string | null>(null)

  const { data: e, isLoading, isError } = useEncuentro(id ?? '', encId ?? '')
  const { data: logs = [] } = useAuditoriaEncuentro(encId ?? '')
  const { data: paciente } = usePaciente(id ?? '')
  const { data: plantillas = [] } = usePlantillas()
  const { data: consentimientoPrevio } = useConsentimientoEncuentro(id ?? '', encId ?? '')
  const registrar = useRegistrarConsentimiento(id ?? '', encId ?? '')
  const { data: antecedentes } = useAntecedentes(id ?? '')
  const { data: campos = [] } = useCamposClinicosActivos()
  const { data: formulas = [] } = useFormulas(id ?? '', encId ?? '')

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

  async function handleReimprimirFormula(formula: FormulaGuardada) {
    setImprimiendoFormulaId(formula.id)
    try {
      const meds: Medicamento[] = formula.medicamentos.map((m) => ({
        nombre: m.nombre_medicamento,
        concentracion: m.concentracion ?? '',
        formaFarmaceutica: m.forma_farmaceutica ?? 'tableta',
        dosis: m.dosis,
        frecuencia: m.frecuencia,
        duracion: m.duracion_tratamiento,
        cantidad: m.cantidad_dispensar?.toString() ?? '',
        indicaciones: m.indicaciones ?? '',
      }))
      const fechaFormula = new Date(formula.fecha_creacion).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
      const blob = await pdf(
        <FormulaPDF
          medico={medico}
          paciente={{
            nombre: pacienteNombre,
            documento: paciente?.numero_documento ?? id ?? '',
            tipoDocumento: paciente?.tipo_documento ?? '',
            fechaNacimiento: paciente ? new Date(paciente.fecha_nacimiento).toLocaleDateString('es-CO') : '',
          }}
          diagnostico={diagnostico}
          medicamentos={meds}
          incluirFirma={!!medico.firmaBase64}
          fecha={fechaFormula}
        />
      ).toBlob()
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
      setImprimiendoFormulaId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Detalle del encuentro */}
      <div className="card-hce p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="card-title">Detalle del encuentro clínico</h3>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">v{e.numero_version}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            ['Fecha', new Date(e.fecha_atencion).toLocaleString('es-CO')],
            ['Finalidad', e.finalidad_consulta_nombre],
            ['Causa externa', e.causa_externa_nombre],
            ['Vía de ingreso', e.via_ingreso_nombre],
            ['Registrado por', e.creado_por],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 mb-0.5">{label}</p>
              <p className="text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          {e.motivo_consulta && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Motivo de consulta</p>
              <p className="text-sm text-slate-800 leading-relaxed">{e.motivo_consulta}</p>
            </div>
          )}

          {/* Signos vitales */}
          {e.signos_vitales && Object.keys(e.signos_vitales).length > 0 && (() => {
            const sv = e.signos_vitales!
            const camposSignos = campos.filter(c => c.seccion === 'signos_vitales')
            const rendered = new Set<string>()
            const chips: React.ReactNode[] = []

            for (const c of camposSignos) {
              if (rendered.has(c.clave) || !sv[c.clave]) continue
              rendered.add(c.clave)

              if (c.clave === 'ta_sistolica' && sv['ta_diastolica']) {
                rendered.add('ta_diastolica')
                chips.push(
                  <div key="ta" className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-slate-800">{sv['ta_sistolica']}/{sv['ta_diastolica']}</p>
                    <p className="text-xs text-slate-400">TA mmHg</p>
                  </div>
                )
                continue
              }

              chips.push(
                <div key={c.clave} className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    {sv[c.clave]}{c.unidad ? ` ${c.unidad}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">{c.nombre}</p>
                </div>
              )
            }

            // IMC calculado
            if (sv['peso'] && sv['talla']) {
              const p = parseFloat(sv['peso']), t = parseFloat(sv['talla'])
              if (p && t) chips.push(
                <div key="imc" className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-semibold text-slate-800">{(p / Math.pow(t / 100, 2)).toFixed(1)}</p>
                  <p className="text-xs text-slate-400">IMC kg/m²</p>
                </div>
              )
            }

            if (chips.length === 0) return null
            return (
              <div>
                <p className="text-xs text-slate-400 mb-2">Signos vitales</p>
                <div className="grid grid-cols-4 gap-3">{chips}</div>
              </div>
            )
          })()}

          {/* Examen físico */}
          {e.examen_fisico && Object.keys(e.examen_fisico).length > 0 && (() => {
            const ef = e.examen_fisico!
            const camposExamen = campos.filter(c => c.seccion === 'examen_fisico')
            const filas: React.ReactNode[] = []

            for (const c of camposExamen) {
              const val = ef[c.clave]
              if (val === undefined || val === null) continue
              if (c.tipo === 'texto') {
                if (typeof val === 'string' && val.trim()) {
                  filas.push(
                    <div key={c.clave} className="flex gap-2 text-sm">
                      <span className="text-slate-400 shrink-0 w-40">{c.nombre}</span>
                      <span className="text-slate-800">{val}</span>
                    </div>
                  )
                }
              } else {
                const v = val as ValorNormalNotas
                const notas = v.notas?.trim()
                filas.push(
                  <div key={c.clave} className="flex gap-2 text-sm">
                    <span className="text-slate-400 shrink-0 w-40">{c.nombre}</span>
                    {v.normal && !notas
                      ? <span className="text-green-700 text-xs">Normal</span>
                      : <span className="text-slate-800">{notas || '—'}</span>
                    }
                  </div>
                )
              }
            }

            if (filas.length === 0) return null
            return (
              <div>
                <p className="text-xs text-slate-400 mb-2">Examen físico</p>
                <div className="space-y-1">{filas}</div>
              </div>
            )
          })()}

          {/* Diagnósticos */}
          {(e.diagnosticos && e.diagnosticos.length > 0) ? (
            <div>
              <p className="text-xs text-slate-400 mb-2">Diagnósticos</p>
              <div className="space-y-1.5">
                {e.diagnosticos.map((d) => (
                  <div key={d.id} className="flex items-baseline gap-2 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      d.tipo === 'principal' ? 'bg-blue-100 text-blue-700'
                      : d.tipo === 'secundario' ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-100 text-amber-700'
                    }`}>
                      {d.tipo === 'principal' ? 'Principal'
                        : d.tipo === 'secundario' ? 'Secundario'
                        : 'Nota'}
                    </span>
                    {d.codigo && (
                      <span className="font-mono text-xs text-slate-500">{d.codigo}</span>
                    )}
                    <span className="text-slate-800">{d.descripcion}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : diagnostico ? (
            <div>
              <p className="text-xs text-slate-400 mb-1">Diagnóstico principal</p>
              <p className="text-sm text-slate-800 leading-relaxed">{diagnostico}</p>
            </div>
          ) : null}

          {e.plan_manejo && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Plan de manejo</p>
              <p className="text-sm text-slate-800 leading-relaxed">{e.plan_manejo}</p>
            </div>
          )}
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
              className="btn-primary"
            >
              <Receipt size={15} />
              Generar factura
            </button>
          </div>
        </div>
      </div>

      {/* Antecedentes */}
      {antecedentes && Object.values(antecedentes).some(qs => qs.some(q => q.valor)) && (
        <div className="card-hce p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-slate-400" />
            <h3 className="card-title">Antecedentes</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(antecedentes).map(([cat, preguntas]) => {
              const respondidas = preguntas.filter(p => p.valor && p.valor !== 'false' && p.valor !== 'no' && p.valor !== '[]')
              if (respondidas.length === 0) return null
              const catLabel: Record<string, string> = {
                personal: 'Personales', familiar: 'Familiares', farmacologico: 'Farmacológicos',
                alergico: 'Alérgicos', quirurgico: 'Quirúrgicos', habito: 'Hábitos', gineco: 'Gineco-obstétrico',
              }
              return (
                <div key={cat}>
                  <p className="text-xs text-slate-400 mb-1">{catLabel[cat] ?? cat}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {respondidas.map(p => {
                      let chips: string[] = []
                      if (p.tipo_respuesta === 'lista') {
                        try {
                          const items: Record<string, string>[] = JSON.parse(p.valor ?? '[]')
                          chips = items.map(it => Object.values(it).filter(Boolean).join(' · '))
                        } catch { chips = [] }
                      } else {
                        const sufijo: Record<string, string> = { no_sabe: ' (no sabe)', no_aplica: ' (no aplica)' }
                        const label = p.tipo_respuesta === 'booleano'
                          ? p.texto.replace(/^¿/, '').replace(/\?$/, '') + (sufijo[p.valor ?? ''] ?? '')
                          : `${p.texto.replace(/^¿/, '').replace(/\?$/, '')}: ${p.valor}`
                        chips = [label + (p.detalle ? ` (${p.detalle})` : '')]
                      }
                      return chips.map((chip, i) => (
                        <span key={`${p.id}-${i}`} className="bg-slate-100 text-slate-700 text-xs rounded-full px-2.5 py-1">
                          {chip}
                        </span>
                      ))
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Fórmulas guardadas */}
      {formulas.length > 0 && (
        <div className="card-hce p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            <h3 className="card-title">Fórmulas médicas</h3>
            <span className="ml-auto text-xs text-slate-400">
              {formulas.length} guardada{formulas.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-3">
            {formulas.map((f) => (
              <div key={f.id} className="border border-slate-100 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{new Date(f.fecha_creacion).toLocaleDateString('es-CO')}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase">{f.tipo}</span>
                  </div>
                  <button
                    onClick={() => handleReimprimirFormula(f)}
                    disabled={imprimiendoFormulaId === f.id}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                  >
                    <Printer size={13} />
                    {imprimiendoFormulaId === f.id ? 'Preparando...' : 'Reimprimir'}
                  </button>
                </div>
                <div className="space-y-1">
                  {f.medicamentos.map((m) => (
                    <div key={m.id} className="text-sm text-slate-700">
                      <span className="font-medium">{m.nombre_medicamento}</span>
                      {m.concentracion && <span className="text-slate-400"> {m.concentracion}</span>}
                      <span className="text-slate-400"> — {m.dosis}, {m.frecuencia}</span>
                      {m.duracion_tratamiento && (
                        <span className="text-slate-400"> × {m.duracion_tratamiento}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consentimiento informado */}
      <div className="card-hce p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="card-title">Consentimiento informado</h3>
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
      <div className="card-hce overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Activity size={16} className="text-slate-400" />
          <h3 className="card-title">Historial de cambios</h3>
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
