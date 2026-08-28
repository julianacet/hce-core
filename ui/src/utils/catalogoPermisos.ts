// Etiquetas legibles para los recursos definidos en el backend
// (api/permisos.catalogoRecursos). Puramente de presentación — agregar un
// recurso nuevo en el backend sigue requiriendo agregar su etiqueta aquí
// también; si falta, simplemente no aparece en la matriz del panel.

export type GrupoPermisos = {
  grupo: string
  recursos: { recurso: string; label: string }[]
}

export const GRUPOS_PERMISOS: GrupoPermisos[] = [
  {
    grupo: 'Atención al paciente',
    recursos: [
      { recurso: 'pacientes', label: 'Pacientes' },
      { recurso: 'nueva-consulta', label: 'Consultas' },
      { recurso: 'agenda', label: 'Agenda' },
      { recurso: 'consentimientos', label: 'Consentimientos' },
    ],
  },
  {
    grupo: 'Facturación y reportes',
    recursos: [
      { recurso: 'facturas', label: 'Facturación' },
      { recurso: 'rips-mensual', label: 'RIPS Mensual' },
      { recurso: 'tarifas', label: 'Tarifas' },
    ],
  },
  {
    grupo: 'Gestión del consultorio',
    recursos: [
      { recurso: 'inventario', label: 'Inventario de insumos' },
      { recurso: 'proveedores', label: 'Proveedores' },
      { recurso: 'eventos-adversos', label: 'Eventos adversos' },
      { recurso: 'encuestas', label: 'Encuestas' },
    ],
  },
  {
    grupo: 'Farmacia',
    recursos: [{ recurso: 'farmacia', label: 'Módulo Farmacia' }],
  },
  {
    grupo: 'Administración',
    recursos: [
      { recurso: 'admin.perfil', label: 'Perfil médico' },
      { recurso: 'admin.apariencia', label: 'Apariencia' },
      { recurso: 'admin.antecedentes', label: 'Antecedentes' },
      { recurso: 'admin.consentimientos', label: 'Plantillas de consentimiento' },
      { recurso: 'admin.eventos', label: 'Catálogo de eventos adversos' },
      { recurso: 'admin.campos', label: 'Campos clínicos' },
      { recurso: 'admin.medicamentos', label: 'Medicamentos predefinidos' },
      { recurso: 'admin.examenes', label: 'Exámenes predefinidos' },
      { recurso: 'admin.sistema', label: 'Actualizaciones del sistema' },
      { recurso: 'admin.usuarios', label: 'Gestión de usuarios' },
      { recurso: 'admin.permisos', label: 'Roles y permisos' },
    ],
  },
  {
    grupo: 'Sistema',
    recursos: [{ recurso: 'historial', label: 'Historial de auditoría' }],
  },
]
