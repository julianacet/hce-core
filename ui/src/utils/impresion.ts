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
  formula: 'Carta',
  consentimiento: 'Carta',
  historiaClinica: 'Carta',
  ordenExamen: 'Carta',
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

// En Windows (Webview2): envía el PDF al backend para abrirlo con el visor del SO.
// En Linux/macOS (navegador real): usa window.print() directamente, que sí funciona.
export async function imprimirConVisorSO(blob: Blob): Promise<void> {
  const { apiFetch, apiFetchBinary } = await import('../api/client')

  let esWindows = false
  try {
    const version = await apiFetch<{ plataforma?: string }>('/sistema/version')
    esWindows = version.plataforma === 'windows'
  } catch {
    // Si no se puede consultar, asumir no-Windows y usar window.print()
  }

  if (esWindows) {
    const buffer = await blob.arrayBuffer()
    await apiFetchBinary('/sistema/abrir-pdf', buffer)
  } else {
    const url = URL.createObjectURL(blob)
    const ventana = window.open(url)
    if (ventana) {
      ventana.addEventListener('load', () => {
        ventana.focus()
        ventana.print()
        ventana.addEventListener('afterprint', () => URL.revokeObjectURL(url))
      })
    }
  }
}
