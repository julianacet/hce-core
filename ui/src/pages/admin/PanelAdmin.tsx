import { useState, useRef } from 'react'
import { useTabParam } from '../../hooks/useTabParam'
import { useTema, DEFAULTS, type Tema } from '../../context/TemaContext'
import { Upload, Trash2, CheckCircle, RotateCcw, Plus, Pencil, X, ShieldCheck, Stethoscope, Users, AlertTriangle, ExternalLink, ClipboardList, Activity, Info, PowerOff, Power, Pill } from 'lucide-react'
import { RowMenu } from '../../components/RowMenu'
import { NavigationGuard } from '../../components/NavigationGuard'
import {
  usePlantillas,
  useCrearPlantilla,
  useActualizarPlantilla,
  useDesactivarPlantilla,
  useEliminarPlantilla,
  type PlantillaConsentimiento,
} from '../../api/consentimientos'
import {
  useUsuarios,
  useCrearUsuario,
  useActualizarUsuario,
  useDesactivarUsuario,
  useEliminarUsuario,
  type Usuario,
  type UsuarioInput,
} from '../../api/usuarios'
import {
  useTiposEventoAdverso,
  useCrearTipo,
  useActualizarTipo,
  useToggleTipo,
  useEliminarTipo,
  type TipoEventoAdverso,
  type TipoInput,
} from '../../api/eventos_adversos'
import {
  usePreguntas,
  useCrearPregunta,
  useActualizarPregunta,
  useTogglePregunta,
  useEliminarPregunta,
  type AntecedentePregunta,
} from '../../api/antecedentes'
import {
  useTodosCamposClinicos,
  useCrearCampoClinico,
  useActualizarCampoClinico,
  useToggleCampoClinico,
  useEliminarCampoClinico,
  type CampoClinico,
  type CampoClinicoInput,
} from '../../api/campos_clinicos'
import {
  useMedicamentosAdmin,
  useCrearMedicamento,
  useActualizarMedicamento,
  useToggleMedicamento,
  useEliminarMedicamento,
  type MedicamentoPredefinido,
  type MedicamentoInput,
} from '../../api/medicamentos_predefinidos'

const PALETAS = [
  {
    nombre: 'Azul (defecto)',
    t: { colorPrimario: '#1d4ed8', colorPrimarioTexto: '#ffffff', colorPrimarioHover: '#1e40af', colorSidebar: '#1e3a5f', colorSidebarTexto: '#ffffff', colorSidebarTextoMuted: 'rgba(255,255,255,0.55)', colorFondo: '#f8fafc', colorCard: '#ffffff', colorBorde: '#e2e8f0', colorTexto: '#0f172a', colorTextoMuted: '#64748b' },
  },
  {
    nombre: 'Verde médico',
    t: { colorPrimario: '#059669', colorPrimarioTexto: '#ffffff', colorPrimarioHover: '#047857', colorSidebar: '#064e3b', colorSidebarTexto: '#ffffff', colorSidebarTextoMuted: 'rgba(255,255,255,0.55)', colorFondo: '#f0fdf4', colorCard: '#ffffff', colorBorde: '#d1fae5', colorTexto: '#052e16', colorTextoMuted: '#6b7280' },
  },
  {
    nombre: 'Violeta',
    t: { colorPrimario: '#7c3aed', colorPrimarioTexto: '#ffffff', colorPrimarioHover: '#6d28d9', colorSidebar: '#3b1f6e', colorSidebarTexto: '#ffffff', colorSidebarTextoMuted: 'rgba(255,255,255,0.55)', colorFondo: '#faf5ff', colorCard: '#ffffff', colorBorde: '#ede9fe', colorTexto: '#1e1b4b', colorTextoMuted: '#6b7280' },
  },
  {
    nombre: 'Gris oscuro',
    t: { colorPrimario: '#374151', colorPrimarioTexto: '#ffffff', colorPrimarioHover: '#1f2937', colorSidebar: '#111827', colorSidebarTexto: '#ffffff', colorSidebarTextoMuted: 'rgba(255,255,255,0.5)', colorFondo: '#f9fafb', colorCard: '#ffffff', colorBorde: '#e5e7eb', colorTexto: '#111827', colorTextoMuted: '#6b7280' },
  },
  {
    nombre: 'Claro / Light',
    t: { colorPrimario: '#2563eb', colorPrimarioTexto: '#ffffff', colorPrimarioHover: '#1d4ed8', colorSidebar: '#f1f5f9', colorSidebarTexto: '#1e293b', colorSidebarTextoMuted: '#64748b', colorFondo: '#ffffff', colorCard: '#f8fafc', colorBorde: '#e2e8f0', colorTexto: '#0f172a', colorTextoMuted: '#64748b' },
  },
]

type Campo = {
  key: keyof Tema
  label: string
  tipo: 'color' | 'text'
}

const CAMPOS_COLOR: Campo[] = [
  { key: 'colorPrimario', label: 'Color primario (botones / activos)', tipo: 'color' },
  { key: 'colorPrimarioTexto', label: 'Texto sobre botones primarios', tipo: 'color' },
  { key: 'colorPrimarioHover', label: 'Color primario al pasar el cursor', tipo: 'color' },
  { key: 'colorSidebar', label: 'Fondo del sidebar', tipo: 'color' },
  { key: 'colorSidebarTexto', label: 'Texto del sidebar', tipo: 'color' },
  { key: 'colorFondo', label: 'Fondo general del sistema', tipo: 'color' },
  { key: 'colorCard', label: 'Fondo de tarjetas y paneles', tipo: 'color' },
  { key: 'colorBorde', label: 'Color de bordes', tipo: 'color' },
  { key: 'colorTexto', label: 'Texto principal', tipo: 'color' },
  { key: 'colorTextoMuted', label: 'Texto secundario / labels', tipo: 'color' },
]

// ── Gestión de tipos de eventos adversos ──────────────────────────────────────

