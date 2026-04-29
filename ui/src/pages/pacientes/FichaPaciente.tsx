import { useState } from 'react'
import { useParams } from 'react-router'
import { usePaciente, useActualizarPaciente, type PacienteInput } from '../../api/pacientes'

const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {children}
    </div>
  )
}

export default function FichaPaciente() {
  const { id } = useParams()
  const { data: p, isLoading, isError } = usePaciente(id ?? '')
  const actualizar = useActualizarPaciente(id ?? '')
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Partial<PacienteInput>>({})

  if (isLoading) return <div className="p-6 text-sm text-slate-400">Cargando datos del paciente...</div>
  if (isError || !p) return <div className="p-6 text-sm text-red-500">Error al cargar los datos del paciente.</div>

  function iniciarEdicion() {
    setForm({
      tipo_documento: p!.tipo_documento,
      nombre_primero: p!.nombre_primero,
      nombre_segundo: p!.nombre_segundo ?? '',
      apellido_primero: p!.apellido_primero,
      apellido_segundo: p!.apellido_segundo ?? '',
      fecha_nacimiento: p!.fecha_nacimiento,
      genero: p!.genero,
      estado_civil: p!.estado_civil ?? '',
      ocupacion: p!.ocupacion ?? '',
      direccion: p!.direccion ?? '',
      telefono: p!.telefono ?? '',
      correo_electronico: p!.correo_electronico ?? '',
      nombre_responsable: p!.nombre_responsable ?? '',
      telefono_responsable: p!.telefono_responsable ?? '',
      parentesco_responsable: p!.parentesco_responsable ?? '',
      codigo_pais_origen: p!.codigo_pais_origen,
      codigo_municipio_residencia: p!.codigo_municipio_residencia,
      zona_residencia: p!.zona_residencia,
      tipo_usuario: p!.tipo_usuario,
      codigo_etnia: p!.codigo_etnia,
      codigo_discapacidad: p!.codigo_discapacidad,
      codigo_eps: p!.codigo_eps ?? '',
      politica_datos_aceptada: p!.politica_datos_aceptada,
    })
    setEditando(true)
  }

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
    await actualizar.mutateAsync(payload)
    setEditando(false)
  }

  // ── Vista de lectura ──────────────────────────────────────────────────────────
  if (!editando) {
    const campos: [string, string | undefined][] = [
      ['Tipo de documento', p.tipo_documento],
      ['Número de documento', p.numero_documento],
      ['Primer nombre', p.nombre_primero],
      ['Segundo nombre', p.nombre_segundo],
      ['Primer apellido', p.apellido_primero],
      ['Segundo apellido', p.apellido_segundo],
      ['Fecha de nacimiento', new Date(p.fecha_nacimiento).toLocaleDateString('es-CO')],
      ['Género', p.genero === 'M' ? 'Masculino' : p.genero === 'F' ? 'Femenino' : 'Intersexual'],
      ['Estado civil', p.estado_civil],
      ['Ocupación', p.ocupacion],
      ['Municipio de residencia', p.codigo_municipio_residencia],
      ['Zona de residencia', p.zona_residencia === 'U' ? 'Urbana' : 'Rural'],
      ['Tipo de usuario', p.tipo_usuario],
      ['EPS', p.codigo_eps],
      ['Dirección', p.direccion],
      ['Teléfono', p.telefono],
      ['Correo electrónico', p.correo_electronico],
      ['Nombre del responsable', p.nombre_responsable],
      ['Teléfono del responsable', p.telefono_responsable],
      ['Parentesco del responsable', p.parentesco_responsable],
    ]

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Datos del paciente</h3>
        <div className="grid grid-cols-2 gap-4">
          {campos.filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 mb-0.5">{label}</p>
              <p className="text-sm text-slate-800">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button onClick={iniciarEdicion}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
            Editar información
          </button>
        </div>
      </div>
    )
  }

  // ── Modo edición ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <h3 className="text-sm font-semibold text-slate-700">Editar datos del paciente</h3>

      {/* Documento — solo lectura */}
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Tipo de documento">
          <select value={form.tipo_documento} onChange={(e) => set('tipo_documento', e.target.value)} className={inputCls}>
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
        <Campo label="Número de documento">
          <input type="text" value={p.numero_documento} disabled
            className={`${inputCls} bg-slate-50 text-slate-400 cursor-not-allowed`} />
        </Campo>
      </div>

      {/* Nombres */}
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Primer nombre *">
          <input type="text" value={form.nombre_primero ?? ''} onChange={(e) => set('nombre_primero', e.target.value)}
            required className={inputCls} />
        </Campo>
        <Campo label="Segundo nombre">
          <input type="text" value={form.nombre_segundo ?? ''} onChange={(e) => set('nombre_segundo', e.target.value)}
            className={inputCls} />
        </Campo>
        <Campo label="Primer apellido *">
          <input type="text" value={form.apellido_primero ?? ''} onChange={(e) => set('apellido_primero', e.target.value)}
            required className={inputCls} />
        </Campo>
        <Campo label="Segundo apellido">
          <input type="text" value={form.apellido_segundo ?? ''} onChange={(e) => set('apellido_segundo', e.target.value)}
            className={inputCls} />
        </Campo>
      </div>

      {/* Datos personales */}
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Fecha de nacimiento *">
          <input type="date" value={form.fecha_nacimiento ?? ''} onChange={(e) => set('fecha_nacimiento', e.target.value)}
            required className={inputCls} />
        </Campo>
        <Campo label="Género *">
          <select value={form.genero} onChange={(e) => set('genero', e.target.value)} className={inputCls}>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="I">Intersexual</option>
          </select>
        </Campo>
        <Campo label="Estado civil">
          <select value={form.estado_civil ?? ''} onChange={(e) => set('estado_civil', e.target.value)} className={inputCls}>
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
          <input type="text" value={form.ocupacion ?? ''} onChange={(e) => set('ocupacion', e.target.value)}
            className={inputCls} />
        </Campo>
      </div>

      {/* Contacto */}
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Teléfono">
          <input type="tel" value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)}
            className={inputCls} />
        </Campo>
        <Campo label="Correo electrónico">
          <input type="email" value={form.correo_electronico ?? ''} onChange={(e) => set('correo_electronico', e.target.value)}
            className={inputCls} />
        </Campo>
        <Campo label="Dirección">
          <input type="text" value={form.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)}
            className={inputCls} />
        </Campo>
        <Campo label="Municipio (código DIVIPOLA)">
          <input type="text" value={form.codigo_municipio_residencia ?? ''} maxLength={5}
            onChange={(e) => set('codigo_municipio_residencia', e.target.value)}
            required className={inputCls} />
        </Campo>
        <Campo label="Zona de residencia *">
          <select value={form.zona_residencia} onChange={(e) => set('zona_residencia', e.target.value)} className={inputCls}>
            <option value="U">Urbana</option>
            <option value="R">Rural</option>
          </select>
        </Campo>
        <Campo label="País de origen (código)">
          <input type="text" value={form.codigo_pais_origen ?? ''} onChange={(e) => set('codigo_pais_origen', e.target.value)}
            required className={inputCls} />
        </Campo>
      </div>

      {/* Responsable */}
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Nombre del responsable">
          <input type="text" value={form.nombre_responsable ?? ''} onChange={(e) => set('nombre_responsable', e.target.value)}
            className={inputCls} />
        </Campo>
        <Campo label="Teléfono del responsable">
          <input type="tel" value={form.telefono_responsable ?? ''} onChange={(e) => set('telefono_responsable', e.target.value)}
            className={inputCls} />
        </Campo>
        <Campo label="Parentesco">
          <input type="text" value={form.parentesco_responsable ?? ''} onChange={(e) => set('parentesco_responsable', e.target.value)}
            className={inputCls} />
        </Campo>
      </div>

      {/* Aseguramiento */}
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Tipo de usuario *">
          <select value={form.tipo_usuario} onChange={(e) => set('tipo_usuario', e.target.value)} className={inputCls}>
            <option value="01">Contributivo</option>
            <option value="02">Subsidiado</option>
            <option value="03">Vinculado</option>
            <option value="04">Particular</option>
            <option value="05">Indígena</option>
            <option value="06">No asegurado</option>
          </select>
        </Campo>
        <Campo label="EPS / Aseguradora">
          <input type="text" value={form.codigo_eps ?? ''} onChange={(e) => set('codigo_eps', e.target.value)}
            className={inputCls} />
        </Campo>
        <Campo label="Pertenencia étnica *">
          <select value={form.codigo_etnia} onChange={(e) => set('codigo_etnia', e.target.value)} className={inputCls}>
            <option value="00">Sin pertenencia étnica</option>
            <option value="01">Indígena</option>
            <option value="02">ROM (gitano)</option>
            <option value="03">Raizal del Archipiélago</option>
            <option value="04">Palenquero de San Basilio</option>
            <option value="05">Afrocolombiano / afrodescendiente</option>
            <option value="06">Otro</option>
          </select>
        </Campo>
        <Campo label="Discapacidad *">
          <select value={form.codigo_discapacidad} onChange={(e) => set('codigo_discapacidad', e.target.value)} className={inputCls}>
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

      {actualizar.isError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {(actualizar.error as Error)?.message ?? 'Error al guardar los cambios.'}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={() => setEditando(false)} disabled={actualizar.isPending}
          className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={actualizar.isPending}
          className="text-sm bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50">
          {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
