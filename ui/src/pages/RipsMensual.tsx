import { useState } from 'react'
import { FileCode2, AlertCircle, Users, Calendar, FileCheck, FileX } from 'lucide-react'
import { useMedico } from '../context/MedicoContext'
import {
  useRipsMensualResumen,
  useRipsHistorial,
  useGenerarRipsMensual,
} from '../api/rips'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function periodoLabel(periodo: string) {
  const [anio, mes] = periodo.split('-')
  return `${MESES[parseInt(mes) - 1]} ${anio}`
}

function descargarJSON(datos: unknown, nombre: string) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

function mesAnterior() {
  const hoy = new Date()
  const mes = hoy.getMonth() === 0 ? 12 : hoy.getMonth()
  const anio = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear()
  return { mes, anio }
}

export default function RipsMensual() {
  const { medico } = useMedico()
  const prev = mesAnterior()
  const [anio, setAnio] = useState(prev.anio)
  const [mes, setMes] = useState(prev.mes)
  const [tipoDiag, setTipoDiag] = useState('01')

  const { data: resumen } = useRipsMensualResumen(anio, mes)
  const { data: historial = [] } = useRipsHistorial()
  const generar = useGenerarRipsMensual()

  const sinConfig = !medico.nit || !medico.codPrestador

  async function handleGenerar() {
    const resultado = await generar.mutateAsync({
      anio,
      mes,
      nit: medico.nit,
      codPrestador: medico.codPrestador,
      tipoDiagnosticoPrincipal: tipoDiag,
    })
    const nombreArchivo = `rips_${anio}_${String(mes).padStart(2, '0')}.json`
    descargarJSON(resultado.datos_json, nombreArchivo)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--hce-text)' }}>RIPS Mensual</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--hce-text-muted)' }}>
          Genera el lote mensual según Res. 2275/2023. Plazo: primeros 5 días calendario del mes siguiente.
        </p>
      </div>

      {sinConfig && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            Completá el <strong>NIT</strong> y el <strong>código de habilitación</strong> en
            Configuración antes de generar RIPS.
          </p>
        </div>
      )}

      {/* Selección del período */}
      <div className="card-hce p-5 space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--hce-text)' }}>Período a reportar</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label-hce">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="input-hce"
            >
              {MESES.map((nombre, i) => (
                <option key={i + 1} value={i + 1}>{nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-hce">Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              min={2024}
              max={new Date().getFullYear()}
              className="input-hce"
            />
          </div>
          <div>
            <label className="label-hce">Tipo diagnóstico</label>
            <select
              value={tipoDiag}
              onChange={(e) => setTipoDiag(e.target.value)}
              className="input-hce"
            >
              <option value="01">01 — Impresión diagnóstica</option>
              <option value="02">02 — Confirmado clínicamente</option>
              <option value="03">03 — Confirmado por laboratorio</option>
            </select>
          </div>
        </div>

        {/* Resumen del período */}
        {resumen && (
          <div className="grid grid-cols-4 gap-3 pt-2">
            {[
              { label: 'Pacientes', value: resumen.pacientes, icon: Users, color: 'text-blue-600' },
              { label: 'Encuentros', value: resumen.encuentros, icon: Calendar, color: 'text-slate-600' },
              { label: 'Con factura', value: resumen.con_factura, icon: FileCheck, color: 'text-green-600' },
              { label: 'Sin factura', value: resumen.sin_factura, icon: FileX, color: 'text-amber-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center">
                <Icon size={16} className={`mx-auto mb-1 ${color}`} />
                <p className="text-lg font-semibold" style={{ color: 'var(--hce-text)' }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {resumen?.sin_factura ? (
          <p className="text-xs text-amber-600">
            {resumen.sin_factura} encuentro{resumen.sin_factura > 1 ? 's' : ''} sin factura —
            se incluirá{resumen.sin_factura > 1 ? 'n' : ''} con <code>vrServicio: 0</code> y CUPS según finalidad.
          </p>
        ) : null}

        <div className="flex justify-end pt-1">
          <button
            onClick={handleGenerar}
            disabled={sinConfig || generar.isPending || (resumen?.encuentros ?? 0) === 0}
            className="btn-primary disabled:opacity-50"
          >
            <FileCode2 size={15} />
            {generar.isPending
              ? 'Generando...'
              : `Generar RIPS ${MESES[mes - 1]} ${anio}`}
          </button>
        </div>

        {generar.isError && (
          <p className="text-xs text-red-500">{generar.error.message}</p>
        )}
        {resumen?.encuentros === 0 && (
          <p className="text-xs text-slate-400">No hay encuentros registrados en este período.</p>
        )}
      </div>

      {/* Historial de lotes */}
      <div className="card-hce overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-medium" style={{ color: 'var(--hce-text)' }}>Lotes generados</h3>
        </div>

        {historial.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>
            Aún no se ha generado ningún lote RIPS.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Período</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Fecha generación</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Generado por</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.map((lote) => (
                <tr key={lote.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{periodoLabel(lote.periodo)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(lote.fecha_generacion).toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{lote.creado_por}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {lote.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