function TiposEventoAdversoAdmin() {
  const { data: tipos = [] } = useTiposEventoAdverso(true)
  const crear = useCrearTipo()
  const [editando, setEditando] = useState<TipoEventoAdverso | null>(null)
  const actualizar = useActualizarTipo(editando?.id ?? '')
  const [form, setForm] = useState<TipoInput>({ nombre: '', descripcion: null, requiere_reporte_invima: false })
  const [mostrarForm, setMostrarForm] = useState(false)
  const [error, setError] = useState('')

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre: '', descripcion: null, requiere_reporte_invima: false })
    setMostrarForm(true)
    setError('')
  }

  function abrirEditar(t: TipoEventoAdverso) {
    setEditando(t)
    setForm({ nombre: t.nombre, descripcion: t.descripcion, requiere_reporte_invima: t.requiere_reporte_invima })
    setMostrarForm(true)
    setError('')
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
    setError('')
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setError('')
    try {
      if (editando) await actualizar.mutateAsync(form)
      else await crear.mutateAsync(form)
      cerrar()
    } catch {
      setError('Error al guardar.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
            Configura qué tipos de eventos adversos puede seleccionar el personal al reportar.
            Los tipos marcados con INVIMA indican que requieren reporte externo a Farmacovigilancia o Tecnovigilancia.
          </p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo tipo
        </button>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <div className="card-hce p-4 space-y-3 border-2" style={{ borderColor: 'var(--hce-primary)' }}>
          <div className="flex items-center justify-between">
            <h4 className="card-title">
              {editando ? 'Editar tipo' : 'Nuevo tipo de evento adverso'}
            </h4>
            <button onClick={cerrar}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div>
            <label className="label-hce">Nombre *</label>
            <input className="input-hce" value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Caída del paciente" />
          </div>
          <div>
            <label className="label-hce">Descripción / orientación para el personal</label>
            <textarea className="input-hce" rows={2}
              value={form.descripcion ?? ''}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value || null }))}
              placeholder="Cuándo usar este tipo de reporte..." />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--hce-text)' }}>
            <input type="checkbox" checked={form.requiere_reporte_invima}
              onChange={e => setForm(f => ({ ...f, requiere_reporte_invima: e.target.checked }))} />
            Requiere reporte externo a INVIMA (Farmacovigilancia / Tecnovigilancia)
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={cerrar} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={guardar} disabled={crear.isPending || actualizar.isPending}
              className="btn-primary">
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="card-hce divide-y" style={{ borderColor: 'var(--hce-border)' }}>
        {tipos.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--hce-text-muted)' }}>
            No hay tipos configurados.
          </p>
        )}
        {tipos.map(t => (
          <TipoRow key={t.id} tipo={t} onEditar={() => abrirEditar(t)} />
        ))}
      </div>

      <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
        Tipos marcados con INVIMA: asegúrate de completar el reporte en
        {' '}<span className="font-medium">reportesalud.minsalud.gov.co</span>{' '}
        o en el sistema de farmacovigilancia correspondiente.
      </p>
    </div>
  )
}

function TipoRow({ tipo, onEditar }: { tipo: TipoEventoAdverso; onEditar: () => void }) {
  const toggle = useToggleTipo(tipo.id)
  const eliminar = useEliminarTipo()
  const loading = toggle.isPending || eliminar.isPending
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!tipo.esta_activo ? 'opacity-60' : ''}`}>
      <AlertTriangle className={`w-4 h-4 shrink-0 ${tipo.esta_activo ? 'text-orange-400' : 'text-slate-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="card-title">{tipo.nombre}</span>
          {tipo.requiere_reporte_invima && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> INVIMA
            </span>
          )}
          {!tipo.esta_activo && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500">Inactivo</span>
          )}
        </div>
        {tipo.descripcion && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--hce-text-muted)' }}>{tipo.descripcion}</p>
        )}
      </div>
      <RowMenu loading={loading} items={[
        { label: 'Editar', icon: <Pencil size={14} />, onClick: onEditar },
        {
          label: tipo.esta_activo ? 'Desactivar' : 'Activar',
          icon: tipo.esta_activo ? <PowerOff size={14} /> : <Power size={14} />,
          onClick: () => toggle.mutate(),
        },
        {
          label: 'Eliminar permanentemente',
          icon: <Trash2 size={14} />,
          danger: true,
          onClick: () => {
            if (confirm(`¿Eliminar el tipo "${tipo.nombre}"? Esta acción no se puede deshacer.`))
              eliminar.mutate(tipo.id)
          },
        },
      ]} />
    </div>
  )
}

const VARIABLES_CONSENTIMIENTO = [
  { clave: 'paciente_nombre',    etiqueta: 'Nombre del paciente' },
  { clave: 'paciente_documento', etiqueta: 'Documento del paciente' },
  { clave: 'tipo_documento',     etiqueta: 'Tipo de documento' },
  { clave: 'medico_nombre',      etiqueta: 'Nombre del médico' },
  { clave: 'consultorio',        etiqueta: 'Nombre del consultorio' },
  { clave: 'ciudad',             etiqueta: 'Ciudad' },
  { clave: 'fecha',              etiqueta: 'Fecha' },
]

