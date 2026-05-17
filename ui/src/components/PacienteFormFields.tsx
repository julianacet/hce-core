import { useState } from 'react'
import type { PacienteInput } from '../api/pacientes'
import { useNivelesEscolaridad } from '../api/pacientes'
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
      <label className="label-hce">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

type Props = {
  form: Partial<PacienteInput>
  onChange: (campo: keyof PacienteInput, valor: string | boolean | number | undefined) => void
  ocupacionNombre: string
  onOcupacionNombreChange: (nombre: string) => void
  showPoliticaDatos?: boolean
}

export default function PacienteFormFields({
  form, onChange, ocupacionNombre, onOcupacionNombreChange, showPoliticaDatos = false,
}: Props) {
  const set = (campo: keyof PacienteInput, valor: string | boolean | number | undefined) => onChange(campo, valor)
  const [acompananteAbierto, setAcompananteAbierto] = useState(false)
  const [etniaDiscAbierta, setEtniaDscAbierta] = useState(false)
  const edad = form.fecha_nacimiento ? calcularEdad(form.fecha_nacimiento) : null
  const { data: nivelesEscolaridad = [] } = useNivelesEscolaridad()

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
            <div className="flex items-center gap-2">
              <input type="date" value={form.fecha_nacimiento ?? ''} onChange={e => set('fecha_nacimiento', e.target.value)}
                required className="input-hce" />
              {edad !== null && (
                <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap shrink-0"
                  style={{ backgroundColor: 'var(--hce-bg)', color: 'var(--hce-text-muted)', border: '1px solid var(--hce-border)' }}>
                  {edad} años
                </span>
              )}
            </div>
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
          <Campo label="Nivel de escolaridad">
            <select
              value={form.nivel_escolaridad_id ?? ''}
              onChange={e => set('nivel_escolaridad_id', e.target.value ? Number(e.target.value) : undefined)}
              className="input-hce"
            >
              <option value="">— Seleccionar —</option>
              {nivelesEscolaridad.map(n => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Grupo sanguíneo">
            <select value={form.grupo_sanguineo ?? ''} onChange={e => set('grupo_sanguineo', e.target.value)} className="input-hce">
              <option value="">— Seleccionar —</option>
              {['A', 'B', 'AB', 'O'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Campo>
          <Campo label="Factor RH">
            <select value={form.rh_factor ?? ''} onChange={e => set('rh_factor', e.target.value)} className="input-hce">
              <option value="">— Seleccionar —</option>
              <option value="+">Positivo (+)</option>
              <option value="-">Negativo (−)</option>
            </select>
          </Campo>
          <div className="col-span-2">
            <Campo label="Género" required>
              <div className="flex gap-6 mt-1.5">
                {([['M', 'Masculino'], ['F', 'Femenino'], ['X', 'Otro']] as const).map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer select-none"
                    style={{ color: 'var(--hce-text)' }}>
                    <input type="radio" name="genero" value={v}
                      checked={(form.genero ?? 'M') === v}
                      onChange={e => set('genero', e.target.value)} />
                    <span className="text-sm">{l}</span>
                  </label>
                ))}
              </div>
            </Campo>
          </div>
          <div className="col-span-2">
            <Campo label="Ocupación">
              <SelectorOcupacion
                value={form.ocupacion ?? ''}
                nombre={ocupacionNombre}
                onChange={(codigo, nombre) => { set('ocupacion', codigo); onOcupacionNombreChange(nombre) }}
              />
            </Campo>
          </div>
        </div>
      </Seccion>

      {/* Contacto y ubicación */}
      <Seccion titulo="Contacto y ubicación">
        <div className="grid grid-cols-2 gap-4">

          {/* Contacto */}
          <Campo label="Teléfono">
            <input type="tel" value={form.telefono ?? ''} onChange={e => set('telefono', e.target.value)}
              placeholder="Ej: 3001234567" className="input-hce" />
          </Campo>
          <Campo label="Correo electrónico">
            <input type="email" value={form.correo_electronico ?? ''} onChange={e => set('correo_electronico', e.target.value)}
              placeholder="Ej: correo@ejemplo.com" className="input-hce" />
          </Campo>

          {/* Dirección + zona */}
          <Campo label="Dirección">
            <input type="text" value={form.direccion ?? ''} onChange={e => set('direccion', e.target.value)}
              placeholder="Ej: Cra 10 # 20-30" className="input-hce" />
          </Campo>
          <Campo label="Zona de residencia" required>
            <div className="flex gap-6 mt-1.5">
              {([['U', 'Urbana'], ['R', 'Rural']] as const).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer select-none"
                  style={{ color: 'var(--hce-text)' }}>
                  <input type="radio" name="zona_residencia" value={v}
                    checked={(form.zona_residencia ?? 'U') === v}
                    onChange={e => set('zona_residencia', e.target.value)} />
                  <span className="text-sm">{l}</span>
                </label>
              ))}
            </div>
          </Campo>

          {/* Municipio de residencia */}
          <SelectorMunicipioCol
            value={form.codigo_municipio_residencia ?? ''}
            onChange={v => set('codigo_municipio_residencia', v)}
            required
          />

          {/* País de origen — separado de residencia, default Colombia */}
          <Campo label="País de origen">
            <SelectorPais
              value={form.codigo_pais_origen ?? '170'}
              onChange={v => set('codigo_pais_origen', v)}
              required
            />
          </Campo>
        </div>
      </Seccion>

      {/* Información de salud */}
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
          <div />
          <SelectorEps
            value={form.codigo_eps ?? ''}
            onChange={v => set('codigo_eps', v)}
          />
        </div>

      </Seccion>

      {/* Pertenencia étnica y discapacidad — colapsable */}
      <div className="card-hce overflow-hidden">
        <button
          type="button"
          onClick={() => setEtniaDscAbierta(v => !v)}
          className="w-full flex items-center gap-2 px-6 py-4 text-left transition-colors bg-slate-50 hover:bg-slate-100"
        >
          <h4 className="section-title !mb-0">Pertenencia étnica y discapacidad</h4>
          <span className="text-xs font-medium" style={{ color: 'var(--hce-primary)' }}>
            {etniaDiscAbierta ? 'Ocultar' : 'Mostrar'}
          </span>
        </button>

        {etniaDiscAbierta && (
          <div className="px-6 pb-6 grid grid-cols-2 gap-4 border-t" style={{ borderColor: 'var(--hce-border)' }}>
            <div className="col-span-2 pt-4" />
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
        )}
      </div>

      {/* Acompañante / responsable — colapsable */}
      <div className="card-hce overflow-hidden">
        <button
          type="button"
          onClick={() => setAcompananteAbierto(v => !v)}
          className="w-full flex items-center gap-2 px-6 py-4 text-left transition-colors bg-slate-50 hover:bg-slate-100"
        >
          <h4 className="section-title !mb-0">Acompañante o responsable</h4>
          <span className="text-xs font-medium" style={{ color: 'var(--hce-primary)' }}>
            {acompananteAbierto ? 'Ocultar' : 'Mostrar'}
          </span>
        </button>

        {acompananteAbierto && (
          <div className="px-6 pb-6 grid grid-cols-2 gap-4 border-t" style={{ borderColor: 'var(--hce-border)' }}>
            <div className="col-span-2 pt-4" />
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
        )}
      </div>

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
