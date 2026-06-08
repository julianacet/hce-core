import { useParams } from 'react-router'
import { Printer, FileDown } from 'lucide-react'
import { useState } from 'react'
import { useTabParam } from '../../hooks/useTabParam'
import { pdf } from '@react-pdf/renderer'
import { imprimirConVisorSO } from '../../utils/impresion'
import { useEncuentro, type ValorNormalNotas, type EncuentroDiagnostico } from '../../api/encuentros'
import { usePaciente } from '../../api/pacientes'
import { useMedico } from '../../context/MedicoContext'
import { useTema } from '../../context/TemaContext'
import FormulaPDF, { type Medicamento } from '../../components/pdf/FormulaPDF'
import HistoriaClinicaPDF from '../../components/pdf/HistoriaClinicaPDF'
import OrdenExamenPDF from '../../components/pdf/OrdenExamenPDF'
import { useCamposClinicosActivos } from '../../api/campos_clinicos'
import { useFormulas, type FormulaGuardada } from '../../api/formulas'
import { useNotasEncuentro, useCrearNotaEncuentro } from '../../api/notas_encuentro'
import { useAntecedentes } from '../../api/antecedentes'
import AntecedentesTab from '../../components/AntecedentesTab'
import { nombreCompleto, fmtFechaNacimiento } from '../../utils/paciente'
import { useOrdenesExamen } from '../../api/ordenes_examen'
import { TAMANO_PAGINA, type TamanoDocumento } from '../../utils/impresion'

// ── Tab Exámenes médicos (solo lectura) ───────────────────────────────────────

