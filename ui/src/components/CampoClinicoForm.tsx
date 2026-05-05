import type { CampoClinico } from '../api/campos_clinicos'
import type { ValorNormalNotas } from '../api/encuentros'

// ── Signos vitales ────────────────────────────────────────────────────────────

interface SignosProps {
  campos: CampoClinico[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

export function SignosVitalesForm({ campos, values, onChange }: SignosProps) {
  function set(clave: string, valor: string) {
    onChange({ ...values, [clave]: valor })
  }

  const activos = campos.filter((c) => c.seccion === 'signos_vitales' && c.esta_activo)

  // Agrupar TA sistólica y diastólica como par visual
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

        // Par TA: renderizar sistólica + diastólica juntas
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
                  className="input-hce"
                />
                <span className="text-slate-400 shrink-0">/</span>
                <input
                  type="number" placeholder="Diastólica" min={20} max={200}
                  value={values['ta_diastolica'] ?? ''}
                  onChange={(e) => set('ta_diastolica', e.target.value)}
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
              className="input-hce"
            />
          </div>
        )
      })}

      {/* IMC calculado */}
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

// ── Examen físico ─────────────────────────────────────────────────────────────

interface ExamenProps {
  campos: CampoClinico[]
  values: Record<string, string | ValorNormalNotas>
  onChange: (values: Record<string, string | ValorNormalNotas>) => void
}

export function ExamenFisicoForm({ campos, values, onChange }: ExamenProps) {
  const activos = campos.filter((c) => c.seccion === 'examen_fisico' && c.esta_activo)

  function setTexto(clave: string, valor: string) {
    onChange({ ...values, [clave]: valor })
  }

  function setNormal(clave: string, normal: boolean) {
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

  return (
    <div className="space-y-3">
      {activos.map((c) => {
        if (c.tipo === 'texto') {
          return (
            <div key={c.clave}>
              <label className="label-hce">{c.nombre}</label>
              <textarea
                rows={2}
                value={typeof values[c.clave] === 'string' ? (values[c.clave] as string) : ''}
                onChange={(e) => setTexto(c.clave, e.target.value)}
                className="input-hce resize-none"
                placeholder="Descripción general del paciente…"
              />
            </div>
          )
        }

        // normal_notas
        const normal = getNormal(c.clave)
        const notas = getNotas(c.clave)

        return (
          <div key={c.clave} className="flex items-start gap-3">
            <label className="flex items-center gap-2 min-w-44 cursor-pointer pt-1.5">
              <input
                type="checkbox"
                checked={normal}
                onChange={(e) => setNormal(c.clave, e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--hce-text)' }}>{c.nombre}</span>
            </label>
            {!normal && (
              <textarea
                rows={1}
                value={notas}
                onChange={(e) => setNotas(c.clave, e.target.value)}
                placeholder="Hallazgos…"
                className="input-hce flex-1 resize-none text-sm"
                autoFocus
              />
            )}
            {normal && (
              <button
                type="button"
                onClick={() => setNormal(c.clave, false)}
                className="text-xs text-slate-400 hover:text-slate-600 pt-1.5"
              >
                + detalle
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