function PlantillasAdmin() {
  const { data: plantillas = [] } = usePlantillas()
  const crear = useCrearPlantilla()
  const desactivar = useDesactivarPlantilla()
  const eliminar = useEliminarPlantilla()
  const [editando, setEditando] = useState<PlantillaConsentimiento | null>(null)
  const [nueva, setNueva] = useState(false)
  const [formP, setFormP] = useState({ nombre: '', contenido: '' })
  const actualizar = useActualizarPlantilla(editando?.id ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function abrirNueva() {
    setEditando(null)
    setFormP({ nombre: '', contenido: '' })
    setNueva(true)
  }

  function abrirEditar(p: PlantillaConsentimiento) {
    setNueva(false)
    setFormP({ nombre: p.nombre, contenido: p.contenido })
    setEditando(p)
  }

  function cerrar() {
    setNueva(false)
    setEditando(null)
    setFormP({ nombre: '', contenido: '' })
  }

  function insertarVariable(clave: string) {
    const ta = textareaRef.current
    const token = `{{${clave}}}`
    if (!ta) {
      setFormP((f) => ({ ...f, contenido: f.contenido + token }))
      return
    }
    const inicio = ta.selectionStart
    const fin = ta.selectionEnd
    const nuevo = formP.contenido.slice(0, inicio) + token + formP.contenido.slice(fin)
    setFormP((f) => ({ ...f, contenido: nuevo }))
    // Restaurar foco y posición del cursor tras el render
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = inicio + token.length
      ta.selectionEnd = inicio + token.length
    }, 0)
  }

  async function guardarPlantilla() {
    if (!formP.nombre.trim() || !formP.contenido.trim()) return
    if (editando) {
      await actualizar.mutateAsync(formP)
    } else {
      await crear.mutateAsync(formP)
    }
    cerrar()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button onClick={abrirNueva} className="btn-primary">
          <Plus size={14} /> Nueva plantilla
        </button>
      </div>

      {/* Lista */}
      <div className="card-hce divide-y divide-slate-100">
        {plantillas.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Sin plantillas.</p>
        )}
        {plantillas.map((p) => (
          <div key={p.id} className={`px-4 py-3 flex items-center gap-3 ${!p.esta_activo ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${p.esta_activo ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                {p.nombre}
              </p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{p.contenido.slice(0, 80)}…</p>
            </div>
            <RowMenu loading={desactivar.isPending || eliminar.isPending} items={[
              { label: 'Editar', icon: <Pencil size={14} />, onClick: () => abrirEditar(p) },
              {
                label: p.esta_activo ? 'Desactivar' : 'Activar',
                icon: p.esta_activo ? <PowerOff size={14} /> : <Power size={14} />,
                onClick: () => desactivar.mutate(p.id),
              },
              {
                label: 'Eliminar permanentemente',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => {
                  if (confirm(`¿Eliminar la plantilla "${p.nombre}"? Esta acción no se puede deshacer.`))
                    eliminar.mutate(p.id)
                },
              },
            ]} />
          </div>
        ))}
      </div>

      {/* Formulario */}
      {(nueva || editando) && (
        <div className="card-hce p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="card-title">
              {editando ? 'Editar plantilla' : 'Nueva plantilla'}
            </h4>
            <button onClick={cerrar} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div>
            <label className="label-hce">Nombre de la plantilla</label>
            <input value={formP.nombre} onChange={(e) => setFormP((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Consentimiento informado general"
              className="input-hce" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-hce mb-0">Contenido</label>
            </div>

            {/* Chips de variables */}
            <div className="border border-slate-200 rounded-t-lg bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-slate-500 mb-2">
                Haz clic en un dato para insertarlo en el texto donde esté el cursor:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES_CONSENTIMIENTO.map((v) => (
                  <button
                    key={v.clave}
                    type="button"
                    onClick={() => insertarVariable(v.clave)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                    style={{
                      borderColor: 'var(--hce-primary)',
                      color: 'var(--hce-primary)',
                      backgroundColor: 'white',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--hce-primary)'
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white'
                      e.currentTarget.style.color = 'var(--hce-primary)'
                    }}
                  >
                    <Plus size={10} />
                    {v.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={formP.contenido}
              onChange={(e) => setFormP((f) => ({ ...f, contenido: e.target.value }))}
              rows={14}
              className="input-hce rounded-t-none border-t-0 resize-y text-sm leading-relaxed"
              placeholder="Por medio del presente documento, yo…  (usa los botones de arriba para insertar datos del paciente o del médico)"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={cerrar} className="btn-secondary">Cancelar</button>
            <button onClick={guardarPlantilla} className="btn-primary"
              disabled={crear.isPending || actualizar.isPending}>
              {crear.isPending || actualizar.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const ROL_LABEL: Record<string, string> = { admin: 'Admin', medico: 'Médico', auxiliar: 'Auxiliar' }
const ROL_BADGE: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  medico: 'bg-blue-100 text-blue-700',
  auxiliar: 'bg-slate-100 text-slate-600',
}
const ROL_ICON: Record<string, React.ElementType> = {
  admin: ShieldCheck,
  medico: Stethoscope,
  auxiliar: Users,
}

const FORM_USUARIO_INICIAL: UsuarioInput = {
  nombre_usuario: '',
  nombre_completo: '',
  rol: 'medico',
  contrasena: '',
}

function UsuariosAdmin() {
  const { data: usuarios = [] } = useUsuarios()
  const crear = useCrearUsuario()
  const toggle = useDesactivarUsuario()
  const eliminar = useEliminarUsuario()
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [form, setForm] = useState<UsuarioInput>(FORM_USUARIO_INICIAL)
  const [error, setError] = useState('')
  const actualizar = useActualizarUsuario(editando?.id ?? '')

  function abrirNuevo() {
    setEditando(null)
    setForm(FORM_USUARIO_INICIAL)
    setError('')
    setNuevo(true)
  }

  function abrirEditar(u: Usuario) {
    setNuevo(false)
    setForm({ nombre_usuario: u.nombre_usuario, nombre_completo: u.nombre_completo, rol: u.rol, contrasena: '' })
    setError('')
    setEditando(u)
  }

  function cerrar() {
    setNuevo(false)
    setEditando(null)
    setForm(FORM_USUARIO_INICIAL)
    setError('')
  }

  async function guardar() {
    setError('')
    try {
      if (editando) {
        await actualizar.mutateAsync(form)
      } else {
        await crear.mutateAsync(form)
      }
      cerrar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  async function handleToggle(u: Usuario) {
    const accion = u.esta_activo ? 'Desactivar' : 'Reactivar'
    if (!confirm(`¿${accion} al usuario "${u.nombre_completo}"?`)) return
    await toggle.mutateAsync(u.id)
  }

  async function handleEliminar(u: Usuario) {
    if (!confirm(`¿Eliminar permanentemente al usuario "${u.nombre_completo}"? Esta acción no se puede deshacer.`)) return
    try {
      await eliminar.mutateAsync(u.id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar el usuario.')
    }
  }

  const activos = usuarios.filter((u) => u.esta_activo)
  const inactivos = usuarios.filter((u) => !u.esta_activo)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{activos.length} usuario{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}</p>
        <button onClick={abrirNuevo} className="btn-primary flex items-center gap-1.5">
          <Plus size={14} /> Nuevo usuario
        </button>
      </div>

      {/* Formulario crear / editar */}
      {(nuevo || editando) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="card-title">{editando ? 'Editar usuario' : 'Nuevo usuario'}</p>
            <button onClick={cerrar} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-hce">Nombre completo *</label>
              <input
                className="input-hce"
                value={form.nombre_completo}
                onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))}
                placeholder="Dra. María García"
              />
            </div>
            <div>
              <label className="label-hce">Usuario (login) *</label>
              <input
                className="input-hce"
                value={form.nombre_usuario}
                onChange={(e) => setForm((f) => ({ ...f, nombre_usuario: e.target.value }))}
                placeholder="mgarcia"
                disabled={!!editando}
              />
            </div>
            <div>
              <label className="label-hce">Rol</label>
              <select
                className="input-hce"
                value={form.rol}
                onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value as UsuarioInput['rol'] }))}
              >
                <option value="medico">Médico</option>
                <option value="auxiliar">Auxiliar</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label-hce">
                Contraseña {editando && <span className="text-slate-400">(dejar vacío para no cambiar)</span>}
              </label>
              <input
                type="password"
                className="input-hce"
                value={form.contrasena}
                onChange={(e) => setForm((f) => ({ ...f, contrasena: e.target.value }))}
                placeholder={editando ? '••••••••' : 'Mínimo 6 caracteres'}
              />
            </div>
          </div>

          {error && (
            <p className="form-error">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={cerrar} className="btn-secondary">
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={crear.isPending || actualizar.isPending || !form.nombre_completo.trim() || (!editando && !form.contrasena)}
              className="btn-primary disabled:opacity-40"
            >
              {crear.isPending || actualizar.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista activos */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {activos.length === 0 && (
          <p className="px-5 py-6 text-sm text-slate-400 text-center">Sin usuarios activos.</p>
        )}
        {activos.map((u) => {
          const Icon = ROL_ICON[u.rol] ?? Users
          return (
            <div key={u.id} className="px-5 py-3 flex items-center gap-4">
              <Icon size={16} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{u.nombre_completo}</p>
                <p className="text-xs text-slate-400">{u.nombre_usuario}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_BADGE[u.rol]}`}>
                {ROL_LABEL[u.rol]}
              </span>
              <RowMenu loading={toggle.isPending || eliminar.isPending} items={[
                { label: 'Editar', icon: <Pencil size={14} />, onClick: () => abrirEditar(u) },
                { label: 'Desactivar', icon: <PowerOff size={14} />, onClick: () => handleToggle(u) },
                { label: 'Eliminar permanentemente', icon: <Trash2 size={14} />, danger: true, onClick: () => handleEliminar(u) },
              ]} />
            </div>
          )
        })}
      </div>

      {/* Inactivos */}
      {inactivos.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Usuarios desactivados</p>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {inactivos.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center gap-4 opacity-60">
                <Users size={16} className="text-slate-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-400 line-through">{u.nombre_completo}</p>
                  <p className="text-xs text-slate-300">{u.nombre_usuario}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                  Inactivo
                </span>
                <RowMenu loading={toggle.isPending || eliminar.isPending} items={[
                  { label: 'Reactivar', icon: <Power size={14} />, onClick: () => handleToggle(u) },
                  { label: 'Eliminar permanentemente', icon: <Trash2 size={14} />, danger: true, onClick: () => handleEliminar(u) },
                ]} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const CATEGORIA_LABELS: Record<string, string> = {
  personal:      'Personales patológicos',
  familiar:      'Familiares',
  farmacologico: 'Farmacológicos',
  alergico:      'Alérgicos',
  quirurgico:    'Quirúrgicos',
  habito:        'Hábitos y tóxicos',
  gineco:        'Gineco-obstétrico',
}
const CATEGORIAS_OPTS = Object.keys(CATEGORIA_LABELS)
const TIPOS_RESPUESTA = ['booleano', 'texto', 'numero', 'fecha', 'opciones', 'lista']
const TIPO_LABELS: Record<string, string> = {
  booleano: 'Sí / No',
  texto:    'Texto libre',
  numero:   'Número',
  fecha:    'Fecha',
  opciones: 'Selección (opciones)',
  lista:    'Lista de ítems',
}

type FormPregunta = Omit<AntecedentePregunta, 'id' | 'esta_activo'>
const FORM_PREGUNTA_INICIAL: FormPregunta = {
  categoria: 'personal',
  texto: '',
  tipo_respuesta: 'booleano',
  opciones: null,
  tiene_detalle: false,
  placeholder_detalle: '',
  solo_genero: '',
  orden: 0,
}

function AntecedentesAdmin() {
  const { data: preguntas = [] } = usePreguntas()
  const crear = useCrearPregunta()
  const [editando, setEditando] = useState<AntecedentePregunta | null>(null)
  const actualizar = useActualizarPregunta(editando?.id ?? '')
  const [form, setForm] = useState<FormPregunta>(FORM_PREGUNTA_INICIAL)
  const [opcionesRaw, setOpcionesRaw] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [error, setError] = useState('')

  const porCategoria = CATEGORIAS_OPTS.map(cat => ({
    cat,
    items: preguntas.filter(p => p.categoria === cat),
  })).filter(g => g.items.length > 0)

  function abrirNueva() {
    setEditando(null)
    setForm(FORM_PREGUNTA_INICIAL)
    setOpcionesRaw('')
    setError('')
    setMostrarForm(true)
  }

  function abrirEditar(p: AntecedentePregunta) {
    setEditando(p)
    setForm({
      categoria: p.categoria,
      texto: p.texto,
      tipo_respuesta: p.tipo_respuesta,
      opciones: p.opciones,
      tiene_detalle: p.tiene_detalle,
      placeholder_detalle: p.placeholder_detalle ?? '',
      solo_genero: p.solo_genero ?? '',
      orden: p.orden,
    })
    setOpcionesRaw(p.opciones
      ? p.tipo_respuesta === 'opciones'
        ? (p.opciones as string[]).join('\n')
        : JSON.stringify(p.opciones, null, 2)
      : ''
    )
    setError('')
    setMostrarForm(true)
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
    setError('')
  }

  async function guardar() {
    if (!form.texto.trim()) { setError('El texto es obligatorio.'); return }
    setError('')

    let opcionesJSON = null
    if (opcionesRaw.trim()) {
      if (form.tipo_respuesta === 'opciones') {
        opcionesJSON = opcionesRaw.split('\n').map(o => o.trim()).filter(Boolean)
        if (opcionesJSON.length === 0) { setError('Debes definir al menos una opción.'); return }
      } else {
        try { opcionesJSON = JSON.parse(opcionesRaw) }
        catch { setError('El JSON de opciones no es válido.'); return }
      }
    }

    const payload = {
      ...form,
      opciones: opcionesJSON,
      placeholder_detalle: form.placeholder_detalle || undefined,
      solo_genero: form.solo_genero || undefined,
    }

    try {
      if (editando) await actualizar.mutateAsync(payload)
      else await crear.mutateAsync(payload)
      cerrar()
    } catch {
      setError('Error al guardar.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
          Define las preguntas guiadas que aparecerán en cada consulta.
          Las preguntas inactivas no se muestran al médico pero conservan las respuestas existentes.
        </p>
        <button onClick={abrirNueva} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva pregunta
        </button>
      </div>

      {mostrarForm && (
        <div className="card-hce p-5 space-y-4 border-2" style={{ borderColor: 'var(--hce-primary)' }}>
          <div className="flex items-center justify-between">
            <h4 className="card-title">{editando ? 'Editar pregunta' : 'Nueva pregunta'}</h4>
            <button onClick={cerrar}><X className="w-4 h-4 text-slate-400" /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-hce">Categoría *</label>
              <select className="input-hce" value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {CATEGORIAS_OPTS.map(c => <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-hce">Tipo de respuesta *</label>
              <select className="input-hce" value={form.tipo_respuesta}
                onChange={e => setForm(f => ({ ...f, tipo_respuesta: e.target.value as FormPregunta['tipo_respuesta'] }))}>
                {TIPOS_RESPUESTA.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label-hce">Texto de la pregunta *</label>
            <input className="input-hce" value={form.texto}
              onChange={e => setForm(f => ({ ...f, texto: e.target.value }))}
              placeholder="Ej: ¿Tiene hipertensión arterial?" />
          </div>

          {form.tipo_respuesta === 'opciones' && (
            <div>
              <label className="label-hce">
                Opciones <span className="font-normal text-slate-400">— una por línea *</span>
              </label>
              <textarea className="input-hce font-mono text-sm resize-none" rows={4}
                value={opcionesRaw}
                onChange={e => setOpcionesRaw(e.target.value)}
                placeholder={'Nunca ha fumado\nFumador activo\nEx-fumador'} />
            </div>
          )}

          {form.tipo_respuesta === 'lista' && (
            <div>
              <label className="label-hce">
                Campos de la lista{' '}
                <span className="text-slate-400 font-normal">
                  — JSON: array de <code className="bg-slate-100 px-1 rounded">{'{"campo","label","requerido"}'}</code>
                </span>
              </label>
              <textarea className="input-hce font-mono text-xs resize-y" rows={4}
                value={opcionesRaw}
                onChange={e => setOpcionesRaw(e.target.value)}
                placeholder={'[{"campo":"nombre","label":"Nombre","requerido":true}]'} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer mb-1" style={{ color: 'var(--hce-text)' }}>
                <input type="checkbox" checked={form.tiene_detalle}
                  onChange={e => setForm(f => ({ ...f, tiene_detalle: e.target.checked }))} />
                Mostrar campo de detalle cuando la respuesta es "Sí"
              </label>
              {form.tiene_detalle && (
                <input className="input-hce text-sm" value={form.placeholder_detalle ?? ''}
                  onChange={e => setForm(f => ({ ...f, placeholder_detalle: e.target.value }))}
                  placeholder="Texto guía del detalle (opcional)" />
              )}
            </div>
            <div>
              <label className="label-hce">Solo mostrar para género</label>
              <select className="input-hce" value={form.solo_genero ?? ''}
                onChange={e => setForm(f => ({ ...f, solo_genero: e.target.value }))}>
                <option value="">Todos</option>
                <option value="FX">F / X (femenino e intersex)</option>
                <option value="M">M (masculino)</option>
              </select>
            </div>
          </div>

          <div className="w-24">
            <label className="label-hce">Orden</label>
            <input type="number" className="input-hce" value={form.orden}
              onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))} />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button onClick={cerrar} className="btn-secondary">Cancelar</button>
            <button onClick={guardar} disabled={crear.isPending || actualizar.isPending} className="btn-primary">
              Guardar
            </button>
          </div>
        </div>
      )}

      {porCategoria.map(({ cat, items }) => (
        <div key={cat}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            {CATEGORIA_LABELS[cat]}
          </h4>
          <div className="card-hce divide-y" style={{ borderColor: 'var(--hce-border)' }}>
            {items.map(p => (
              <PreguntaRow key={p.id} pregunta={p} onEditar={() => abrirEditar(p)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PreguntaRow({ pregunta, onEditar }: { pregunta: AntecedentePregunta; onEditar: () => void }) {
  const toggle = useTogglePregunta(pregunta.id)
  const eliminar = useEliminarPregunta()
  const loading = toggle.isPending || eliminar.isPending
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!pregunta.esta_activo ? 'opacity-60' : ''}`}>
      <ClipboardList className={`w-4 h-4 shrink-0 ${pregunta.esta_activo ? 'text-blue-400' : 'text-slate-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-700">{pregunta.texto}</span>
          <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500">
            {TIPO_LABELS[pregunta.tipo_respuesta]}
          </span>
          {pregunta.solo_genero && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-600">
              Solo {pregunta.solo_genero}
            </span>
          )}
          {!pregunta.esta_activo && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-400">Inactiva</span>
          )}
        </div>
        {pregunta.tiene_detalle && pregunta.placeholder_detalle && (
          <p className="text-xs mt-0.5 text-slate-400 truncate">Detalle: {pregunta.placeholder_detalle}</p>
        )}
      </div>
      <RowMenu loading={loading} items={[
        { label: 'Editar', icon: <Pencil size={14} />, onClick: onEditar },
        {
          label: pregunta.esta_activo ? 'Desactivar' : 'Activar',
          icon: pregunta.esta_activo ? <PowerOff size={14} /> : <Power size={14} />,
          onClick: () => toggle.mutate(),
        },
        {
          label: 'Eliminar permanentemente',
          icon: <Trash2 size={14} />,
          danger: true,
          onClick: () => {
            if (confirm(`¿Eliminar la pregunta "${pregunta.texto}"? Esta acción no se puede deshacer.`))
              eliminar.mutate(pregunta.id)
          },
        },
      ]} />
    </div>
  )
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

const SECCION_LABELS: Record<string, string> = {
  signos_vitales:    'Signos vitales',
  examen_fisico:     'Examen físico',
  revision_sistemas: 'Revisión por sistemas',
}
const TIPO_CAMPO_LABELS: Record<string, string> = {
  numero:       'Número',
  normal_notas: 'Normal / Hallazgos',
  texto:        'Texto libre',
  opciones:     'Lista de opciones',
}
const FORM_CAMPO_INICIAL: CampoClinicoInput = {
  seccion: 'signos_vitales',
  nombre: '',
  tipo: 'numero',
  unidad: undefined,
  clave: '',
  orden: 0,
  descripcion: undefined,
}

function CamposClinicosAdmin() {
  const { data: campos = [] } = useTodosCamposClinicos()
  const crear = useCrearCampoClinico()
  const [editando, setEditando] = useState<CampoClinico | null>(null)
  const actualizar = useActualizarCampoClinico(editando?.id ?? '')
  const [form, setForm] = useState<CampoClinicoInput>(FORM_CAMPO_INICIAL)
  const [opcionesRaw, setOpcionesRaw] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [error, setError] = useState('')

  const porSeccion = ['signos_vitales', 'examen_fisico', 'revision_sistemas'].map(sec => ({
    sec,
    items: campos.filter(c => c.seccion === sec),
  }))

  function abrirNuevo() {
    setEditando(null)
    setForm(FORM_CAMPO_INICIAL)
    setOpcionesRaw('')
    setError('')
    setMostrarForm(true)
  }

  function abrirEditar(c: CampoClinico) {
    setEditando(c)
    setForm({ seccion: c.seccion, nombre: c.nombre, tipo: c.tipo, unidad: c.unidad, clave: c.clave, orden: c.orden, descripcion: c.descripcion, opciones: c.opciones })
    setOpcionesRaw(c.opciones ? c.opciones.join('\n') : '')
    setError('')
    setMostrarForm(true)
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
    setOpcionesRaw('')
    setError('')
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!editando && !form.clave.trim()) { setError('La clave es obligatoria.'); return }
    if (form.tipo === 'opciones' && !opcionesRaw.trim()) { setError('Debes definir al menos una opción.'); return }
    setError('')
    const opciones = form.tipo === 'opciones'
      ? opcionesRaw.split('\n').map(o => o.trim()).filter(Boolean)
      : undefined
    try {
      if (editando) await actualizar.mutateAsync({ ...form, opciones })
      else await crear.mutateAsync({ ...form, opciones })
      cerrar()
    } catch {
      setError('Error al guardar. La clave debe ser única.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
          Define qué campos aparecen en los formularios de signos vitales y examen físico.
          Los campos inactivos no se muestran al médico pero conservan los datos existentes.
        </p>
        <button onClick={abrirNuevo} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo campo
        </button>
      </div>

      {mostrarForm && (
        <div className="card-hce p-5 space-y-4 border-2" style={{ borderColor: 'var(--hce-primary)' }}>
          <div className="flex items-center justify-between">
            <h4 className="card-title">{editando ? 'Editar campo' : 'Nuevo campo clínico'}</h4>
            <button onClick={cerrar}><X className="w-4 h-4 text-slate-400" /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-hce">Sección *</label>
              <select className="input-hce" value={form.seccion}
                onChange={e => setForm(f => ({ ...f, seccion: e.target.value as CampoClinicoInput['seccion'] }))}>
                <option value="signos_vitales">Signos vitales</option>
                <option value="examen_fisico">Examen físico</option>
                <option value="revision_sistemas">Revisión por sistemas</option>
              </select>
            </div>
            <div>
              <label className="label-hce">Tipo *</label>
              <select className="input-hce" value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value as CampoClinicoInput['tipo'] }))}>
                <option value="numero">Número</option>
                <option value="normal_notas">Normal / Hallazgos</option>
                <option value="texto">Texto libre</option>
              <option value="opciones">Lista de opciones</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-hce">Nombre *</label>
            <input className="input-hce" value={form.nombre}
              onChange={e => setForm(f => ({
                ...f,
                nombre: e.target.value,
                clave: editando ? f.clave : slugify(e.target.value),
              }))}
              placeholder="Ej: Glucometría" />
          </div>

          <div>
            <label className="label-hce">Descripción / instrucción para el médico <span className="font-normal text-slate-400">(opcional)</span></label>
            <textarea className="input-hce resize-none" rows={2}
              value={form.descripcion ?? ''}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value || undefined }))}
              placeholder="Ej: Tomar en reposo, brazo derecho…" />
          </div>

          {form.tipo === 'opciones' && (
            <div>
              <label className="label-hce">
                Opciones <span className="font-normal text-slate-400">— una por línea *</span>
              </label>
              <textarea
                className="input-hce resize-none font-mono text-sm"
                rows={4}
                value={opcionesRaw}
                onChange={e => setOpcionesRaw(e.target.value)}
                placeholder={'Normal\nAnormal\nNo evaluado'}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-hce flex items-center gap-1">
                Clave (identificador){editando ? <span className="text-slate-400 font-normal"> — no editable</span> : ' *'}
                <span
                  title="Nombre interno que el sistema usa para guardar el valor en la base de datos. Se genera automáticamente a partir del nombre. Solo letras minúsculas, números y guiones bajos. No se puede cambiar después de crear el campo."
                  className="cursor-help text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </label>
              <input className="input-hce font-mono" value={form.clave}
                disabled={!!editando}
                onChange={e => setForm(f => ({ ...f, clave: e.target.value }))}
                placeholder="glucometria" />
            </div>
            {form.tipo === 'numero' && (
              <div>
                <label className="label-hce">Unidad</label>
                <input className="input-hce" value={form.unidad ?? ''}
                  onChange={e => setForm(f => ({ ...f, unidad: e.target.value || undefined }))}
                  placeholder="mg/dL, cm, mmHg…" />
              </div>
            )}
            <div>
              <label className="label-hce">Orden</label>
              <input type="number" className="input-hce" value={form.orden}
                onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={cerrar} className="btn-secondary">Cancelar</button>
            <button onClick={guardar} disabled={crear.isPending || actualizar.isPending} className="btn-primary">
              Guardar
            </button>
          </div>
        </div>
      )}

      {porSeccion.map(({ sec, items }) => (
        <div key={sec}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            {SECCION_LABELS[sec]}
          </h4>
          <div className="card-hce divide-y" style={{ borderColor: 'var(--hce-border)' }}>
            {items.length === 0 && (
              <p className="px-4 py-4 text-sm text-slate-400">Sin campos configurados.</p>
            )}
            {items.map(c => <CampoRow key={c.id} campo={c} onEditar={() => abrirEditar(c)} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function CampoRow({ campo, onEditar }: { campo: CampoClinico; onEditar: () => void }) {
  const toggle = useToggleCampoClinico(campo.id)
  const eliminar = useEliminarCampoClinico()
  const loading = toggle.isPending || eliminar.isPending
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!campo.esta_activo ? 'opacity-60' : ''}`}>
      <Activity className={`w-4 h-4 shrink-0 ${campo.esta_activo ? 'text-blue-400' : 'text-slate-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-700">{campo.nombre}</span>
          {campo.unidad && (
            <span className="text-xs text-slate-400">({campo.unidad})</span>
          )}
          <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500">
            {TIPO_CAMPO_LABELS[campo.tipo]}
          </span>
          <span className="px-1.5 py-0.5 rounded text-xs bg-slate-50 text-slate-400 font-mono">
            {campo.clave}
          </span>
          {!campo.esta_activo && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-400">Inactivo</span>
          )}
        </div>
        {campo.descripcion && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--hce-text-muted)' }}>{campo.descripcion}</p>
        )}
      </div>
      <RowMenu loading={loading} items={[
        { label: 'Editar', icon: <Pencil size={14} />, onClick: onEditar },
        {
          label: campo.esta_activo ? 'Desactivar' : 'Activar',
          icon: campo.esta_activo ? <PowerOff size={14} /> : <Power size={14} />,
          onClick: () => toggle.mutate(),
        },
        {
          label: 'Eliminar permanentemente',
          icon: <Trash2 size={14} />,
          danger: true,
          onClick: () => {
            if (confirm(`¿Eliminar el campo "${campo.nombre}"? Se perderán todos los datos registrados. Esta acción no se puede deshacer.`))
              eliminar.mutate(campo.id)
          },
        },
      ]} />
    </div>
  )
}

// ── Gestión de medicamentos predefinidos ──────────────────────────────────────

function MedRow({ med, onEditar }: { med: MedicamentoPredefinido; onEditar: () => void }) {
  const toggle = useToggleMedicamento(med.id)
  const eliminar = useEliminarMedicamento()
  const loading = toggle.isPending || eliminar.isPending
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!med.esta_activo ? 'opacity-60' : ''}`}>
      <Pill className={`w-4 h-4 shrink-0 ${med.esta_activo ? 'text-teal-400' : 'text-slate-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="card-title">{med.nombre}</span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${med.tipo === 'pos' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
            {med.tipo === 'pos' ? 'POS' : 'No POS'}
          </span>
          {!med.esta_activo && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500">Inactivo</span>
          )}
        </div>
        {(med.concentracion || med.forma_farmaceutica || med.codigo) && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>
            {[med.concentracion, med.forma_farmaceutica, med.codigo ? `Cód. ${med.codigo}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
      <RowMenu loading={loading} items={[
        { label: 'Editar', icon: <Pencil size={14} />, onClick: onEditar },
        {
          label: med.esta_activo ? 'Desactivar' : 'Activar',
          icon: med.esta_activo ? <PowerOff size={14} /> : <Power size={14} />,
          onClick: () => toggle.mutate(),
        },
        {
          label: 'Eliminar permanentemente',
          icon: <Trash2 size={14} />,
          danger: true,
          onClick: () => {
            if (confirm(`¿Eliminar "${med.nombre}"? Esta acción no se puede deshacer.`))
              eliminar.mutate(med.id)
          },
        },
      ]} />
    </div>
  )
}

function MedicamentosAdmin() {
  const [q, setQ] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'pos' | 'no_pos' | ''>('')
  const { data: meds = [], isFetching } = useMedicamentosAdmin(tipoFiltro, q)
  const crear = useCrearMedicamento()
  const [editando, setEditando] = useState<MedicamentoPredefinido | null>(null)
  const actualizar = useActualizarMedicamento(editando?.id ?? '')
  const emptyForm: MedicamentoInput = { codigo: null, nombre: '', concentracion: null, forma_farmaceutica: null, tipo: 'pos' }
  const [form, setForm] = useState<MedicamentoInput>(emptyForm)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [error, setError] = useState('')

  function abrirNuevo() {
    setEditando(null)
    setForm(emptyForm)
    setMostrarForm(true)
    setError('')
  }

  function abrirEditar(m: MedicamentoPredefinido) {
    setEditando(m)
    setForm({ codigo: m.codigo, nombre: m.nombre, concentracion: m.concentracion, forma_farmaceutica: m.forma_farmaceutica, tipo: m.tipo })
    setMostrarForm(true)
    setError('')
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
    setError('')
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setError('')
    try {
      if (editando) await actualizar.mutateAsync(form)
      else await crear.mutateAsync(form)
      cerrar()
    } catch {
      setError('Error al guardar.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
          Catálogo de medicamentos disponibles para formular. Muestra hasta 80 resultados; usa el buscador para encontrar uno específico.
        </p>
        <button onClick={abrirNuevo} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <input
          className="input-hce flex-1"
          placeholder="Buscar por nombre..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input-hce w-36"
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value as 'pos' | 'no_pos' | '')}
        >
          <option value="">Todos</option>
          <option value="pos">POS</option>
          <option value="no_pos">No POS</option>
        </select>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <div className="card-hce p-4 space-y-3 border-2" style={{ borderColor: 'var(--hce-primary)' }}>
          <div className="flex items-center justify-between">
            <h4 className="card-title">{editando ? 'Editar medicamento' : 'Nuevo medicamento'}</h4>
            <button onClick={cerrar}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label-hce">Nombre *</label>
              <input className="input-hce" value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Amoxicilina" />
            </div>
            <div>
              <label className="label-hce">Tipo *</label>
              <select className="input-hce" value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as 'pos' | 'no_pos' }))}>
                <option value="pos">POS</option>
                <option value="no_pos">No POS</option>
              </select>
            </div>
            <div>
              <label className="label-hce">Código</label>
              <input className="input-hce" value={form.codigo ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value || null }))}
                placeholder="Opcional" />
            </div>
            <div>
              <label className="label-hce">Concentración</label>
              <input className="input-hce" value={form.concentracion ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, concentracion: e.target.value || null }))}
                placeholder="Ej: 500 mg" />
            </div>
            <div>
              <label className="label-hce">Forma farmacéutica</label>
              <input className="input-hce" value={form.forma_farmaceutica ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, forma_farmaceutica: e.target.value || null }))}
                placeholder="Ej: Tableta" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={cerrar} className="btn-secondary">Cancelar</button>
            <button onClick={guardar} disabled={crear.isPending || actualizar.isPending} className="btn-primary">
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="card-hce divide-y" style={{ borderColor: 'var(--hce-border)' }}>
        {isFetching && meds.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--hce-text-muted)' }}>Cargando...</p>
        )}
        {!isFetching && meds.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--hce-text-muted)' }}>
            No se encontraron medicamentos.
          </p>
        )}
        {meds.map((m) => (
          <MedRow key={m.id} med={m} onEditar={() => abrirEditar(m)} />
        ))}
      </div>
    </div>
  )
}

export default function PanelAdmin() {
  const { tema, guardarTema } = useTema()
  const [form, setForm] = useState<Tema>(tema)
  const [guardado, setGuardado] = useState(false)
  const [tab, setTab] = useTabParam(
    'tab',
    'apariencia' as const,
    ['apariencia', 'consentimientos', 'usuarios', 'eventos', 'antecedentes', 'campos', 'medicamentos'] as const,
  )
  const inputLogo = useRef<HTMLInputElement>(null)

  function set<K extends keyof Tema>(key: K, value: Tema[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    const reader = new FileReader()
    reader.onload = (ev) => set('logoBase64', ev.target?.result as string)
    reader.readAsDataURL(archivo)
  }

  function quitarLogo() {
    set('logoBase64', null)
    if (inputLogo.current) inputLogo.current.value = ''
  }

  function aplicarPaleta(paleta: typeof PALETAS[0]) {
    setForm((prev) => ({ ...prev, ...paleta.t }))
  }

  function resetear() {
    setForm(DEFAULTS)
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    guardarTema(form)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  const aparienciaDirty = tab === 'apariencia' && JSON.stringify(form) !== JSON.stringify(tema)

  return (
    <>
    <NavigationGuard when={aparienciaDirty} />
    <div className="page-hce">
      <div className="page-header">
        <h2 className="page-title">Panel de administración</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {([
          { id: 'apariencia',      label: 'Apariencia' },
          { id: 'consentimientos', label: 'Consentimientos' },
          { id: 'antecedentes',    label: 'Antecedentes' },
          { id: 'campos',          label: 'Campos clínicos' },
          { id: 'usuarios',        label: 'Usuarios' },
          { id: 'eventos',         label: 'Eventos adversos' },
          { id: 'medicamentos',    label: 'Medicamentos' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`tab-hce ${tab === id ? 'tab-hce--active' : 'tab-hce--inactive'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'consentimientos' && <PlantillasAdmin />}
      {tab === 'usuarios' && <UsuariosAdmin />}
      {tab === 'eventos' && <TiposEventoAdversoAdmin />}
      {tab === 'antecedentes' && <AntecedentesAdmin />}
      {tab === 'campos' && <CamposClinicosAdmin />}
      {tab === 'medicamentos' && <MedicamentosAdmin />}

      {tab === 'apariencia' && <form onSubmit={guardar} className="space-y-6">

        {/* Identidad */}
        <div className="card-hce p-5 space-y-4">
          <h3 className="card-title">Identidad</h3>

          <div>
            <label className="label-hce">Nombre del sistema</label>
            <input value={form.nombreSistema}
              onChange={(e) => set('nombreSistema', e.target.value)}
              placeholder="HCE Consultorio"
              className="input-hce" />
            <p className="text-xs mt-1" style={{ color: 'var(--hce-text-muted)' }}>
              Aparece en el sidebar, login y documentos PDF.
            </p>
          </div>

          <div>
            <label className="label-hce">Subtítulo del sidebar</label>
            <input value={form.subtituloSidebar}
              onChange={(e) => set('subtituloSidebar', e.target.value)}
              placeholder="Historia Clínica Electrónica"
              className="input-hce" />
          </div>

          {/* Logo */}
          <div>
            <label className="label-hce">Logo</label>
            {form.logoBase64 ? (
              <div className="space-y-3">
                <div className="rounded-lg p-4 flex items-center justify-center h-24"
                  style={{ backgroundColor: 'var(--hce-bg)', border: '1px solid var(--hce-border)' }}>
                  <img src={form.logoBase64} alt="Logo" className="max-h-16 object-contain" />
                </div>
                <button type="button" onClick={quitarLogo}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors">
                  <Trash2 size={14} /> Quitar logo
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-lg p-6 cursor-pointer transition-colors"
                style={{ border: '2px dashed var(--hce-border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--hce-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hce-border)')}>
                <Upload size={20} className="mb-2" style={{ color: 'var(--hce-text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>Subir logo</span>
                <span className="text-xs mt-0.5" style={{ color: 'var(--hce-text-muted)' }}>PNG con fondo transparente recomendado</span>
                <input ref={inputLogo} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Paletas */}
        <div className="card-hce p-5 space-y-4">
          <h3 className="card-title">Paletas predefinidas</h3>
          <div className="flex flex-wrap gap-2">
            {PALETAS.map((p) => (
              <button key={p.nombre} type="button" onClick={() => aplicarPaleta(p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors"
                style={{ border: '1px solid var(--hce-border)', color: 'var(--hce-text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--hce-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hce-border)')}>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.t.colorPrimario }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.t.colorSidebar }} />
                {p.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Colores individuales */}
        <div className="card-hce p-5 space-y-4">
          <h3 className="card-title">Colores individuales</h3>
          <div className="space-y-3">
            {CAMPOS_COLOR.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-sm" style={{ color: 'var(--hce-text)' }}>{label}</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono w-20 text-right"
                    style={{ color: 'var(--hce-text-muted)' }}>
                    {String(form[key])}
                  </span>
                  <input type="color"
                    value={String(form[key]).startsWith('rgba') ? '#888888' : String(form[key])}
                    onChange={(e) => set(key, e.target.value as Tema[typeof key])}
                    className="w-9 h-9 rounded-md cursor-pointer p-0.5"
                    style={{ border: '1px solid var(--hce-border)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="card-hce p-5 space-y-3">
          <h3 className="card-title">Vista previa</h3>
          <div className="flex gap-4 items-start">
            {/* Mini sidebar */}
            <div className="rounded-lg p-3 w-36 space-y-1 shrink-0"
              style={{ backgroundColor: form.colorSidebar }}>
              <p className="text-xs font-semibold truncate" style={{ color: form.colorSidebarTexto }}>
                {form.nombreSistema || 'Sistema'}
              </p>
              <p className="text-xs truncate" style={{ color: form.colorSidebarTextoMuted, fontSize: '10px' }}>
                {form.subtituloSidebar || '—'}
              </p>
              <div className="mt-2 space-y-0.5">
                {['Inicio', 'Pacientes', 'Configuración'].map((item, i) => (
                  <div key={item} className="text-xs px-2 py-1 rounded"
                    style={{
                      backgroundColor: i === 0 ? form.colorPrimario : 'transparent',
                      color: i === 0 ? form.colorPrimarioTexto : form.colorSidebarTextoMuted,
                    }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            {/* Mini contenido */}
            <div className="flex-1 rounded-lg p-3 space-y-2"
              style={{ backgroundColor: form.colorFondo }}>
              <div className="rounded-md p-3" style={{ backgroundColor: form.colorCard, border: `1px solid ${form.colorBorde}` }}>
                <p className="text-xs font-medium mb-1" style={{ color: form.colorTexto }}>Panel de ejemplo</p>
                <p className="text-xs" style={{ color: form.colorTextoMuted }}>Texto secundario</p>
              </div>
              <button type="button" className="text-xs px-3 py-1.5 rounded-md"
                style={{ backgroundColor: form.colorPrimario, color: form.colorPrimarioTexto }}>
                Botón primario
              </button>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={resetear}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'var(--hce-text-muted)' }}>
            <RotateCcw size={14} /> Restaurar valores por defecto
          </button>
          <div className="flex items-center gap-3">
            {guardado && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle size={15} /> Guardado
              </span>
            )}
            <button type="submit" className="btn-primary">Guardar cambios</button>
          </div>
        </div>
      </form>}
    </div>
    </>
  )
}