function TabExamenesMedicos({
  docId, ordenes, medico, paciente, diagnostico, tema, pacienteNombre,
}: {
  docId: string
  ordenes: ReturnType<typeof useOrdenesExamen>['data'] & object[]
  medico: any
  paciente: any
  diagnostico: string
  tema: any
  pacienteNombre: string
}) {
  const [imprimiendoId, setImprimiendoId] = useState<string | null>(null)

  async function handleImprimir(orden: NonNullable<typeof ordenes>[0]) {
    setImprimiendoId(orden.id)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const fechaOrden = new Date(orden.fecha_creacion).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
      const fechaImpresionOrden = new Date().toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
      const blob = await pdf(
        <OrdenExamenPDF
          medico={medico}
          paciente={{
            nombre: pacienteNombre,
            documento: paciente?.numero_documento ?? docId,
            tipoDocumento: paciente?.tipo_documento ?? '',
            fechaNacimiento: fmtFechaNacimiento(paciente?.fecha_nacimiento),
          }}
          diagnostico={diagnostico}
          items={orden.items}
          indicacionesGenerales={orden.indicaciones_generales}
          fecha={fechaOrden}
          fechaImpresion={fechaImpresionOrden}
          tamano={TAMANO_PAGINA[(medico.impresion?.ordenExamen ?? 'A4') as TamanoDocumento]}
          colorPrimario={tema.colorPrimario}
          logoBase64={tema.logoBase64}
          logoTextoBase64={medico.logoTextoBase64}
        />
      ).toBlob()
      await imprimirConVisorSO(blob)
    } finally {
      setImprimiendoId(null)
    }
  }

  return (
    <div className="space-y-4">

      {/* Órdenes existentes */}
      {ordenes.length > 0 && (
        <div className="space-y-3">
          {ordenes.map(orden => (
            <div key={orden.id} className="border rounded-lg p-4 space-y-2"
                 style={{ borderColor: 'var(--hce-border)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                  {new Date(orden.fecha_creacion).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })} · {orden.creado_por}
                </p>
                <button
                  onClick={() => handleImprimir(orden)}
                  disabled={imprimiendoId === orden.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40"
                  style={{ borderColor: 'var(--hce-border)', color: 'var(--hce-text-muted)' }}
                >
                  <Printer size={12} />
                  {imprimiendoId === orden.id ? 'Preparando…' : 'Reimprimir'}
                </button>
              </div>
              <ul className="space-y-1.5">
                {orden.items.map(item => (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    {item.codigo_cups && (
                      <span className="font-mono text-xs font-semibold shrink-0 mt-0.5"
                            style={{ color: 'var(--hce-primary)' }}>{item.codigo_cups}</span>
                    )}
                    <span style={{ color: 'var(--hce-text)' }}>{item.descripcion}</span>
                    {item.indicaciones && (
                      <span className="text-xs italic" style={{ color: 'var(--hce-text-muted)' }}>
                        — {item.indicaciones}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {orden.indicaciones_generales && (
                <p className="text-xs italic pt-1 border-t" style={{ color: 'var(--hce-text-muted)', borderColor: 'var(--hce-border)' }}>
                  {orden.indicaciones_generales}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {ordenes.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
          Sin órdenes de exámenes para esta consulta.
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'motivo' | 'signos' | 'revision' | 'examen' | 'analisis' | 'diagnosticos' | 'antecedentes' | 'formula' | 'examenes_medicos'

const TABS: { key: Tab; label: string }[] = [
  { key: 'motivo',           label: 'Motivo' },
  { key: 'antecedentes',     label: 'Antecedentes' },
  { key: 'signos',           label: 'Signos vitales' },
  { key: 'revision',         label: 'Rev. por sistemas' },
  { key: 'examen',           label: 'Examen físico' },
  { key: 'analisis',         label: 'Análisis' },
  { key: 'diagnosticos',     label: 'Diagnósticos' },
  { key: 'formula',          label: 'Fórmula' },
  { key: 'examenes_medicos', label: 'Exámenes' },
]

const ALL_TAB_KEYS = TABS.map(t => t.key) as readonly Tab[]


export default function DetalleEncuentro() {
  const { id, encId } = useParams()
  const { medico } = useMedico()
  const { tema } = useTema()
  const [tab, setTab] = useTabParam('tab', 'motivo' as Tab, ALL_TAB_KEYS)
  const [imprimiendoFormulaId, setImprimiendoFormulaId] = useState<string | null>(null)
  const [descargandoHistoria, setDescargandoHistoria] = useState(false)
  const [notaAbierta, setNotaAbierta] = useState(false)
  const [notaTexto, setNotaTexto] = useState('')

  const { data: e, isLoading, isError } = useEncuentro(id ?? '', encId ?? '')
  const { data: paciente } = usePaciente(id ?? '')
  const { data: campos = [] } = useCamposClinicosActivos()
  const { data: formulas = [] } = useFormulas(id ?? '', encId ?? '')
  const { data: notas = [] } = useNotasEncuentro(id ?? '', encId ?? '')
  const { data: antecedentes = {} } = useAntecedentes(id ?? '')
  const crearNota = useCrearNotaEncuentro(id ?? '', encId ?? '')
  const { data: ordenesExamen = [] } = useOrdenesExamen(id ?? '', encId ?? '')

  async function handleDescargarHistoria() {
    if (!e || !paciente) return
    setDescargandoHistoria(true)
    try {
      const fechaImpresion = new Date().toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
      const blob = await pdf(
        <HistoriaClinicaPDF
          medico={medico}
          paciente={paciente}
          encuentro={e}
          campos={campos}
          antecedentes={antecedentes}
          formulas={formulas}
          ordenes={ordenesExamen}
          fechaImpresion={fechaImpresion}
          tamano={TAMANO_PAGINA[(medico.impresion?.historiaClinica ?? 'A4') as TamanoDocumento]}
          colorPrimario={tema.colorPrimario}
          logoBase64={tema.logoBase64}
          logoTextoBase64={medico.logoTextoBase64}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `HC-${paciente.numero_documento}-${new Date(e.fecha_atencion).toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDescargandoHistoria(false)
    }
  }

  if (isLoading) return <div className="p-6 text-sm text-slate-400">Cargando consulta...</div>
  if (isError || !e) return <div className="p-6 text-sm text-red-500">Error al cargar la consulta.</div>

  const diagnostico = e.codigo_diagnostico_principal ?? ''
  const pacienteNombre = paciente ? nombreCompleto(paciente) : id ?? ''

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
      const fechaImpresionFormula = new Date().toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
      const blob = await pdf(
        <FormulaPDF
          medico={medico}
          paciente={{
            nombre: pacienteNombre,
            documento: paciente?.numero_documento ?? id ?? '',
            tipoDocumento: paciente?.tipo_documento ?? '',
            fechaNacimiento: fmtFechaNacimiento(paciente?.fecha_nacimiento),
          }}
          diagnostico={diagnostico}
          medicamentos={meds}
          incluirFirma={!!medico.firmaBase64}
          fecha={fechaFormula}
          fechaImpresion={fechaImpresionFormula}
          colorPrimario={tema.colorPrimario}
          logoBase64={tema.logoBase64}
          logoTextoBase64={medico.logoTextoBase64}
        />
      ).toBlob()
      await imprimirConVisorSO(blob)
    } finally {
      setImprimiendoFormulaId(null)
    }
  }

  async function handleGuardarNota(ev: React.FormEvent) {
    ev.preventDefault()
    if (!notaTexto.trim()) return
    await crearNota.mutateAsync(notaTexto.trim())
    setNotaTexto('')
    setNotaAbierta(false)
  }

  return (
    <div className="space-y-4">

      {/* Metadata del encuentro */}
      <div className="card-hce px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm flex-1">
            {([
              ['Fecha de atención', new Date(e.fecha_atencion).toLocaleString('es-CO')],
              ['Finalidad', e.finalidad_consulta_nombre],
              ['Vía de ingreso', e.via_ingreso_nombre],
              ['Registrado por', e.creado_por],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p style={{ color: 'var(--hce-text)' }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {e.es_primer_control && (
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                Control sin cargo
              </span>
            )}
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              v{e.numero_version}
            </span>
            <button
              onClick={handleDescargarHistoria}
              disabled={descargandoHistoria}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              <FileDown size={13} />
              {descargandoHistoria ? 'Generando...' : 'Descargar historia'}
            </button>
          </div>
        </div>
      </div>

      {/* Notas médicas */}
      <div className="card-hce p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="card-title">Notas médicas</h3>
            {notas.length > 0 && <span className="text-xs text-slate-400">({notas.length})</span>}
          </div>
          {!notaAbierta && (
            <button onClick={() => setNotaAbierta(true)} className="btn-primary text-xs">
              + Agregar nota
            </button>
          )}
        </div>

        {notaAbierta && (
          <form onSubmit={handleGuardarNota} className="space-y-2">
            <textarea
              rows={3}
              value={notaTexto}
              onChange={ev => setNotaTexto(ev.target.value)}
              placeholder="Escriba la corrección o aclaración…"
              className="input-hce resize-none w-full"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setNotaAbierta(false); setNotaTexto('') }}
                className="btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!notaTexto.trim() || crearNota.isPending}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {crearNota.isPending ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>
          </form>
        )}

        {notas.length === 0 && !notaAbierta && (
          <p className="text-xs text-slate-400">
            Sin notas. Use esta sección para aclaraciones o correcciones sobre la consulta.
          </p>
        )}

        {notas.length > 0 && (
          <div className="space-y-3">
            {notas.map(n => (
              <div key={n.id} className="border-l-2 border-slate-200 pl-3 space-y-0.5">
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ color: 'var(--hce-text)' }}>{n.texto}</p>
                <p className="text-xs text-slate-400">
                  {n.creado_por} · {new Date(n.fecha_creacion).toLocaleString('es-CO')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar único */}
      <div className="card-hce overflow-hidden">
        <div className="flex overflow-x-auto border-b" style={{ borderColor: 'var(--hce-border)', overflowY: 'hidden' }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === key ? 'font-medium' : 'border-transparent hover:text-slate-700'
              }`}
              style={
                tab === key
                  ? { color: 'var(--hce-primary)', borderColor: 'var(--hce-primary)' }
                  : { color: 'var(--hce-text-muted)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 min-h-36">

          {/* Motivo */}
          {tab === 'motivo' && (
            <div className="space-y-4">
              {e.motivo_consulta ? (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Motivo de consulta</p>
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ color: 'var(--hce-text)' }}>{e.motivo_consulta}</p>
                </div>
              ) : null}
              {e.descripcion_ingreso ? (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Descripción general del paciente</p>
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ color: 'var(--hce-text)' }}>{e.descripcion_ingreso}</p>
                </div>
              ) : null}
              {!e.motivo_consulta && !e.descripcion_ingreso && (
                <p className="text-sm text-slate-400">Sin información registrada.</p>
              )}
            </div>
          )}

          {/* Signos vitales */}
          {tab === 'signos' && (() => {
            const sv = e.signos_vitales
            if (!sv || Object.keys(sv).length === 0)
              return <p className="text-sm text-slate-400">Sin signos vitales registrados.</p>

            const camposSignos = campos.filter(c => c.seccion === 'signos_vitales')
            const rendered = new Set<string>()
            const chips: React.ReactNode[] = []

            for (const c of camposSignos) {
              if (rendered.has(c.clave) || !sv[c.clave]) continue
              rendered.add(c.clave)
              if (c.clave === 'ta_sistolica' && sv['ta_diastolica']) {
                rendered.add('ta_diastolica')
                chips.push(
                  <div key="ta" className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-base font-semibold text-slate-800">{sv['ta_sistolica']}/{sv['ta_diastolica']}</p>
                    <p className="text-xs text-slate-400 mt-0.5">TA mmHg</p>
                  </div>
                )
                continue
              }
              chips.push(
                <div key={c.clave} className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-base font-semibold text-slate-800">{sv[c.clave]}{c.unidad ? ` ${c.unidad}` : ''}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.nombre}</p>
                </div>
              )
            }
            if (sv['peso'] && sv['talla']) {
              const p = parseFloat(sv['peso']), t = parseFloat(sv['talla'])
              if (p && t) chips.push(
                <div key="imc" className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-base font-semibold text-slate-800">{(p / Math.pow(t / 100, 2)).toFixed(1)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">IMC kg/m²</p>
                </div>
              )
            }
            if (chips.length === 0) return <p className="text-sm text-slate-400">Sin signos vitales registrados.</p>
            return <div className="grid grid-cols-4 gap-3">{chips}</div>
          })()}

          {/* Revisión por sistemas */}
          {tab === 'revision' && (() => {
            const rs = e.revision_sistemas
            if (!rs || Object.keys(rs).length === 0)
              return <p className="text-sm text-slate-400">Sin revisión por sistemas registrada.</p>

            const camposRevision = campos.filter(c => c.seccion === 'revision_sistemas')
            const filas: React.ReactNode[] = []
            for (const c of camposRevision) {
              const raw = rs[c.clave]
              if (raw === undefined || raw === null) continue

              let label: string
              let notas: string
              let colorClass: string

              if (typeof raw === 'string') {
                label = raw
                const notasRaw = rs[c.clave + '_notas']
                notas = typeof notasRaw === 'string' ? notasRaw.trim() : ''
                const idx = c.opciones?.indexOf(raw) ?? -1
                colorClass = idx === 0 ? 'bg-green-100 text-green-700'
                           : idx === 1 ? 'bg-amber-100 text-amber-700'
                           : 'bg-slate-100 text-slate-600'
              } else {
                const v = raw as ValorNormalNotas
                label = v.normal ? 'Niega' : 'Refiere'
                notas = v.notas?.trim() ?? ''
                colorClass = v.normal ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }

              filas.push(
                <div key={c.clave}
                  className="grid items-start py-2.5 border-b border-slate-100 last:border-0"
                  style={{ gridTemplateColumns: '1fr auto' }}
                >
                  <div>
                    <span className="text-sm" style={{ color: 'var(--hce-text)' }}>{c.nombre}</span>
                    {notas && <p className="text-xs text-slate-400 mt-0.5 break-words whitespace-pre-wrap">{notas}</p>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-6 mt-0.5 ${colorClass}`}>
                    {label}
                  </span>
                </div>
              )
            }
            if (filas.length === 0) return <p className="text-sm text-slate-400">Sin revisión por sistemas registrada.</p>
            return <div>{filas}</div>
          })()}

          {/* Examen físico */}
          {tab === 'examen' && (() => {
            const ef = e.examen_fisico
            if (!ef || Object.keys(ef).length === 0)
              return <p className="text-sm text-slate-400">Sin examen físico registrado.</p>

            const camposExamen = campos.filter(c => c.seccion === 'examen_fisico')
            const filas: React.ReactNode[] = []
            for (const c of camposExamen) {
              const raw = ef[c.clave]
              if (raw === undefined || raw === null) continue

              if (c.tipo === 'texto') {
                if (typeof raw === 'string' && raw.trim()) {
                  filas.push(
                    <div key={c.clave} className="py-2.5 border-b border-slate-100 last:border-0">
                      <p className="text-xs text-slate-400 mb-0.5">{c.nombre}</p>
                      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ color: 'var(--hce-text)' }}>{raw}</p>
                    </div>
                  )
                }
                continue
              }

              let label: string
              let notas: string
              let colorClass: string

              if (typeof raw === 'string') {
                label = raw
                const notasRaw = ef[c.clave + '_notas']
                notas = typeof notasRaw === 'string' ? notasRaw.trim() : ''
                const idx = c.opciones?.indexOf(raw) ?? -1
                colorClass = idx === 0 ? 'bg-green-100 text-green-700'
                           : idx === 1 ? 'bg-amber-100 text-amber-700'
                           : 'bg-slate-100 text-slate-600'
              } else {
                const v = raw as ValorNormalNotas
                label = v.normal ? 'Normal' : 'Anormal'
                notas = v.notas?.trim() ?? ''
                colorClass = v.normal ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }

              filas.push(
                <div key={c.clave}
                  className="grid items-start py-2.5 border-b border-slate-100 last:border-0"
                  style={{ gridTemplateColumns: '1fr auto' }}
                >
                  <div>
                    <span className="text-sm" style={{ color: 'var(--hce-text)' }}>{c.nombre}</span>
                    {notas && <p className="text-xs text-slate-400 mt-0.5 break-words whitespace-pre-wrap">{notas}</p>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-6 mt-0.5 ${colorClass}`}>
                    {label}
                  </span>
                </div>
              )
            }
            if (filas.length === 0) return <p className="text-sm text-slate-400">Sin examen físico registrado.</p>
            return <div>{filas}</div>
          })()}

          {/* Análisis */}
          {tab === 'analisis' && (
            e.plan_manejo
              ? <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ color: 'var(--hce-text)' }}>{e.plan_manejo}</p>
              : <p className="text-sm text-slate-400">Sin análisis registrado.</p>
          )}

          {/* Diagnósticos */}
          {tab === 'diagnosticos' && (
            <div className="space-y-4">
              {e.diagnosticos && e.diagnosticos.length > 0 ? (() => {
                const impresiones = e.diagnosticos!.filter(d => d.tipo === 'impresion')
                const confirmados = e.diagnosticos!.filter(d => d.tipo !== 'impresion')

                function FilaDx({ d }: { d: EncuentroDiagnostico }) {
                  const badge =
                    d.tipo === 'impresion'   ? { label: 'Impresión',   cls: 'bg-violet-100 text-violet-700' } :
                    d.tipo === 'principal'   ? { label: 'Principal',   cls: 'bg-[var(--hce-primary-soft)] text-[var(--hce-primary)]' } :
                    d.tipo === 'relacionado' ? { label: 'Relacionado', cls: 'bg-blue-100 text-blue-700' } :
                    d.tipo === 'secundario'  ? { label: 'Secundario',  cls: 'bg-slate-100 text-slate-600' } :
                                              { label: 'Nota',         cls: 'bg-amber-100 text-amber-700' }
                  return (
                    <div className="grid items-start py-2.5 border-b border-slate-100 last:border-0"
                      style={{ gridTemplateColumns: 'auto 1fr' }}>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mr-4 mt-0.5 shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <div>
                        <span className="text-sm" style={{ color: 'var(--hce-text)' }}>{d.descripcion}</span>
                        {d.codigo && <p className="text-xs text-slate-400 mt-0.5 font-mono">{d.codigo}</p>}
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    {impresiones.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Impresión diagnóstica</p>
                        {impresiones.map(d => <FilaDx key={d.id} d={d} />)}
                      </div>
                    )}
                    {confirmados.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Diagnósticos confirmados</p>
                        {confirmados.map(d => <FilaDx key={d.id} d={d} />)}
                      </div>
                    )}
                  </div>
                )
              })() : diagnostico ? (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Diagnóstico principal</p>
                  <p className="text-sm" style={{ color: 'var(--hce-text)' }}>{diagnostico}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sin diagnósticos registrados.</p>
              )}
            </div>
          )}

          {/* Antecedentes */}
          {tab === 'antecedentes' && (
            <AntecedentesTab documento={id ?? ''} genero={paciente?.genero} readOnly />
          )}

          {/* Exámenes médicos */}
          {tab === 'examenes_medicos' && (
            <TabExamenesMedicos
              docId={id ?? ''}
              ordenes={ordenesExamen}
              medico={medico}
              paciente={paciente ?? null}
              diagnostico={diagnostico}
              tema={tema}
              pacienteNombre={pacienteNombre}
            />
          )}

          {/* Fórmula */}
          {tab === 'formula' && (
            formulas.length > 0 ? (
              <div className="space-y-3">
                {formulas.map(f => (
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
                      {f.medicamentos.map(m => (
                        <div key={m.id} className="text-sm text-slate-700">
                          <span className="font-medium">{m.nombre_medicamento}</span>
                          {m.concentracion && <span className="text-slate-400"> {m.concentracion}</span>}
                          <span className="text-slate-400"> — {m.dosis}, {m.frecuencia}</span>
                          {m.duracion_tratamiento && <span className="text-slate-400"> × {m.duracion_tratamiento}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Sin fórmulas emitidas para esta consulta.</p>
            )
          )}

        </div>
      </div>


    </div>
  )
}
