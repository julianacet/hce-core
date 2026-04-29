import { useParams } from 'react-router'
import { usePaciente } from '../../api/pacientes'

export default function FichaPaciente() {
  const { id } = useParams()
  const { data: p, isLoading, isError } = usePaciente(id ?? '')

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-400">Cargando datos del paciente...</div>
  }

  if (isError || !p) {
    return <div className="p-6 text-sm text-red-500">Error al cargar los datos del paciente.</div>
  }

  const campos: [string, string | undefined][] = [
    ['Tipo de documento', p.tipo_documento],
    ['Número de documento', p.numero_documento],
    ['Primer nombre', p.nombre_primero],
    ['Segundo nombre', p.nombre_segundo],
    ['Primer apellido', p.apellido_primero],
    ['Segundo apellido', p.apellido_segundo],
    ['Fecha de nacimiento', new Date(p.fecha_nacimiento).toLocaleDateString('es-CO')],
    ['Género', p.genero],
    ['Estado civil', p.estado_civil],
    ['Ocupación', p.ocupacion],
    ['Municipio de residencia', p.codigo_municipio_residencia],
    ['Zona de residencia', p.zona_residencia],
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
        <button className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
          Editar información
        </button>
      </div>
    </div>
  )
}
