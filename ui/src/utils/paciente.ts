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

// Convierte un string "YYYY-MM-DD" a fecha local sin el desfase UTC.
// new Date("YYYY-MM-DD") parsea como UTC medianoche → muestra día anterior en UTC-5.
export function parseFechaLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function fmtFechaNacimiento(iso: string | null | undefined): string {
  if (!iso) return '—'
  return parseFechaLocal(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}
