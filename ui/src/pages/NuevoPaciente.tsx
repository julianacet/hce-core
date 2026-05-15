import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useCrearPaciente, type PacienteInput } from '../api/pacientes'
import PacienteFormFields from '../components/PacienteFormFields'

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

const CAMPOS_OPCIONALES: (keyof PacienteInput)[] = [
  'nombre_segundo', 'apellido_segundo', 'estado_civil', 'ocupacion', 'direccion',
  'telefono', 'correo_electronico', 'nombre_responsable', 'telefono_responsable',
  'parentesco_responsable', 'codigo_eps',
]

export default function NuevoPaciente() {
  const navigate = useNavigate()
  const crear = useCrearPaciente()
  const [form, setForm] = useState<PacienteInput>(initialForm)
  const [ocupacionNombre, setOcupacionNombre] = useState('')

  function handleChange(campo: keyof PacienteInput, valor: string | boolean) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form }
    for (const campo of CAMPOS_OPCIONALES) {
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
        <PacienteFormFields
          form={form}
          onChange={handleChange}
          ocupacionNombre={ocupacionNombre}
          onOcupacionNombreChange={setOcupacionNombre}
          showPoliticaDatos
        />

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
          <button type="submit" disabled={crear.isPending} className="btn-primary">
            {crear.isPending ? 'Registrando...' : 'Registrar paciente'}
          </button>
        </div>
      </form>
    </div>
  )
}
