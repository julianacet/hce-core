import { useNavigate, useParams } from 'react-router'
import { useCrearEncuentro } from '../../api/encuentros'
import { usePaciente } from '../../api/pacientes'
import EncuentroForm from '../../components/EncuentroForm'

export default function NuevoEncuentro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const crear = useCrearEncuentro(id ?? '')
  const { data: paciente } = usePaciente(id ?? '')

  async function handleSubmit(data: Parameters<typeof crear.mutateAsync>[0]) {
    const encuentro = await crear.mutateAsync(data)
    navigate(`/pacientes/${id}/encuentros/${encuentro.encuentro_id}`)
  }

  return (
    <EncuentroForm
      documento={id ?? ''}
      genero={paciente?.genero}
      onSubmit={handleSubmit}
      isPending={crear.isPending}
      submitLabel="Crear encuentro"
      onCancelar={() => navigate(-1)}
    />
  )
}
