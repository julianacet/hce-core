import { useState } from 'react'
import { useNavigate } from 'react-router'
import { pdf } from '@react-pdf/renderer'
import { imprimirConVisorSO } from '../utils/impresion'
import { FileCheck2, Plus, CheckCircle2, Clock, Printer, Search } from 'lucide-react'
import { useMedico } from '../context/MedicoContext'
import { useTema } from '../context/TemaContext'
import { useConsentimientosGenerados, useFirmarConsentimiento } from '../api/consentimientos'
import type { ConsentimientoGenerado } from '../api/consentimientos'
import { TAMANO_PAGINA } from '../utils/impresion'
import { useDebounced } from '../hooks/useDebounced'
import { DEBOUNCE_FILTROS_MS } from '../utils/constants'
import { Breadcrumb } from '../components/Breadcrumb'
import { TableEmptyState } from '../components/TableEmptyState'
import { SortButton, type SortDir } from '../components/SortButton'
import { PaginationFooter } from '../components/PaginationFooter'
import ConsentimientoPDF from '../components/pdf/ConsentimientoPDF'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Página principal ──────────────────────────────────────────────────────────

const LIMIT = 10
type OrdenCol = 'paciente' | 'plantilla' | 'fecha' | 'estado'

export default function Consentimientos() {
  const navigate = useNavigate()
  const { medico } = useMedico()
  const { tema } = useTema()
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [orden, setOrden] = useState<OrdenCol>('fecha')
  const [dir, setDir] = useState<SortDir>('desc')

  const busquedaDebounced = useDebounced(busqueda, DEBOUNCE_FILTROS_MS)

  const { data, isLoading, isError, isFetching } = useConsentimientosGenerados({
    q: busquedaDebounced || undefined,
    page,
    limit: LIMIT,
    orden,
    dir,
  })
  const filas = data?.consentimientos ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const firmar = useFirmarConsentimiento()

  function ordenarPor(col: OrdenCol) {
    if (orden === col) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setOrden(col); setDir('asc') }
    setPage(1)
  }

  async function abrirPDF(c: ConsentimientoGenerado) {
    const tamano = TAMANO_PAGINA[medico.impresion.consentimiento]
    const blob = await pdf(
      <ConsentimientoPDF
        medico={medico}
        pacienteNombre={c.paciente_nombre}
        pacienteDocumento={c.paciente_documento}
        tipoDocumento={c.tipo_documento}
        contenidoRenderizado={c.contenido_renderizado}
        fecha={new Date(c.fecha_generacion).toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric',
        })}
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
  }

  return (
    <div className="page-hce">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Consentimientos informados' }]} />

      <div className="page-header">
        <div>
          <h2 className="page-title">Consentimientos informados</h2>
          <p className="page-desc">Generación, impresión y registro de firmas</p>
        </div>
        <button onClick={() => navigate('/consentimientos/nuevo')} className="btn-primary">
          <Plus size={15} />
          Nuevo
        </button>
      </div>

      <div className="card-hce overflow-hidden">
        {/* Búsqueda */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--hce-border)' }}>
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--hce-text-muted)' }} />
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPage(1) }}
              placeholder="Buscar paciente..."
              className="input-hce pl-9"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead className="thead-sticky border-b" style={{ borderColor: 'var(--hce-border)' }}>
              <tr>
                <th className="th-hce px-5">
                  <div className="flex justify-center">
                    <SortButton activo={orden === 'paciente'} dir={dir} onClick={() => ordenarPor('paciente')}>Paciente</SortButton>
                  </div>
                </th>
                <th className="th-hce">
                  <div className="flex justify-center">
                    <SortButton activo={orden === 'plantilla'} dir={dir} onClick={() => ordenarPor('plantilla')}>Plantilla</SortButton>
                  </div>
                </th>
                <th className="th-hce">
                  <div className="flex justify-center">
                    <SortButton activo={orden === 'fecha'} dir={dir} onClick={() => ordenarPor('fecha')}>Fecha</SortButton>
                  </div>
                </th>
                <th className="th-hce">
                  <div className="flex justify-center">
                    <SortButton activo={orden === 'estado'} dir={dir} onClick={() => ordenarPor('estado')}>Estado</SortButton>
                  </div>
                </th>
                <th className="th-hce" style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              <TableEmptyState
                isLoading={isLoading}
                isError={isError}
                isEmpty={filas.length === 0}
                colSpan={5}
                hayBusqueda={!!busquedaDebounced}
                textoVacio="Aún no hay consentimientos generados."
                textoSinResultados="Sin resultados para esta búsqueda."
                icon={<FileCheck2 size={28} className="text-slate-300" />}
              />
              {filas.map(c => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50 transition-colors"
                  style={{ color: 'var(--hce-text)' }}
                >
                  <td className="px-5 py-3 align-middle">
                    <p className="font-medium leading-tight">
                      {c.paciente_nombre || '—'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
                      {c.tipo_documento} {c.paciente_documento}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center align-middle" style={{ color: 'var(--hce-text-muted)' }}>
                    {c.plantilla_nombre ?? <span className="italic">Sin plantilla</span>}
                  </td>
                  <td className="px-4 py-3 text-center align-middle" style={{ color: 'var(--hce-text-muted)' }}>
                    {formatFecha(c.fecha_generacion)}
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    {c.firmado ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--hce-success-bg)',
                          color: 'var(--hce-success)',
                        }}
                      >
                        <CheckCircle2 size={11} />
                        Firmado
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--hce-warning-bg)',
                          color: 'var(--hce-warning)',
                        }}
                      >
                        <Clock size={11} />
                        Generado
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirPDF(c)}
                        className="btn-secondary flex items-center gap-1 px-2.5 py-1 text-xs"
                        title="Reimprimir"
                      >
                        <Printer size={12} />
                        PDF
                      </button>
                      {!c.firmado && (
                        <button
                          onClick={() => firmar.mutate(c.id)}
                          disabled={firmar.isPending}
                          className="btn-primary flex items-center gap-1 px-2.5 py-1 text-xs"
                          title="Registrar como firmado"
                        >
                          <CheckCircle2 size={12} />
                          Firmar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter
          page={page}
          totalPages={totalPages}
          total={total}
          limit={LIMIT}
          isLoading={isLoading}
          isFetching={isFetching}
          onPageChange={setPage}
          entityLabel="consentimientos"
        />
      </div>

    </div>
  )
}
