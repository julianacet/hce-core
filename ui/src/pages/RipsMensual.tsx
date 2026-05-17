import { useState, useMemo } from 'react'
import { FileCode2, AlertCircle } from 'lucide-react'
import { Breadcrumb } from '../components/Breadcrumb'
import { useMedico } from '../context/MedicoContext'
import {
  useRipsMensualResumen,
  useRipsHistorial,
  useGenerarRipsMensual,
} from '../api/rips'
import { SortButton, type SortDir } from '../components/SortButton'

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

export default function RipsMensual() {
  const { medico } = useMedico()
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)

  const [orden, setOrden] = useState<'periodo' | 'fecha_generacion' | 'creado_por'>('fecha_generacion')
  const [dir, setDir] = useState<SortDir>('desc')

  const { data: resumen } = useRipsMensualResumen(anio, mes)
  const { data: historial = [] } = useRipsHistorial()
  const generar = useGenerarRipsMensual()

  const historialOrdenado = useMemo(() => {
    return [...historial].sort((a, b) => {
      const va = a[orden] ?? ''
      const vb = b[orden] ?? ''
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return dir === 'asc' ? cmp : -cmp
    })
  }, [historial, orden, dir])

  function ordenarPor(col: typeof orden) {
    if (orden === col) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setOrden(col); setDir(col === 'fecha_generacion' ? 'desc' : 'asc') }
  }

  const sinConfig = !medico.nit || !medico.codPrestador

  async function handleGenerar() {
    const resultado = await generar.mutateAsync({
      anio,
      mes,
      nit: medico.nit,
      codPrestador: medico.codPrestador,
    })
    const nombreArchivo = `rips_${anio}_${String(mes).padStart(2, '0')}.json`
    descargarJSON(resultado.datos_json, nombreArchivo)
  }

  return (
    <div className="page-hce space-y-6">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'RIPS Mensual' }]} />
      <div className="page-header">
        <div>
          <h2 className="page-title">RIPS Mensual</h2>
          <p className="page-desc">Genera el lote mensual según Res. 2275/2023.</p>
        </div>
      </div>

      {sinConfig && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            Complete el <strong>NIT</strong> y el <strong>código de habilitación</strong> en
            Configuración antes de generar RIPS.
          </p>
        </div>
      )}

      {/* Selección del período */}
      <div className="card-hce p-5 space-y-4">
        <h3 className="card-title">Período a reportar</h3>

        <div className="flex gap-3">
          <div className="w-44">
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
          <div className="w-28">
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
        </div>

        {resumen && (
          <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
            {resumen.pacientes} {resumen.pacientes === 1 ? 'paciente' : 'pacientes'} · {resumen.encuentros} {resumen.encuentros === 1 ? 'consulta' : 'consultas'}
          </p>
        )}

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleGenerar}
            disabled={sinConfig || generar.isPending || (resumen?.encuentros ?? 0) === 0}
            className="btn-primary disabled:opacity-50"
          >
            <FileCode2 size={15} />
            {generar.isPending ? 'Generando...' : `Generar RIPS ${MESES[mes - 1]} ${anio}`}
          </button>
          {generar.isError && (
            <p className="text-xs text-red-500">{generar.error.message}</p>
          )}
          {resumen?.encuentros === 0 && (
            <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>No hay consultas registradas en este período.</p>
          )}
        </div>
      </div>

      {/* Historial de lotes */}
      <div className="card-hce overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <h3 className="card-title">Lotes generados</h3>
        </div>

        {historial.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>
            Aún no se ha generado ningún lote RIPS.
          </p>
        ) : (
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '35%' }} />
            </colgroup>
            <thead className="thead-sticky border-b" style={{ borderColor: 'var(--hce-border)' }}>
              <tr>
                <th className="th-hce">
                  <SortButton activo={orden === 'periodo'} dir={dir} onClick={() => ordenarPor('periodo')}>Período</SortButton>
                </th>
                <th className="th-hce">
                  <SortButton activo={orden === 'fecha_generacion'} dir={dir} onClick={() => ordenarPor('fecha_generacion')}>Fecha generación</SortButton>
                </th>
                <th className="th-hce">
                  <SortButton activo={orden === 'creado_por'} dir={dir} onClick={() => ordenarPor('creado_por')}>Generado por</SortButton>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              {historialOrdenado.map((lote) => (
                <tr key={lote.id}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--hce-text)' }}>{periodoLabel(lote.periodo)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                    {new Date(lote.fecha_generacion).toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--hce-text-muted)' }}>{lote.creado_por}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
