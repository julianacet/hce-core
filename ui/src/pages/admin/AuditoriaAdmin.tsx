import { useState } from 'react'
import { useAuditoria } from '../../api/auditoria'

const colorAccion: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
}

const LIMIT = 10

export function AuditoriaAdmin() {
  const [offset, setOffset] = useState(0)
  const { data: logs = [], isLoading } = useAuditoria(LIMIT, offset)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="card-title">Log de auditoría del sistema</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--hce-text-muted)' }}>
          Registro de todos los cambios realizados en la base de datos.
        </p>
      </div>

      <div className="card-hce overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="thead-sticky border-b" style={{ borderColor: 'var(--hce-border)' }}>
              <tr>
                <th className="th-hce">Acción</th>
                <th className="th-hce">Tabla</th>
                <th className="th-hce">Registro</th>
                <th className="th-hce">Usuario</th>
                <th className="th-hce">Fecha</th>
                <th className="th-hce">Datos</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--hce-border)' }}>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>
                    Cargando…
                  </td>
                </tr>
              )}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hce-text-muted)' }}>
                    Sin registros de auditoría.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--hce-bg)] transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorAccion[log.accion] ?? 'bg-slate-100 text-slate-600'}`}>
                      {log.accion}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                    {log.nombre_tabla}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                    {log.registro_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                    {log.usuario_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--hce-text-muted)' }}>
                    {new Date(log.fecha_cambio).toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: 'var(--hce-text-muted)' }}>
                    {log.datos_nuevos ?? log.datos_anteriores ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--hce-border)', background: 'var(--hce-bg)' }}>
          <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
            Mostrando {offset + 1}–{offset + logs.length}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-xs"
              disabled={offset === 0}
              onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
            >
              Anterior
            </button>
            <button
              className="btn-secondary text-xs"
              disabled={logs.length < LIMIT}
              onClick={() => setOffset(o => o + LIMIT)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
