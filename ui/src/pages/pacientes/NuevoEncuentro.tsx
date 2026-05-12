import { useNavigate, useParams } from 'react-router'
import { useTabParam } from '../../hooks/useTabParam'
import { useCrearEncuentro } from '../../api/encuentros'
import { usePaciente } from '../../api/pacientes'
import EncuentroForm from '../../components/EncuentroForm'
import AntecedentesTab from '../../components/AntecedentesTab'

type Tab = 'consulta' | 'antecedentes' | 'formula' | 'consentimiento'

const TABS: { key: Tab; label: string; disabled?: boolean }[] = [
  { key: 'consulta', label: 'Nota clínica' },
  { key: 'antecedentes', label: 'Antecedentes' },
  { key: 'formula', label: 'Fórmula', disabled: true },
  { key: 'consentimiento', label: 'Consentimiento', disabled: true },
]

export default function NuevoEncuentro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const crear = useCrearEncuentro(id ?? '')
  const { data: paciente } = usePaciente(id ?? '')
  const [tab, setTab] = useTabParam('tab', 'consulta' as Tab, ['consulta', 'antecedentes', 'formula', 'consentimiento'] as const)

  async function handleSubmit(data: Parameters<typeof crear.mutateAsync>[0]) {
    const encuentro = await crear.mutateAsync(data)
    navigate(`/pacientes/${id}/encuentros/${encuentro.encuentro_id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map(({ key, label, disabled }) => (
          <button
            key={key}
            type="button"
            onClick={() => !disabled && setTab(key)}
            disabled={disabled}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              disabled
                ? 'text-slate-300 cursor-not-allowed'
                : tab === key
                ? 'bg-white shadow-sm font-medium'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            style={!disabled && tab === key ? { color: 'var(--hce-primary)' } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'antecedentes' && (
        <div className="card-hce p-6">
          <h3 className="card-title mb-4">Antecedentes del paciente</h3>
          <AntecedentesTab documento={id ?? ''} genero={paciente?.genero} />
        </div>
      )}

      {tab === 'consulta' && (
        <EncuentroForm
          documento={id ?? ''}
          onSubmit={handleSubmit}
          isPending={crear.isPending}
          submitLabel="Crear encuentro"
          onCancelar={() => navigate(-1)}
        />
      )}
    </div>
  )
}
