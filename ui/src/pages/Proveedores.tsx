import { useState } from 'react'
import { Building2, Plus, Search, Phone, Mail, Globe, X, Pencil } from 'lucide-react'
import { Breadcrumb } from '../components/Breadcrumb'
import {
  useProveedores,
  useCrearProveedor,
  useActualizarProveedor,
  useToggleProveedor,
  TIPOS_PROVEEDOR,
  type Proveedor,
  type ProveedorInput,
} from '../api/proveedores'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPO_COLOR: Record<string, string> = {
  insumos_medicos:     'bg-[var(--hce-primary-soft)] text-[var(--hce-primary)]',
  medicamentos:        'bg-green-100 text-green-700',
  equipos_medicos:     'bg-purple-100 text-purple-700',
  laboratorio:         'bg-yellow-100 text-yellow-700',
  mantenimiento:       'bg-orange-100 text-orange-700',
  servicios_generales: 'bg-slate-100 text-slate-600',
  otro:                'bg-slate-100 text-slate-500',
}

function inputVacio(): ProveedorInput {
  return {
    razon_social: '', nit: null, tipo: '',
    contacto_nombre: null, contacto_cargo: null,
    telefono: null, telefono_alt: null, correo: null,
    direccion: null, ciudad: null, sitio_web: null,
    descripcion_servicios: null, condiciones_pago: null, notas: null,
  }
}

// ── Formulario ────────────────────────────────────────────────────────────────

