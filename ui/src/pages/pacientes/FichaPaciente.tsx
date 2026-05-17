import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { usePaciente, useActualizarPaciente, type PacienteInput } from '../../api/pacientes'
import { useMunicipio } from '../../api/divipola'
import { useOcupacion } from '../../api/ocupaciones'
import { useEpsInfo } from '../../api/eps'
import { nombrePais } from '../../data/paises'
import PacienteFormFields from '../../components/PacienteFormFields'
import { fmtFechaNacimiento } from '../../utils/paciente'

export default function FichaPaciente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: p, isLoading, isError } = usePaciente(id ?? '')
  const actualizar = useActualizarPaciente(id ?? '')
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Partial<PacienteInput>>({})
  const { data: municipioNombre } = useMunicipio(p?.codigo_municipio_residencia ?? '')
  const { data: ocupacionData } = useOcupacion(p?.ocupacion ?? '')
  const { data: epsData } = useEpsInfo(p?.codigo_eps ?? '')
  const [editOcupacionNombre, setEditOcupacionNombre] = useState('')

  if (isLoading) return <div className="p-6 text-sm text-slate-400">Cargando datos del paciente...</div>
  if (isError || !p) return <div className="p-6 text-sm text-red-500">Error al cargar los datos del paciente.</div>

  function iniciarEdicion() {
    setEditOcupacionNombre(ocupacionData?.nombre ?? '')
    setForm({
      tipo_documento: p!.tipo_documento,
      numero_documento: p!.numero_documento,
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
    if (payload.numero_documento && payload.numero_documento !== p!.numero_documento) {
      navigate(`/pacientes/${payload.numero_documento}`, { replace: true })
    }
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
      ['Fecha de nacimiento', fmtFechaNacimiento(p.fecha_nacimiento)],
      ['Edad', `${p.edad} años`],
      ['Género', p.genero_nombre],
      ['Estado civil', p.estado_civil_nombre],
      ['Ocupación', ocupacionData?.nombre ?? p.ocupacion],
      ['Municipio de residencia', municipioNombre ?? p.codigo_municipio_residencia],
      ['País de origen', nombrePais(p.codigo_pais_origen)],
      ['Zona de residencia', p.zona_residencia_nombre],
      ['Tipo de usuario', p.tipo_usuario_nombre],
      ['EPS', epsData ? `${epsData.nombre}` : p.codigo_eps],
      ['Dirección', p.direccion],
      ['Teléfono', p.telefono],
      ['Correo electrónico', p.correo_electronico],
      ['Nombre del responsable', p.nombre_responsable],
      ['Teléfono del responsable', p.telefono_responsable],
      ['Parentesco del responsable', p.parentesco_responsable],
    ]

    return (
      <div className="card-hce p-6">
        <h3 className="card-title mb-4">Datos del paciente</h3>
        <div className="grid grid-cols-2 gap-4">
          {campos.filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <p className="label-hce">{label}</p>
              <p className="text-sm" style={{ color: 'var(--hce-text)' }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button onClick={iniciarEdicion} className="btn-ghost">
            Editar información
          </button>
        </div>
      </div>
    )
  }

  // ── Modo edición ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PacienteFormFields
        form={form}
        onChange={set}
        ocupacionNombre={editOcupacionNombre}
        onOcupacionNombreChange={setEditOcupacionNombre}
      />

      {actualizar.isError && (
        <p className="form-error">
          {(actualizar.error as Error)?.message ?? 'Error al guardar los cambios.'}
        </p>
      )}

      <div className="flex justify-end gap-3 pb-6">
        <button type="button" onClick={() => setEditando(false)} disabled={actualizar.isPending}
          className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={actualizar.isPending} className="btn-primary">
          {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
