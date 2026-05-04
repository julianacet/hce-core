import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useCrearPaciente, type PacienteInput } from '../api/pacientes'
import { SelectorMunicipioCol, SelectorPais } from '../components/SelectorUbicacion'
import { SelectorOcupacion } from '../components/SelectorOcupacion'
import { SelectorEps } from '../components/SelectorEps'

const initialForm: PacienteInput = {
  tipo_documento: 'CC',
  numero_documento: '',
  nombre_primero: '',
  nombre_segundo: '',
  apellido_primero: '',
  apellido_segundo: '',
  fecha_nacimiento: '',
  genero: 'M',
  estado_civil: '',
  ocupacion: '',
  direccion: '',
  telefono: '',
  correo_electronico: '',
  nombre_responsable: '',
  telefono_responsable: '',
  parentesco_responsable: '',
  codigo_pais_origen: '170',
  codigo_municipio_residencia: '',
  zona_residencia: 'U',
  tipo_usuario: '04',
  codigo_eps: '',
  codigo_etnia: '00',
  codigo_discapacidad: '00',
  politica_datos_aceptada: false,
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card-hce p-6 space-y-4">
      <h4 className="section-title">{titulo}</h4>
      {children}
    </div>
  )
}

function Campo({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function NuevoPaciente() {
  const navigate = useNavigate()
  const crear = useCrearPaciente()
  const [form, setForm] = useState<PacienteInput>(initialForm)
  const [ocupacionNombre, setOcupacionNombre] = useState('')

  function set(campo: keyof PacienteInput, valor: string | boolean) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const camposOpcionales: (keyof PacienteInput)[] = [
      'nombre_segundo', 'apellido_segundo', 'estado_civil', 'ocupacion', 'direccion',
      'telefono', 'correo_electronico', 'nombre_responsable', 'telefono_responsable',
      'parentesco_responsable', 'codigo_eps',
    ]
    const payload = { ...form }
    for (const campo of camposOpcionales) {
      if (payload[campo] === '') (payload as Record<string, unknown>)[campo] = undefined
    }
    const paciente = await crear.mutateAsync(payload)
    navigate(`/pacientes/${paciente.numero_documento}`)
  }

  return (
    <div className="page-hce space-y-4">
      <div className="page-header">
        <div>
          <h2 className="page-title">Nuevo paciente</h2>
          <p className="page-desc">Completar los campos obligatorios marcados con *</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Identificación */}
        <Seccion titulo="Identificación">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Tipo de documento" required>
              <select value={form.tipo_documento} onChange={(e) => set('tipo_documento', e.target.value)} className="input-hce">
                <option value="CC">CC — Cédula de Ciudadanía</option>
                <option value="TI">TI — Tarjeta de Identidad</option>
                <option value="CE">CE — Cédula de Extranjería</option>
                <option value="PA">PA — Pasaporte</option>
                <option value="RC">RC — Registro Civil</option>
                <option value="NV">NV — Nacido Vivo</option>
                <option value="PE">PE — Permiso Especial de Permanencia</option>
                <option value="PT">PT — Permiso por Protección Temporal</option>
                <option value="MS">MS — Menor sin identificación</option>
                <option value="AS">AS — Adulto sin identificación</option>
              </select>
            </Campo>
            <Campo label="Número de documento" required>
              <input type="text" value={form.numero_documento} onChange={(e) => set('numero_documento', e.target.value)}
                required placeholder="Ej: 1234567890" className="input-hce" />
            </Campo>
          </div>
        </Seccion>

        {/* Nombres */}
        <Seccion titulo="Nombres y apellidos">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Primer nombre" required>
              <input type="text" value={form.nombre_primero} onChange={(e) => set('nombre_primero', e.target.value)}
                required placeholder="Ej: María" className="input-hce" />
            </Campo>
            <Campo label="Segundo nombre">
              <input type="text" value={form.nombre_segundo} onChange={(e) => set('nombre_segundo', e.target.value)}
                placeholder="Opcional" className="input-hce" />
            </Campo>
            <Campo label="Primer apellido" required>
              <input type="text" value={form.apellido_primero} onChange={(e) => set('apellido_primero', e.target.value)}
                required placeholder="Ej: García" className="input-hce" />
            </Campo>
            <Campo label="Segundo apellido">
              <input type="text" value={form.apellido_segundo} onChange={(e) => set('apellido_segundo', e.target.value)}
                placeholder="Opcional" className="input-hce" />
            </Campo>
          </div>
        </Seccion>

        {/* Datos personales */}
        <Seccion titulo="Datos personales">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Fecha de nacimiento" required>
              <input type="date" value={form.fecha_nacimiento} onChange={(e) => set('fecha_nacimiento', e.target.value)}
                required className="input-hce" />
            </Campo>
            <Campo label="Género" required>
              <select value={form.genero} onChange={(e) => set('genero', e.target.value)} className="input-hce">
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="I">Intersexual</option>
              </select>
            </Campo>
            <Campo label="Estado civil">
              <select value={form.estado_civil} onChange={(e) => set('estado_civil', e.target.value)} className="input-hce">
                <option value="">— Seleccionar —</option>
                <option value="01">Soltero/a</option>
                <option value="02">Casado/a</option>
                <option value="03">Unión libre</option>
                <option value="04">Separado/a</option>
                <option value="05">Divorciado/a</option>
                <option value="06">Viudo/a</option>
              </select>
            </Campo>
            <Campo label="Ocupación">
              <SelectorOcupacion
                value={form.ocupacion ?? ''}
                nombre={ocupacionNombre}
                onChange={(codigo, nombre) => { set('ocupacion', codigo); setOcupacionNombre(nombre) }}
              />
            </Campo>
          </div>
        </Seccion>

        {/* Contacto */}
        <Seccion titulo="Contacto y ubicación">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Teléfono">
              <input type="tel" value={form.telefono} onChange={(e) => set('telefono', e.target.value)}
                placeholder="Ej: 3001234567" className="input-hce" />
            </Campo>
            <Campo label="Correo electrónico">
              <input type="email" value={form.correo_electronico} onChange={(e) => set('correo_electronico', e.target.value)}
                placeholder="Ej: correo@ejemplo.com" className="input-hce" />
            </Campo>
            <SelectorMunicipioCol
              value={form.codigo_municipio_residencia}
              onChange={(v) => set('codigo_municipio_residencia', v)}
              required
            />
            <Campo label="Dirección">
              <input type="text" value={form.direccion} onChange={(e) => set('direccion', e.target.value)}
                placeholder="Ej: Cra 10 # 20-30" className="input-hce" />
            </Campo>
            <Campo label="Zona de residencia" required>
              <select value={form.zona_residencia} onChange={(e) => set('zona_residencia', e.target.value)} className="input-hce">
                <option value="U">Urbana</option>
                <option value="R">Rural</option>
              </select>
            </Campo>
            <Campo label="País de origen" required>
              <SelectorPais
                value={form.codigo_pais_origen}
                onChange={(v) => set('codigo_pais_origen', v)}
                required
              />
            </Campo>
          </div>
        </Seccion>

        {/* Responsable */}
        <Seccion titulo="Acompañante o responsable">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nombre del responsable">
              <input type="text" value={form.nombre_responsable} onChange={(e) => set('nombre_responsable', e.target.value)}
                placeholder="Nombre completo" className="input-hce" />
            </Campo>
            <Campo label="Teléfono del responsable">
              <input type="tel" value={form.telefono_responsable} onChange={(e) => set('telefono_responsable', e.target.value)}
                placeholder="Ej: 3009876543" className="input-hce" />
            </Campo>
            <Campo label="Parentesco">
              <input type="text" value={form.parentesco_responsable} onChange={(e) => set('parentesco_responsable', e.target.value)}
                placeholder="Ej: Madre, Cónyuge" className="input-hce" />
            </Campo>
          </div>
        </Seccion>

        {/* Aseguramiento */}
        <Seccion titulo="Información de salud">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Tipo de usuario" required>
              <select value={form.tipo_usuario} onChange={(e) => set('tipo_usuario', e.target.value)} className="input-hce">
                <option value="01">Contributivo</option>
                <option value="02">Subsidiado</option>
                <option value="03">Vinculado</option>
                <option value="04">Particular</option>
                <option value="05">Indígena</option>
                <option value="06">No asegurado</option>
              </select>
            </Campo>
            <SelectorEps
              value={form.codigo_eps ?? ''}
              onChange={(v) => set('codigo_eps', v)}
            />
            <Campo label="Pertenencia étnica" required>
              <select value={form.codigo_etnia} onChange={(e) => set('codigo_etnia', e.target.value)} className="input-hce">
                <option value="00">Sin pertenencia étnica</option>
                <option value="01">Indígena</option>
                <option value="02">ROM (gitano)</option>
                <option value="03">Raizal del Archipiélago</option>
                <option value="04">Palenquero de San Basilio</option>
                <option value="05">Afrocolombiano / afrodescendiente</option>
                <option value="06">Otro</option>
              </select>
            </Campo>
            <Campo label="Discapacidad" required>
              <select value={form.codigo_discapacidad} onChange={(e) => set('codigo_discapacidad', e.target.value)} className="input-hce">
                <option value="00">Sin discapacidad</option>
                <option value="01">Física</option>
                <option value="02">Cognitiva</option>
                <option value="03">Mental</option>
                <option value="04">Visual</option>
                <option value="05">Auditiva</option>
                <option value="06">Múltiple</option>
              </select>
            </Campo>
          </div>
        </Seccion>

        {/* Política de datos */}
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.politica_datos_aceptada}
              onChange={(e) => set('politica_datos_aceptada', e.target.checked)}
              required
              className="mt-0.5 rounded"
            />
            <span className="text-sm text-slate-700">
              El paciente autoriza el tratamiento de sus datos personales y de salud conforme a la política de privacidad del consultorio y la Ley 1581 de 2012. <span className="text-red-400">*</span>
            </span>
          </label>
        </div>

        {crear.isError && (
          <p className="form-error">
            {(crear.error as Error)?.message ?? 'Error al registrar el paciente.'}
          </p>
        )}

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" onClick={() => navigate(-1)} disabled={crear.isPending}
            className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={crear.isPending}
            className="btn-primary">
            {crear.isPending ? 'Registrando...' : 'Registrar paciente'}
          </button>
        </div>
      </form>
    </div>
  )
}
