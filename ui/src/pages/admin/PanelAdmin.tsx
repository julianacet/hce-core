import { useState, useRef } from 'react'
import { useTema, DEFAULTS, type Tema } from '../../context/TemaContext'
import { Upload, Trash2, CheckCircle, RotateCcw } from 'lucide-react'

const PALETAS = [
  {
    nombre: 'Azul (defecto)',
    t: { colorPrimario: '#1d4ed8', colorPrimarioTexto: '#ffffff', colorPrimarioHover: '#1e40af', colorSidebar: '#1e3a5f', colorSidebarTexto: '#ffffff', colorSidebarTextoMuted: 'rgba(255,255,255,0.55)', colorFondo: '#f8fafc', colorCard: '#ffffff', colorBorde: '#e2e8f0', colorTexto: '#0f172a', colorTextoMuted: '#64748b' },
  },
  {
    nombre: 'Verde médico',
    t: { colorPrimario: '#059669', colorPrimarioTexto: '#ffffff', colorPrimarioHover: '#047857', colorSidebar: '#064e3b', colorSidebarTexto: '#ffffff', colorSidebarTextoMuted: 'rgba(255,255,255,0.55)', colorFondo: '#f0fdf4', colorCard: '#ffffff', colorBorde: '#d1fae5', colorTexto: '#052e16', colorTextoMuted: '#6b7280' },
  },
  {
    nombre: 'Violeta',
    t: { colorPrimario: '#7c3aed', colorPrimarioTexto: '#ffffff', colorPrimarioHover: '#6d28d9', colorSidebar: '#3b1f6e', colorSidebarTexto: '#ffffff', colorSidebarTextoMuted: 'rgba(255,255,255,0.55)', colorFondo: '#faf5ff', colorCard: '#ffffff', colorBorde: '#ede9fe', colorTexto: '#1e1b4b', colorTextoMuted: '#6b7280' },
  },
  {
    nombre: 'Gris oscuro',
    t: { colorPrimario: '#374151', colorPrimarioTexto: '#ffffff', colorPrimarioHover: '#1f2937', colorSidebar: '#111827', colorSidebarTexto: '#ffffff', colorSidebarTextoMuted: 'rgba(255,255,255,0.5)', colorFondo: '#f9fafb', colorCard: '#ffffff', colorBorde: '#e5e7eb', colorTexto: '#111827', colorTextoMuted: '#6b7280' },
  },
  {
    nombre: 'Claro / Light',
    t: { colorPrimario: '#2563eb', colorPrimarioTexto: '#ffffff', colorPrimarioHover: '#1d4ed8', colorSidebar: '#f1f5f9', colorSidebarTexto: '#1e293b', colorSidebarTextoMuted: '#64748b', colorFondo: '#ffffff', colorCard: '#f8fafc', colorBorde: '#e2e8f0', colorTexto: '#0f172a', colorTextoMuted: '#64748b' },
  },
]

type Campo = {
  key: keyof Tema
  label: string
  tipo: 'color' | 'text'
}

const CAMPOS_COLOR: Campo[] = [
  { key: 'colorPrimario', label: 'Color primario (botones / activos)', tipo: 'color' },
  { key: 'colorPrimarioTexto', label: 'Texto sobre botones primarios', tipo: 'color' },
  { key: 'colorPrimarioHover', label: 'Color primario al pasar el cursor', tipo: 'color' },
  { key: 'colorSidebar', label: 'Fondo del sidebar', tipo: 'color' },
  { key: 'colorSidebarTexto', label: 'Texto del sidebar', tipo: 'color' },
  { key: 'colorFondo', label: 'Fondo general del sistema', tipo: 'color' },
  { key: 'colorCard', label: 'Fondo de tarjetas y paneles', tipo: 'color' },
  { key: 'colorBorde', label: 'Color de bordes', tipo: 'color' },
  { key: 'colorTexto', label: 'Texto principal', tipo: 'color' },
  { key: 'colorTextoMuted', label: 'Texto secundario / labels', tipo: 'color' },
]

