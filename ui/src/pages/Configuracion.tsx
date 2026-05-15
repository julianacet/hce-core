import { useState, useRef } from 'react'
import { useMedico, type DatosMedico } from '../context/MedicoContext'
import { Upload, Trash2, CheckCircle } from 'lucide-react'

export default function Configuracion() {
  const { medico, guardar } = useMedico()
  const [form, setForm] = useState<DatosMedico>(medico)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputFirma = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleFirma(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    const reader = new FileReader()
    reader.onload = (ev) => setForm((prev) => ({ ...prev, firmaBase64: ev.target?.result as string }))
    reader.readAsDataURL(archivo)
  }

  function quitarFirma() {
    setForm((prev) => ({ ...prev, firmaBase64: null }))
    if (inputFirma.current) inputFirma.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await guardar(form)
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2500)
    } catch (err) {
      setError((err as Error)?.message ?? 'Error al guardar la configuración.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="page-hce">
      <div className="page-header">
        <div>
          <h2 className="page-title">Configuración</h2>
          <p className="page-desc">Datos del médico para fórmulas, facturas y documentos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Datos del consultorio */}
        <div className="card-hce p-5 space-y-4">
          <h3 className="card-title">Datos del consultorio</h3>

          <div>
            <label className="label-hce">Nombre del consultorio</label>
            <input name="nombreConsultorio" value={form.nombreConsultorio} onChange={handleChange}
              placeholder="Ej: Consultorio Médico Dr. García"
              className="input-hce" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-hce">Nombre completo del médico</label>
              <input name="nombre" value={form.nombre} onChange={handleChange}
                placeholder="Dr. Juan García López"
                className="input-hce" />
            </div>
            <div>
              <label className="label-hce">Especialidad</label>
              <input name="especialidad" value={form.especialidad} onChange={handleChange}
                placeholder="Médico General"
                className="input-hce" />
            </div>
          </div>

          <div>
            <label className="label-hce">Tarjeta profesional</label>
            <input name="tarjetaProfesional" value={form.tarjetaProfesional} onChange={handleChange}
              placeholder="TP 123456-45"
              className="input-hce" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-hce">Dirección</label>
              <input name="direccion" value={form.direccion} onChange={handleChange}
                placeholder="Calle 123 # 45-67, Consultorio 201"
                className="input-hce" />
            </div>
            <div>
              <label className="label-hce">Ciudad</label>
              <input name="ciudad" value={form.ciudad} onChange={handleChange}
                placeholder="Bogotá D.C."
                className="input-hce" />
            </div>
          </div>

          <div>
            <label className="label-hce">Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleChange}
              placeholder="601 234 5678"
              className="input-hce" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-hce">NIT del consultorio</label>
              <input name="nit" value={form.nit} onChange={handleChange}
                placeholder="900123456-7"
                className="input-hce" />
              <p className="text-xs mt-1" style={{ color: 'var(--hce-text-muted)' }}>
                Requerido para RIPS y factura electrónica
              </p>
            </div>
            <div>
              <label className="label-hce">Código habilitación (MinSalud)</label>
              <input name="codPrestador" value={form.codPrestador} onChange={handleChange}
                placeholder="1234567890" maxLength={10}
                className="input-hce" />
              <p className="text-xs mt-1" style={{ color: 'var(--hce-text-muted)' }}>
                10 dígitos — código de prestador ante el MinSalud
              </p>
            </div>
          </div>
        </div>

        {/* Perfil del usuario */}
        <div className="card-hce p-5 space-y-4">
          <div>
            <h3 className="card-title">Perfil del usuario</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
              El correo electrónico se usará para la integración futura con Google Drive (copias de seguridad automáticas).
            </p>
          </div>

          <div>
            <label className="label-hce">Correo electrónico</label>
            <input name="correoElectronico" value={form.correoElectronico} onChange={handleChange}
              type="email"
              placeholder="medico@gmail.com"
              className="input-hce" />
            <p className="text-xs mt-1" style={{ color: 'var(--hce-text-muted)' }}>
              Opcional por ahora. No se usa para el login.
            </p>
          </div>
        </div>

        {/* Reglas de negocio */}
        <div className="card-hce p-5 space-y-3">
          <h3 className="card-title">Reglas del consultorio</h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.primerControlGratis}
              onChange={(e) => setForm((prev) => ({ ...prev, primerControlGratis: e.target.checked }))}
              className="mt-0.5 rounded"
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--hce-text)' }}>Primer control sin cargo</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
                El primer control después de cualquier consulta no se factura. Los siguientes controles sí.
              </p>
            </div>
          </label>
        </div>

        {/* Firma */}
        <div className="card-hce p-5 space-y-4">
          <div>
            <h3 className="card-title">Firma del médico</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
              Imagen escaneada o fotografiada de la firma. Se incluye en las fórmulas médicas si lo elegís.
            </p>
          </div>

          {form.firmaBase64 ? (
            <div className="space-y-3">
              <div className="rounded-lg p-4 flex items-center justify-center h-24"
                style={{ backgroundColor: 'var(--hce-bg)', border: '1px solid var(--hce-border)' }}>
                <img src={form.firmaBase64} alt="Firma" className="max-h-16 object-contain" />
              </div>
              <button type="button" onClick={quitarFirma}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors">
                <Trash2 size={14} /> Quitar firma
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center rounded-lg p-8 cursor-pointer transition-colors border-2 border-dashed border-[var(--hce-border)] hover:border-[var(--hce-primary)]">
              <Upload size={22} className="mb-2" style={{ color: 'var(--hce-text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
                Hacé clic para subir la imagen de tu firma
              </span>
              <span className="text-xs mt-1" style={{ color: 'var(--hce-text-muted)' }}>
                PNG, JPG — fondo blanco o transparente
              </span>
              <input ref={inputFirma} type="file" accept="image/*" onChange={handleFirma} className="hidden" />
            </label>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          {guardado && !guardando && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle size={15} /> Guardado correctamente
            </span>
          )}
          <button type="submit" disabled={guardando} className="btn-primary disabled:opacity-60">
            {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </div>
  )
}
