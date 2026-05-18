// Central registry of TanStack Query cache keys.
// Always use these constants in queryKey and invalidateQueries so they
// can never silently diverge from a typo.

export const PACIENTES_KEY = ['pacientes'] as const
export const PACIENTES_PAGINADOS_KEY = ['pacientes-paginados'] as const

export const ENCUENTROS_KEY = ['encuentros'] as const
export const ENCUENTROS_GLOBAL_KEY = ['encuentros-global'] as const

export const EPS_REGIMENES_KEY = ['eps-regimenes'] as const
export const EPS_KEY = ['eps'] as const
export const EPS_INFO_KEY = ['eps-info'] as const

export const OCUPACIONES_KEY = ['ocupaciones'] as const
export const OCUPACION_KEY = ['ocupacion'] as const

export const DEPARTAMENTOS_KEY = ['departamentos'] as const
export const MUNICIPIOS_KEY = ['municipios'] as const
export const MUNICIPIO_KEY = ['municipio'] as const

export const ANTECEDENTES_KEY = ['antecedentes'] as const
export const ANTECEDENTES_PREGUNTAS_KEY = ['antecedentes-preguntas'] as const

export const CAMPOS_CLINICOS_KEY = ['campos-clinicos'] as const

export const CITAS_KEY = ['citas'] as const
export const CITAS_MES_KEY = ['citas-mes'] as const

export const PLANTILLAS_CONSENTIMIENTO_KEY = ['plantillas-consentimiento'] as const
export const CONSENTIMIENTO_KEY = ['consentimiento'] as const

export const CUPS_KEY = ['cups'] as const

export const DASHBOARD_KEY = ['dashboard'] as const

export const DIAGNOSTICOS_KEY = ['diagnosticos'] as const

export const ENCUESTAS_KEY = ['encuestas'] as const
export const ENCUESTAS_RESUMEN_KEY = ['encuestas-resumen'] as const

export const TIPOS_EA_KEY = ['tipos-ea'] as const
export const EVENTOS_ADVERSOS_KEY = ['eventos-adversos'] as const

export const FACTURAS_KEY = ['facturas'] as const

export const FORMULAS_KEY = ['formulas'] as const

export const INSUMOS_KEY = ['insumos'] as const
export const MOVIMIENTOS_KEY = ['movimientos'] as const

export const MEDICAMENTOS_KEY = ['medicamentos-predefinidos'] as const

export const NOTAS_ENCUENTRO_KEY = ['notas-encuentro'] as const

export const PROVEEDORES_KEY = ['proveedores'] as const

export const RIPS_RESUMEN_KEY = ['rips-resumen'] as const
export const RIPS_HISTORIAL_KEY = ['rips-historial'] as const

export const USUARIOS_KEY = ['usuarios'] as const

export const AUDITORIA_KEY = ['auditoria'] as const

export const TARIFAS_KEY = ['tarifas'] as const

export const ORDENES_EXAMEN_KEY = ['ordenes-examen'] as const