export default function PanelAdmin() {
  const { tema, guardarTema } = useTema()
  const [form, setForm] = useState<Tema>(tema)
  const [guardado, setGuardado] = useState(false)
  const inputLogo = useRef<HTMLInputElement>(null)

  function set<K extends keyof Tema>(key: K, value: Tema[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    const reader = new FileReader()
    reader.onload = (ev) => set('logoBase64', ev.target?.result as string)
    reader.readAsDataURL(archivo)
  }

  function quitarLogo() {
    set('logoBase64', null)
    if (inputLogo.current) inputLogo.current.value = ''
  }

  function aplicarPaleta(paleta: typeof PALETAS[0]) {
    setForm((prev) => ({ ...prev, ...paleta.t }))
  }

  function resetear() {
    setForm(DEFAULTS)
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    guardarTema(form)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--hce-text)' }}>Panel de administración</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--hce-text-muted)' }}>Personalización visual completa del sistema</p>
      </div>

      <form onSubmit={guardar} className="space-y-6">

        {/* Identidad */}
        <div className="card-hce p-5 space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--hce-text)' }}>Identidad</h3>

          <div>
            <label className="label-hce">Nombre del sistema</label>
            <input value={form.nombreSistema}
              onChange={(e) => set('nombreSistema', e.target.value)}
              placeholder="HCE Consultorio"
              className="input-hce" />
            <p className="text-xs mt-1" style={{ color: 'var(--hce-text-muted)' }}>
              Aparece en el sidebar, login y documentos PDF.
            </p>
          </div>

          <div>
            <label className="label-hce">Subtítulo del sidebar</label>
            <input value={form.subtituloSidebar}
              onChange={(e) => set('subtituloSidebar', e.target.value)}
              placeholder="Historia Clínica Electrónica"
              className="input-hce" />
          </div>

          {/* Logo */}
          <div>
            <label className="label-hce">Logo</label>
            {form.logoBase64 ? (
              <div className="space-y-3">
                <div className="rounded-lg p-4 flex items-center justify-center h-24"
                  style={{ backgroundColor: 'var(--hce-bg)', border: '1px solid var(--hce-border)' }}>
                  <img src={form.logoBase64} alt="Logo" className="max-h-16 object-contain" />
                </div>
                <button type="button" onClick={quitarLogo}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors">
                  <Trash2 size={14} /> Quitar logo
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-lg p-6 cursor-pointer transition-colors"
                style={{ border: '2px dashed var(--hce-border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--hce-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hce-border)')}>
                <Upload size={20} className="mb-2" style={{ color: 'var(--hce-text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>Subir logo</span>
                <span className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>PNG con fondo transparente recomendado</span>
                <input ref={inputLogo} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Paletas */}
        <div className="card-hce p-5 space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--hce-text)' }}>Paletas predefinidas</h3>
          <div className="flex flex-wrap gap-2">
            {PALETAS.map((p) => (
              <button key={p.nombre} type="button" onClick={() => aplicarPaleta(p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors"
                style={{ border: '1px solid var(--hce-border)', color: 'var(--hce-text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--hce-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hce-border)')}>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.t.colorPrimario }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.t.colorSidebar }} />
                {p.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Colores individuales */}
        <div className="card-hce p-5 space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--hce-text)' }}>Colores individuales</h3>
          <div className="space-y-3">
            {CAMPOS_COLOR.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-sm" style={{ color: 'var(--hce-text)' }}>{label}</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono w-20 text-right"
                    style={{ color: 'var(--hce-text-muted)' }}>
                    {String(form[key])}
                  </span>
                  <input type="color"
                    value={String(form[key]).startsWith('rgba') ? '#888888' : String(form[key])}
                    onChange={(e) => set(key, e.target.value as Tema[typeof key])}
                    className="w-9 h-9 rounded-md cursor-pointer p-0.5"
                    style={{ border: '1px solid var(--hce-border)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="card-hce p-5 space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--hce-text)' }}>Vista previa</h3>
          <div className="flex gap-4 items-start">
            {/* Mini sidebar */}
            <div className="rounded-lg p-3 w-36 space-y-1 shrink-0"
              style={{ backgroundColor: form.colorSidebar }}>
              <p className="text-xs font-semibold truncate" style={{ color: form.colorSidebarTexto }}>
                {form.nombreSistema || 'Sistema'}
              </p>
              <p className="text-xs truncate" style={{ color: form.colorSidebarTextoMuted, fontSize: '10px' }}>
                {form.subtituloSidebar || '—'}
              </p>
              <div className="mt-2 space-y-0.5">
                {['Inicio', 'Pacientes', 'Configuración'].map((item, i) => (
                  <div key={item} className="text-xs px-2 py-1 rounded"
                    style={{
                      backgroundColor: i === 0 ? form.colorPrimario : 'transparent',
                      color: i === 0 ? form.colorPrimarioTexto : form.colorSidebarTextoMuted,
                    }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            {/* Mini contenido */}
            <div className="flex-1 rounded-lg p-3 space-y-2"
              style={{ backgroundColor: form.colorFondo }}>
              <div className="rounded-md p-3" style={{ backgroundColor: form.colorCard, border: `1px solid ${form.colorBorde}` }}>
                <p className="text-xs font-medium mb-1" style={{ color: form.colorTexto }}>Panel de ejemplo</p>
                <p className="text-xs" style={{ color: form.colorTextoMuted }}>Texto secundario</p>
              </div>
              <button type="button" className="text-xs px-3 py-1.5 rounded-md"
                style={{ backgroundColor: form.colorPrimario, color: form.colorPrimarioTexto }}>
                Botón primario
              </button>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={resetear}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'var(--hce-text-muted)' }}>
            <RotateCcw size={14} /> Restaurar valores por defecto
          </button>
          <div className="flex items-center gap-3">
            {guardado && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle size={15} /> Guardado
              </span>
            )}
            <button type="submit" className="btn-primary">Guardar cambios</button>
          </div>
        </div>
      </form>
    </div>
  )
}
