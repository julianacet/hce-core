export function nombreCompleto(p: {
  nombre_primero: string
  nombre_segundo?: string | null
  apellido_primero: string
  apellido_segundo?: string | null
}): string {
  return [p.nombre_primero, p.nombre_segundo, p.apellido_primero, p.apellido_segundo]
    .filter(Boolean)
    .join(' ')
}

export function calcularEdad(fechaStr: string): number | null {
  if (!fechaStr) return null
  const hoy = new Date()
  const nac = new Date(fechaStr)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad >= 0 ? edad : null
}