function FormProveedor({
  inicial,
  onGuardar,
  onCancelar,
  guardando,
  error,
}: {
  inicial: ProveedorInput
  onGuardar: (input: ProveedorInput) => void
  onCancelar: () => void
  guardando: boolean
  error: string
}) {
  const [form, setForm] = useState<ProveedorInput>(inicial)
  const set = (k: keyof ProveedorInput, v: string) =>
    setForm(f => ({ ...f, [k]: v || null }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onGuardar({ ...form, razon_social: form.razon_social.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Datos básicos */}
      <div className="card-hce p-5 space-y-4">
        <h3 className="card-title">Datos del proveedor</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label-hce">Razón social *</label>
            <input className="input-hce" value={form.razon_social} required
              onChange={e => setForm(f => ({ ...f, razon_social: e.target.value }))} />
          </div>
          <div>
            <label className="label-hce">NIT</label>
            <input className="input-hce" placeholder="900.123.456-7"
              value={form.nit ?? ''} onChange={e => set('nit', e.target.value)} />
          </div>
          <div>
            <label className="label-hce">Tipo *</label>
            <select className="input-hce" value={form.tipo} required
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {Object.entries(TIPOS_PROVEEDOR).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-hce">Condiciones de pago</label>
            <select className="input-hce" value={form.condiciones_pago ?? ''}
              onChange={e => set('condiciones_pago', e.target.value)}>
              <option value="">— Seleccionar —</option>
              <option value="Contado">Contado</option>
              <option value="Crédito 30 días">Crédito 30 días</option>
              <option value="Crédito 45 días">Crédito 45 días</option>
              <option value="Crédito 60 días">Crédito 60 días</option>
              <option value="Crédito 90 días">Crédito 90 días</option>
              <option value="Anticipado">Anticipado</option>
            </select>
          </div>
          <div>
            <label className="label-hce">Ciudad</label>
            <input className="input-hce" value={form.ciudad ?? ''}
              onChange={e => set('ciudad', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label-hce">Dirección</label>
            <input className="input-hce" value={form.direccion ?? ''}
              onChange={e => set('direccion', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div className="card-hce p-5 space-y-4">
        <h3 className="card-title">Contacto</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-hce">Nombre del contacto</label>
            <input className="input-hce" value={form.contacto_nombre ?? ''}
              onChange={e => set('contacto_nombre', e.target.value)} />
          </div>
          <div>
            <label className="label-hce">Cargo</label>
            <input className="input-hce" value={form.contacto_cargo ?? ''}
              onChange={e => set('contacto_cargo', e.target.value)} />
          </div>
          <div>
            <label className="label-hce">Teléfono principal</label>
            <input className="input-hce" type="tel" value={form.telefono ?? ''}
              onChange={e => set('telefono', e.target.value)} />
          </div>
          <div>
            <label className="label-hce">Teléfono alternativo</label>
            <input className="input-hce" type="tel" value={form.telefono_alt ?? ''}
              onChange={e => set('telefono_alt', e.target.value)} />
          </div>
          <div>
            <label className="label-hce">Correo electrónico</label>
            <input className="input-hce" type="email" value={form.correo ?? ''}
              onChange={e => set('correo', e.target.value)} />
          </div>
          <div>
            <label className="label-hce">Sitio web</label>
            <input className="input-hce" type="url" placeholder="https://..."
              value={form.sitio_web ?? ''} onChange={e => set('sitio_web', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Info adicional */}
      <div className="card-hce p-5 space-y-4">
        <h3 className="card-title">Información adicional</h3>
        <div>
          <label className="label-hce">Productos o servicios que provee</label>
          <textarea className="input-hce" rows={3} value={form.descripcion_servicios ?? ''}
            onChange={e => set('descripcion_servicios', e.target.value)}
            placeholder="Describa los productos o servicios que provee este proveedor al consultorio..." />
        </div>
        <div>
          <label className="label-hce">Notas internas</label>
          <textarea className="input-hce" rows={2} value={form.notas ?? ''}
            onChange={e => set('notas', e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar}
          className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="btn-primary">
          {guardando ? 'Guardando…' : 'Guardar proveedor'}
        </button>
      </div>
    </form>
  )
}

// ── Panel de detalle ──────────────────────────────────────────────────────────

function DetalleProveedor({
  proveedor,
  onEditar,
  onCerrar,
}: {
  proveedor: Proveedor
  onEditar: () => void
  onCerrar: () => void
}) {
  const toggle = useToggleProveedor(proveedor.id)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLOR[proveedor.tipo]}`}>
              {TIPOS_PROVEEDOR[proveedor.tipo]}
            </span>
            {!proveedor.esta_activo && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">Inactivo</span>
            )}
          </div>
          <h3 className="card-title">
            {proveedor.razon_social}
          </h3>
          {proveedor.nit && (
            <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>NIT: {proveedor.nit}</p>
          )}
        </div>
        <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contacto */}
      {(proveedor.contacto_nombre || proveedor.telefono || proveedor.correo || proveedor.sitio_web) && (
        <div className="card-hce p-4 space-y-2">
          {proveedor.contacto_nombre && (
            <p className="card-title">
              {proveedor.contacto_nombre}
              {proveedor.contacto_cargo && (
                <span className="font-normal" style={{ color: 'var(--hce-text-muted)' }}>
                  {' — '}{proveedor.contacto_cargo}
                </span>
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {proveedor.telefono && (
              <a href={`tel:${proveedor.telefono}`}
                className="flex items-center gap-1.5 text-sm hover:underline"
                style={{ color: 'var(--hce-primary)' }}>
                <Phone className="w-3.5 h-3.5" /> {proveedor.telefono}
              </a>
            )}
            {proveedor.telefono_alt && (
              <a href={`tel:${proveedor.telefono_alt}`}
                className="flex items-center gap-1.5 text-sm"
                style={{ color: 'var(--hce-text-muted)' }}>
                <Phone className="w-3.5 h-3.5" /> {proveedor.telefono_alt}
              </a>
            )}
            {proveedor.correo && (
              <a href={`mailto:${proveedor.correo}`}
                className="flex items-center gap-1.5 text-sm hover:underline"
                style={{ color: 'var(--hce-primary)' }}>
                <Mail className="w-3.5 h-3.5" /> {proveedor.correo}
              </a>
            )}
            {proveedor.sitio_web && (
              <a href={proveedor.sitio_web} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-sm hover:underline"
                style={{ color: 'var(--hce-primary)' }}>
                <Globe className="w-3.5 h-3.5" /> Sitio web
              </a>
            )}
          </div>
          {(proveedor.direccion || proveedor.ciudad) && (
            <p className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
              {[proveedor.direccion, proveedor.ciudad].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      )}

      {proveedor.condiciones_pago && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--hce-text-muted)' }}>
            Condiciones de pago:
          </span>
          <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
            {proveedor.condiciones_pago}
          </span>
        </div>
      )}

      {proveedor.descripcion_servicios && (
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--hce-text-muted)' }}>
            Productos / servicios
          </p>
          <p className="text-sm" style={{ color: 'var(--hce-text)' }}>{proveedor.descripcion_servicios}</p>
        </div>
      )}

      {proveedor.notas && (
        <div className="px-3 py-2 rounded bg-amber-50 border border-amber-100">
          <p className="text-xs text-amber-700">{proveedor.notas}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1 border-t" style={{ borderColor: 'var(--hce-border)' }}>
        <button onClick={onEditar} className="btn-primary">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
        <button
          onClick={() => toggle.mutate()}
          disabled={toggle.isPending}
          className={`px-4 py-1.5 text-sm rounded border transition-colors ${
            proveedor.esta_activo
              ? 'border-red-200 text-red-600 hover:bg-red-50'
              : 'border-green-200 text-green-600 hover:bg-green-50'
          }`}>
          {proveedor.esta_activo ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type Vista = 'lista' | 'nuevo' | 'editar' | 'detalle'

export default function Proveedores() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [vista, setVista] = useState<Vista>('lista')
  const [seleccionado, setSeleccionado] = useState<Proveedor | null>(null)
  const [error, setError] = useState('')

  const { data: proveedores = [], isLoading } = useProveedores(busqueda, filtroTipo)
  const crear = useCrearProveedor()
  const actualizar = useActualizarProveedor(seleccionado?.id ?? '')

  async function handleCrear(input: ProveedorInput) {
    setError('')
    try {
      await crear.mutateAsync(input)
      setVista('lista')
    } catch { setError('Error al crear el proveedor.') }
  }

  async function handleActualizar(input: ProveedorInput) {
    setError('')
    try {
      const updated = await actualizar.mutateAsync(input)
      setSeleccionado(updated)
      setVista('detalle')
    } catch { setError('Error al actualizar el proveedor.') }
  }

  const mostrarLista = vista === 'lista' || vista === 'detalle'

  return (
    <div className="page-hce space-y-5">
      <Breadcrumb items={[{ label: 'Inicio', to: '/' }, { label: 'Proveedores' }]} />

      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h2 className="page-title">Directorio de proveedores</h2>
        </div>
        <button onClick={() => { setVista('nuevo'); setSeleccionado(null); setError('') }}
          className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo proveedor
        </button>
      </div>

      {/* Formulario nuevo */}
      {vista === 'nuevo' && (
        <FormProveedor
          inicial={inputVacio()}
          onGuardar={handleCrear}
          onCancelar={() => setVista('lista')}
          guardando={crear.isPending}
          error={error}
        />
      )}

      {/* Formulario editar */}
      {vista === 'editar' && seleccionado && (
        <FormProveedor
          inicial={{
            razon_social: seleccionado.razon_social,
            nit: seleccionado.nit,
            tipo: seleccionado.tipo,
            contacto_nombre: seleccionado.contacto_nombre,
            contacto_cargo: seleccionado.contacto_cargo,
            telefono: seleccionado.telefono,
            telefono_alt: seleccionado.telefono_alt,
            correo: seleccionado.correo,
            direccion: seleccionado.direccion,
            ciudad: seleccionado.ciudad,
            sitio_web: seleccionado.sitio_web,
            descripcion_servicios: seleccionado.descripcion_servicios,
            condiciones_pago: seleccionado.condiciones_pago,
            notas: seleccionado.notas,
          }}
          onGuardar={handleActualizar}
          onCancelar={() => setVista('detalle')}
          guardando={actualizar.isPending}
          error={error}
        />
      )}

      {/* Layout lista + detalle */}
      {mostrarLista && (
        <div className={`grid gap-5 ${vista === 'detalle' ? 'grid-cols-5' : 'grid-cols-1'}`}>

          {/* Lista */}
          <div className={vista === 'detalle' ? 'col-span-2' : 'col-span-1'}>
            {/* Filtros */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <input className="input-hce pl-8" placeholder="Buscar por nombre o NIT…"
                  value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <select className="input-hce w-44 text-sm" value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}>
                <option value="">Todos los tipos</option>
                {Object.entries(TIPOS_PROVEEDOR).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--hce-text-muted)' }}>Cargando…</p>
            ) : proveedores.length === 0 ? (
              <div className="card-hce p-12 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-sm" style={{ color: 'var(--hce-text-muted)' }}>
                  No hay proveedores registrados.
                </p>
              </div>
            ) : (
              <div className="card-hce divide-y" style={{ borderColor: 'var(--hce-border)' }}>
                {proveedores.map(p => (
                  <button key={p.id}
                    onClick={() => { setSeleccionado(p); setVista('detalle') }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      seleccionado?.id === p.id ? 'bg-[var(--hce-primary-soft)]' : 'hover:bg-slate-50'
                    } ${!p.esta_activo ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--hce-text)' }}>
                        {p.razon_social}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${TIPO_COLOR[p.tipo]}`}>
                          {TIPOS_PROVEEDOR[p.tipo]}
                        </span>
                        {p.telefono && (
                          <span className="text-xs" style={{ color: 'var(--hce-text-muted)' }}>
                            {p.telefono}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detalle */}
          {vista === 'detalle' && seleccionado && (
            <div className="col-span-3 card-hce p-5">
              <DetalleProveedor
                proveedor={seleccionado}
                onEditar={() => { setVista('editar'); setError('') }}
                onCerrar={() => { setVista('lista'); setSeleccionado(null) }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
