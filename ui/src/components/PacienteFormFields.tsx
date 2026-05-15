import type { PacienteInput } from '../api/pacientes'
import { SelectorMunicipioCol, SelectorPais } from './SelectorUbicacion'
import { SelectorOcupacion } from './SelectorOcupacion'
import { SelectorEps } from './SelectorEps'
import { calcularEdad } from '../utils/paciente'

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

type Props = {
  form: Partial<PacienteInput>
  onChange: (campo: keyof PacienteInput, valor: string | boolean) => void
  ocupacionNombre: string
  onOcupacionNombreChange: (nombre: string) => void
  showPoliticaDatos?: boolean
}

export default function PacienteFormFields({
  form, onChange, ocupacionNombre, onOcupacionNombreChange, showPoliticaDatos = false,
}: Props) {
  const set = (campo: keyof PacienteInput, valor: string | boolean) => onChange(campo, valor)

  return (
    <>
      {/* Identificación */}
      <Seccion titulo="Identificación">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Tipo de documento" required>
            <select value={form.tipo_documento ?? 'CC'} onChange={e => set('tipo_documento', e.target.value)} className="input-hce">
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
            <input type="text" value={form.numero_documento ?? ''} onChange={e => set('numero_documento', e.target.value)}
              required placeholder="Ej: 1234567890" className="input-hce" />
          </Campo>
        </div>
      </Seccion>

      {/* Nombres */}
      <Seccion titulo="Nombres y apellidos">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Primer nombre" required>
            <input type="text" value={form.nombre_primero ?? ''} onChange={e => set('nombre_primero', e.target.value)}
              required placeholder="Ej: María" className="input-hce" />
          </Campo>
          <Campo label="Segundo nombre">
            <input type="text" value={form.nombre_segundo ?? ''} onChange={e => set('nombre_segundo', e.target.value)}
              placeholder="Opcional" className="input-hce" />
          </Campo>
          <Campo label="Primer apellido" required>
            <input type="text" value={form.apellido_primero ?? ''} onChange={e => set('apellido_primero', e.target.value)}
              required placeholder="Ej: García" className="input-hce" />
          </Campo>
          <Campo label="Segundo apellido">
            <input type="text" value={form.apellido_segundo ?? ''} onChange={e => set('apellido_segundo', e.target.value)}
              placeholder="Opcional" className="input-hce" />
          </Campo>
        </div>
      </Seccion>

      {/* Datos personales */}
      <Seccion titulo="Datos personales">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Fecha de nacimiento" required>
            <input type="date" value={form.fecha_nacimiento ?? ''} onChange={e => set('fecha_nacimiento', e.target.value)}
              required className="input-hce" />
          </Campo>
          <Campo label="Edad">
            <input type="text" readOnly
              value={form.fecha_nacimiento ? (calcularEdad(form.fecha_nacimiento) !== null ? `${calcularEdad(form.fecha_nacimiento)} años` : '') : ''}
              placeholder="Se calcula automáticamente"
              className="input-hce bg-slate-50 text-slate-500 cursor-default" />
          </Campo>
          <Campo label="Género" required>
            <select value={form.genero ?? 'M'} onChange={e => set('genero', e.target.value)} className="input-hce">
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="X">Otro</option>
            </select>
          </Campo>
          <Campo label="Estado civil">
            <select value={form.estado_civil ?? ''} onChange={e => set('estado_civil', e.target.value)} className="input-hce">
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
              onChange={(codigo, nombre) => { set('ocupacion', codigo); onOcupacionNombreChange(nombre) }}
            />
          </Campo>
        </div>
      </Seccion>

      {/* Contacto */}
      <Seccion titulo="Contacto y ubicación">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Teléfono">
            <input type="tel" value={form.telefono ?? ''} onChange={e => set('telefono', e.target.value)}
              placeholder="Ej: 3001234567" className="input-hce" />
          </Campo>
          <Campo label="Correo electrónico">
            <input type="email" value={form.correo_electronico ?? ''} onChange={e => set('correo_electronico', e.target.value)}
              placeholder="Ej: correo@ejemplo.com" className="input-hce" />
          </Campo>
          <SelectorMunicipioCol
            value={form.codigo_municipio_residencia ?? ''}
            onChange={v => set('codigo_municipio_residencia', v)}
            required
          />
          <Campo label="Dirección">
            <input type="text" value={form.direccion ?? ''} onChange={e => set('direccion', e.target.value)}
              placeholder="Ej: Cra 10 # 20-30" className="input-hce" />
          </Campo>
          <Campo label="Zona de residencia" required>
            <select value={form.zona_residencia ?? 'U'} onChange={e => set('zona_residencia', e.target.value)} className="input-hce">
              <option value="U">Urbana</option>
              <option value="R">Rural</option>
            </select>
          </Campo>
          <Campo label="País de origen" required>
            <SelectorPais
              value={form.codigo_pais_origen ?? '170'}
              onChange={v => set('codigo_pais_origen', v)}
              required
            />
          </Campo>
        </div>
      </Seccion>

      {/* Responsable */}
      <Seccion titulo="Acompañante o responsable">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Nombre del responsable">
            <input type="text" value={form.nombre_responsable ?? ''} onChange={e => set('nombre_responsable', e.target.value)}
              placeholder="Nombre completo" className="input-hce" />
          </Campo>
          <Campo label="Teléfono del responsable">
            <input type="tel" value={form.telefono_responsable ?? ''} onChange={e => set('telefono_responsable', e.target.value)}
              placeholder="Ej: 3009876543" className="input-hce" />
          </Campo>
          <Campo label="Parentesco">
            <input type="text" value={form.parentesco_responsable ?? ''} onChange={e => set('parentesco_responsable', e.target.value)}
              placeholder="Ej: Madre, Cónyuge" className="input-hce" />
          </Campo>
        </div>
      </Seccion>

      {/* Aseguramiento */}
      <Seccion titulo="Información de salud">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Tipo de usuario" required>
            <select value={form.tipo_usuario ?? '04'} onChange={e => set('tipo_usuario', e.target.value)} className="input-hce">
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
            onChange={v => set('codigo_eps', v)}
          />
          <Campo label="Pertenencia étnica" required>
            <select value={form.codigo_etnia ?? '00'} onChange={e => set('codigo_etnia', e.target.value)} className="input-hce">
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
            <select value={form.codigo_discapacidad ?? '00'} onChange={e => set('codigo_discapacidad', e.target.value)} className="input-hce">
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

      {/* Política de datos — solo en registro nuevo */}
      {showPoliticaDatos && (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.politica_datos_aceptada ?? false}
              onChange={e => set('politica_datos_aceptada', e.target.checked)}
              required
              className="mt-0.5 rounded"
            />
            <span className="text-sm text-slate-700">
              El paciente autoriza el tratamiento de sus datos personales y de salud conforme a la política de privacidad del consultorio y la Ley 1581 de 2012.{' '}
              <span className="text-red-400">*</span>
            </span>
          </label>
        </div>
      )}
    </>
  )
}
