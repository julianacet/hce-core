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
  const DECIMALES = new Set(['temperatura', 'peso', 'talla', 'glucometria', 'saturacion'])

  function set(clave: string, raw: string) {
    if (disabled) return
    onChange({ ...values, [clave]: raw.replace(',', '.') })
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
                  type="text" inputMode="numeric" placeholder="Sistólica"
                  value={values['ta_sistolica'] ?? ''}
                  onChange={(e) => set('ta_sistolica', e.target.value)}
                  disabled={disabled}
                  className="input-hce"
                />
                <span className="text-slate-400 shrink-0">/</span>
                <input
                  type="text" inputMode="numeric" placeholder="Diastólica"
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
              type="text"
              inputMode={DECIMALES.has(c.clave) ? 'decimal' : 'numeric'}
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

// ── Tabla clínica (revisión por sistemas + examen físico) ─────────────────────

type ValoresTabla = Record<string, string | ValorNormalNotas>

interface TablaClinicaConfig {
  colItem: string
  colDetalle: string
  labelPos: string
  labelNeg: string
  placeholderDetalle: string
}

interface TablaClinicaProps {
  campos: CampoClinico[]
  values: ValoresTabla
  onChange: (values: ValoresTabla) => void
  disabled?: boolean
  config: TablaClinicaConfig
  /** Render texto-type fields as free-text textareas above the table */
  conCamposTexto?: boolean
}

function TablaClinicaForm({
  campos,
  values,
  onChange,
  disabled,
  config,
  conCamposTexto = false,
}: TablaClinicaProps) {
  const { colItem, colDetalle, labelPos, labelNeg, placeholderDetalle } = config

  function setTexto(clave: string, valor: string) {
    onChange({ ...values, [clave]: valor })
  }

  function setEstado(clave: string, pos: boolean) {
    if (disabled) return
    const prev = values[clave]
    const notas = typeof prev === 'object' ? (prev as ValorNormalNotas).notas ?? '' : ''
    onChange({ ...values, [clave]: { normal: pos, notas } })
  }

  function setNotas(clave: string, notas: string) {
    const prev = values[clave]
    const normal = typeof prev === 'object' ? (prev as ValorNormalNotas).normal ?? true : true
    onChange({ ...values, [clave]: { normal, notas } })
  }

  function getEstado(clave: string): boolean {
    const v = values[clave]
    if (typeof v === 'object') return (v as ValorNormalNotas).normal ?? true
    return true
  }

  function getNotas(clave: string): string {
    const v = values[clave]
    if (typeof v === 'object') return (v as ValorNormalNotas).notas ?? ''
    return ''
  }

  const camposTexto = conCamposTexto ? campos.filter((c) => c.tipo === 'texto') : []
  const camposTabla = conCamposTexto ? campos.filter((c) => c.tipo !== 'texto') : campos

  if (campos.length === 0) {
    return (
      <p className="text-sm text-slate-400">No hay campos configurados para esta sección.</p>
    )
  }

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
            <tr className="border-b" style={{ borderColor: 'var(--hce-border)', background: 'var(--hce-fondo)' }}>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-2.5 pr-4 w-56">{colItem}</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-2.5 pr-4 w-44">Estado</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-2.5">{colDetalle}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {camposTabla.map((c) => {
              if (c.tipo === 'opciones') {
                const val = typeof values[c.clave] === 'object'
                  ? (values[c.clave] as ValorNormalNotas).notas ?? ''
                  : (values[c.clave] as string | undefined) ?? ''
                return (
                  <tr key={c.clave} className="align-top">
                    <td className="py-2.5 pr-4 text-slate-700">{c.nombre}</td>
                    <td colSpan={2} className="py-2.5">
                      <select
                        className="input-hce text-sm max-w-xs"
                        value={val}
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

              const pos = getEstado(c.clave)
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
                          pos
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-slate-500 hover:bg-slate-50'
                        } disabled:cursor-not-allowed`}
                      >
                        {labelPos}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstado(c.clave, false)}
                        disabled={disabled}
                        className={`px-3 py-1 text-xs font-medium transition-colors border-l border-slate-200 ${
                          !pos
                            ? 'bg-amber-500 text-white'
                            : 'bg-white text-slate-500 hover:bg-slate-50'
                        } disabled:cursor-not-allowed`}
                      >
                        {labelNeg}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5">
                    {disabled ? (
                      notas && <span className="text-slate-500 text-xs">{notas}</span>
                    ) : (
                      <textarea
                        rows={1}
                        value={notas}
                        onChange={(e) => setNotas(c.clave, e.target.value)}
                        placeholder={placeholderDetalle}
                        className="input-hce w-full resize-none text-sm"
                      />
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

// ── Revisión por sistemas ─────────────────────────────────────────────────────

const CONFIG_REVISION: TablaClinicaConfig = {
  colItem: 'Síntoma',
  colDetalle: 'Detalle',
  labelPos: 'Niega',
  labelNeg: 'Refiere',
  placeholderDetalle: 'Descripción del síntoma…',
}

interface RevisionProps {
  campos: CampoClinico[]
  values: Record<string, ValorNormalNotas>
  onChange: (values: Record<string, ValorNormalNotas>) => void
  disabled?: boolean
}

export function RevisionSistemasForm({ campos, values, onChange, disabled }: RevisionProps) {
  const activos = campos.filter((c) => c.seccion === 'revision_sistemas' && c.esta_activo)
  return (
    <TablaClinicaForm
      campos={activos}
      values={values as ValoresTabla}
      onChange={(v) => onChange(v as Record<string, ValorNormalNotas>)}
      disabled={disabled}
      config={CONFIG_REVISION}
    />
  )
}

// ── Examen físico ─────────────────────────────────────────────────────────────

const CONFIG_EXAMEN: TablaClinicaConfig = {
  colItem: 'Segmento',
  colDetalle: 'Detalle / Hallazgo',
  labelPos: 'Normal',
  labelNeg: 'Anormal',
  placeholderDetalle: 'Hallazgos…',
}

interface ExamenProps {
  campos: CampoClinico[]
  values: Record<string, string | ValorNormalNotas>
  onChange: (values: Record<string, string | ValorNormalNotas>) => void
  disabled?: boolean
}

export function ExamenFisicoForm({ campos, values, onChange, disabled }: ExamenProps) {
  const activos = campos.filter((c) => c.seccion === 'examen_fisico' && c.esta_activo)
  return (
    <TablaClinicaForm
      campos={activos}
      values={values}
      onChange={onChange}
      disabled={disabled}
      config={CONFIG_EXAMEN}
      conCamposTexto
    />
  )
}
