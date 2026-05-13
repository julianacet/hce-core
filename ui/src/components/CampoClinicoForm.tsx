import type { CampoClinico } from '../api/campos_clinicos'
import type { ValorNormalNotas } from '../api/encuentros'

// ── Signos vitales ────────────────────────────────────────────────────────────

interface SignosProps {
  campos: CampoClinico[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  disabled?: boolean
}

export function SignosVitalesForm({ campos, values, onChange, disabled }: SignosProps) {
  function set(clave: string, valor: string) {
    if (disabled) return
    onChange({ ...values, [clave]: valor })
  }

  const activos = campos.filter((c) => c.seccion === 'signos_vitales' && c.esta_activo)
  const rendered = new Set<string>()

  function imc(): string {
    const p = parseFloat(values['peso'] ?? '')
    const t = parseFloat(values['talla'] ?? '')
    if (!p || !t || t === 0) return ''
    return (p / Math.pow(t / 100, 2)).toFixed(1)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {activos.map((c) => {
        if (rendered.has(c.clave)) return null
        rendered.add(c.clave)

        if (c.clave === 'ta_sistolica') {
          const diast = activos.find((x) => x.clave === 'ta_diastolica')
          if (diast) rendered.add('ta_diastolica')
          return (
            <div key={c.clave} className="col-span-2">
              <label className="label-hce">Tensión arterial (mmHg)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" placeholder="Sistólica" min={40} max={300}
                  value={values['ta_sistolica'] ?? ''}
                  onChange={(e) => set('ta_sistolica', e.target.value)}
                  disabled={disabled}
                  className="input-hce"
                />
                <span className="text-slate-400 shrink-0">/</span>
                <input
                  type="number" placeholder="Diastólica" min={20} max={200}
                  value={values['ta_diastolica'] ?? ''}
                  onChange={(e) => set('ta_diastolica', e.target.value)}
                  disabled={disabled}
                  className="input-hce"
                />
              </div>
            </div>
          )
        }

        return (
          <div key={c.clave}>
            <label className="label-hce">
              {c.nombre}{c.unidad ? ` (${c.unidad})` : ''}
            </label>
            <input
              type="number" step={c.clave === 'temperatura' || c.clave === 'peso' || c.clave === 'talla' ? '0.1' : '1'}
              value={values[c.clave] ?? ''}
              onChange={(e) => set(c.clave, e.target.value)}
              disabled={disabled}
              className="input-hce"
            />
          </div>
        )
      })}

      {(values['peso'] || values['talla']) && imc() && (
        <div className="col-span-full">
          <p className="text-xs text-slate-500">
            IMC: <span className="font-semibold text-slate-700">{imc()} kg/m²</span>
          </p>
        </div>
      )}
    </div>
  )
}

// ── Revisión por sistemas ─────────────────────────────────────────────────────

interface RevisionProps {
  campos: CampoClinico[]
  values: Record<string, ValorNormalNotas>
  onChange: (values: Record<string, ValorNormalNotas>) => void
  disabled?: boolean
}

export function RevisionSistemasForm({ campos, values, onChange, disabled }: RevisionProps) {
  const activos = campos.filter((c) => c.seccion === 'revision_sistemas' && c.esta_activo)

  function setEstado(clave: string, niega: boolean) {
    if (disabled) return
    const prev = values[clave]
    onChange({ ...values, [clave]: { normal: niega, notas: prev?.notas ?? '' } })
  }

  function setDetalle(clave: string, notas: string) {
    if (disabled) return
    const prev = values[clave]
    onChange({ ...values, [clave]: { normal: prev?.normal ?? true, notas } })
  }

  function getNiega(clave: string): boolean {
    return values[clave]?.normal ?? true
  }

  function getDetalle(clave: string): string {
    return values[clave]?.notas ?? ''
  }

  if (activos.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No hay preguntas de revisión por sistemas configuradas.
      </p>
    )
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left font-medium text-slate-500 py-2 pr-4 w-56">Síntoma</th>
            <th className="text-left font-medium text-slate-500 py-2 pr-4 w-44">Estado</th>
            <th className="text-left font-medium text-slate-500 py-2">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {activos.map((c) => {
            const niega = getNiega(c.clave)
            const detalle = getDetalle(c.clave)
            return (
              <tr key={c.clave} className="align-top">
                <td className="py-2.5 pr-4 text-slate-700">{c.nombre}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex rounded-md border border-slate-200 overflow-hidden w-fit">
                    <button
                      type="button"
                      onClick={() => setEstado(c.clave, true)}
                      disabled={disabled}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        niega
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50'
                      } disabled:cursor-not-allowed`}
                    >
                      Niega
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstado(c.clave, false)}
                      disabled={disabled}
                      className={`px-3 py-1 text-xs font-medium transition-colors border-l border-slate-200 ${
                        !niega
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50'
                      } disabled:cursor-not-allowed`}
                    >
                      Refiere
                    </button>
                  </div>
                </td>
                <td className="py-2.5">
                  {!niega ? (
                    <textarea
                      rows={1}
                      value={detalle}
                      onChange={(e) => setDetalle(c.clave, e.target.value)}
                      placeholder="Descripción del síntoma…"
                      disabled={disabled}
                      className="input-hce w-full resize-none text-sm"
                      autoFocus={!disabled && detalle === ''}
                    />
                  ) : (
                    detalle && <span className="text-slate-500 text-xs">{detalle}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Examen físico ─────────────────────────────────────────────────────────────

interface ExamenProps {
  campos: CampoClinico[]
  values: Record<string, string | ValorNormalNotas>
  onChange: (values: Record<string, string | ValorNormalNotas>) => void
  disabled?: boolean
}

export function ExamenFisicoForm({ campos, values, onChange, disabled }: ExamenProps) {
  const activos = campos.filter((c) => c.seccion === 'examen_fisico' && c.esta_activo)

  function setTexto(clave: string, valor: string) {
    onChange({ ...values, [clave]: valor })
  }

  function setEstado(clave: string, normal: boolean) {
    if (disabled) return
    const prev = values[clave]
    const notas = typeof prev === 'object' ? (prev as ValorNormalNotas).notas ?? '' : ''
    onChange({ ...values, [clave]: { normal, notas } })
  }

  function setNotas(clave: string, notas: string) {
    const prev = values[clave]
    const normal = typeof prev === 'object' ? (prev as ValorNormalNotas).normal ?? true : true
    onChange({ ...values, [clave]: { normal, notas } })
  }

  function getNormal(clave: string): boolean {
    const v = values[clave]
    if (typeof v === 'object') return (v as ValorNormalNotas).normal ?? true
    return true
  }

  function getNotas(clave: string): string {
    const v = values[clave]
    if (typeof v === 'object') return (v as ValorNormalNotas).notas ?? ''
    return ''
  }

  // Campos de texto (aspecto general) se muestran aparte, antes de la tabla
  const camposTexto = activos.filter((c) => c.tipo === 'texto')
  const camposTabla = activos.filter((c) => c.tipo !== 'texto')

  return (
    <div className="space-y-4">
      {camposTexto.map((c) => (
        <div key={c.clave}>
          <label className="label-hce">{c.nombre}</label>
          <textarea
            rows={2}
            value={typeof values[c.clave] === 'string' ? (values[c.clave] as string) : ''}
            onChange={(e) => setTexto(c.clave, e.target.value)}
            disabled={disabled}
            className="input-hce resize-none"
            placeholder="Descripción general del paciente…"
          />
        </div>
      ))}

      {camposTabla.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left font-medium text-slate-500 py-2 pr-4 w-56">Segmento</th>
              <th className="text-left font-medium text-slate-500 py-2 pr-4 w-44">Estado</th>
              <th className="text-left font-medium text-slate-500 py-2">Detalle / Hallazgo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {camposTabla.map((c) => {
              if (c.tipo === 'opciones') {
                return (
                  <tr key={c.clave} className="align-top">
                    <td className="py-2.5 pr-4 text-slate-700">{c.nombre}</td>
                    <td colSpan={2} className="py-2.5">
                      <select
                        className="input-hce text-sm max-w-xs"
                        value={typeof values[c.clave] === 'string' ? (values[c.clave] as string) : ''}
                        onChange={(e) => setTexto(c.clave, e.target.value)}
                        disabled={disabled}
                      >
                        <option value="">— seleccionar —</option>
                        {(c.opciones ?? []).map((op) => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              }

              const normal = getNormal(c.clave)
              const notas = getNotas(c.clave)

              return (
                <tr key={c.clave} className="align-top">
                  <td className="py-2.5 pr-4 text-slate-700">{c.nombre}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex rounded-md border border-slate-200 overflow-hidden w-fit">
                      <button
                        type="button"
                        onClick={() => setEstado(c.clave, true)}
                        disabled={disabled}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          normal
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-slate-500 hover:bg-slate-50'
                        } disabled:cursor-not-allowed`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstado(c.clave, false)}
                        disabled={disabled}
                        className={`px-3 py-1 text-xs font-medium transition-colors border-l border-slate-200 ${
                          !normal
                            ? 'bg-amber-500 text-white'
                            : 'bg-white text-slate-500 hover:bg-slate-50'
                        } disabled:cursor-not-allowed`}
                      >
                        Anormal
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5">
                    {!normal ? (
                      <textarea
                        rows={1}
                        value={notas}
                        onChange={(e) => setNotas(c.clave, e.target.value)}
                        placeholder="Hallazgos…"
                        disabled={disabled}
                        className="input-hce w-full resize-none text-sm"
                        autoFocus={!disabled && notas === ''}
                      />
                    ) : (
                      notas && <span className="text-slate-500 text-xs">{notas}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
