export type TamanoDocumento = 'A4' | 'Carta' | 'MediaCarta' | 'A5'
export type TamanoTermica = 'Termica80' | 'Termica58'

export type ConfigImpresion = {
  factura: TamanoDocumento
  formula: TamanoDocumento
  consentimiento: TamanoDocumento
  historiaClinica: TamanoDocumento
  ordenExamen: TamanoDocumento
  termicaFactura: TamanoTermica
}

export const DEFAULTS_IMPRESION: ConfigImpresion = {
  factura: 'MediaCarta',
  formula: 'A4',
  consentimiento: 'A4',
  historiaClinica: 'A4',
  ordenExamen: 'A4',
  termicaFactura: 'Termica80',
}

// Tamaños en puntos (1pt = 1/72 in)
export const TAMANO_PAGINA: Record<TamanoDocumento, string | [number, number]> = {
  A4: 'A4',
  Carta: 'LETTER',
  MediaCarta: [396, 612],
  A5: 'A5',
}

export const TAMANO_TERMICA: Record<TamanoTermica, [number, number]> = {
  Termica80: [227, 841],
  Termica58: [165, 841],
}

export const LABEL_TAMANO: Record<TamanoDocumento, string> = {
  A4: 'A4 · 210 × 297 mm',
  Carta: 'Carta · 216 × 279 mm',
  MediaCarta: 'Media carta · 140 × 216 mm',
  A5: 'A5 · 148 × 210 mm',
}

export const LABEL_TERMICA: Record<TamanoTermica, string> = {
  Termica80: 'Térmica 80 mm',
  Termica58: 'Térmica 58 mm',
}
