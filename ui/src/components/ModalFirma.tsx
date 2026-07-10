import { useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { useConfirmar } from './ModalConfirmar'

type Props = {
  onGuardar: (firmaBase64: string) => void
  onCancelar: () => void
  guardando?: boolean
}

// Lienzo grande para que el trazo se vea con claridad mientras se firma.
const ANCHO = 760
const ALTO = 300

// Tamaño final estandarizado del PNG exportado (misma proporción 2.5:1 que
// el recuadro de firma en el PDF: 140×56pt) — así el paciente no tiene que
// preocuparse por cuán grande o pequeño firme; siempre se recorta a la tinta
// real y se reescala a este tamaño antes de guardar.
const SALIDA_ANCHO = 500
const SALIDA_ALTO = 200

// Nota: se probó capturar el puntero con la Pointer Lock API para que el
// lápiz de la tableta no pudiera "navegar" fuera del lienzo, pero el
// movimiento relativo (movementX/Y) que expone esa API es inconsistente
// entre sistemas —especialmente en Windows con escalado de pantalla (DPI)—
// y producía saltos del trazo hacia los bordes. Se descartó: el trazo se
// captura con posición absoluta normal (igual que cualquier mouse/tableta),
// y `setPointerCapture` ya garantiza que una vez iniciado un trazo dentro
// del lienzo, se sigue recibiendo aunque el cursor salga de sus límites.
type Punto = { x: number; y: number }

export default function ModalFirma({ onGuardar, onCancelar, guardando }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dibujando = useRef(false)
  // Últimos puntos crudos del trazo activo (máx. 3) — se usan para suavizar
  // con una curva cuadrática en vez de líneas rectas entre muestras, así
  // los movimientos finos (una espiral pequeña, un rasgo corto) se ven
  // curvos y naturales en vez de "poligonales".
  const puntosTrazo = useRef<Punto[]>([])
  const [vacio, setVacio] = useState(true)
  const { confirmar, modal: modalConfirmar } = useConfirmar()

  function pedirCancelar() {
    if (vacio) { onCancelar(); return }
    confirmar('¿Cancelar la firma? Se perderá el trazo ya dibujado.', onCancelar)
  }

  // Cancelar/Limpiar son destructivos (pierden el trazo), así que ignoran
  // clics del lápiz (pointerType 'pen') — un trazo que se salga por
  // accidente del lienzo no debe poder accionarlos. "Guardar firma" queda
  // fuera de esto a propósito: lo normal es presionarlo justo con el mismo
  // lápiz con el que se firmó, así que bloquearlo ahí rompía el flujo
  // (el clic se descartaba en silencio y la firma nunca se guardaba).
  // Se registra en pointerdown (antes de que el navegador dispare el click)
  // y se descarta el click si fue lápiz.
  const ultimoTipoBoton = useRef<string | null>(null)
  function alPresionarBoton(e: React.PointerEvent) {
    ultimoTipoBoton.current = e.pointerType
  }
  function alHacerClic(accion: () => void) {
    const eraLapiz = ultimoTipoBoton.current === 'pen'
    ultimoTipoBoton.current = null
    if (!eraLapiz) accion()
  }

  function estilo(ctx: CanvasRenderingContext2D, presion: number, escala: number) {
    // Ancho base más generoso (antes 1.5) para que el trazo se vea firme
    // incluso sin datos reales de presión — sin el driver del fabricante,
    // muchas tabletas reportan una presión constante (no varía con fuerza),
    // así que no podemos depender solo de la presión para que se vea bien.
    ctx.lineWidth = (2.2 + presion * 2) * escala
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }

  // Curva cuadrática entre los puntos medios de 3 muestras consecutivas —
  // técnica estándar para suavizar dibujo a mano alzada en canvas: el punto
  // intermedio real (p1) se usa como punto de control de la curva, y se
  // dibuja entre los puntos medios de (p0,p1) y (p1,p2), no entre los puntos
  // crudos. Así una espiral pequeña sale curva en vez de "poligonal".
  function trazarSuave(p0: Punto, p1: Punto, p2: Punto, presion: number) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    const escala = canvas.width / ANCHO
    const inicio = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }
    const fin = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
    estilo(ctx, presion, escala)
    ctx.beginPath()
    ctx.moveTo(inicio.x * escala, inicio.y * escala)
    ctx.quadraticCurveTo(p1.x * escala, p1.y * escala, fin.x * escala, fin.y * escala)
    ctx.stroke()
    setVacio(false)
  }

  // Para un trazo muy corto (un toque, un punto) que nunca acumuló 3
  // muestras: dibuja un puntito, para que no desaparezca silenciosamente.
  function trazarPunto(p: Punto, presion: number) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    const escala = canvas.width / ANCHO
    estilo(ctx, presion, escala)
    ctx.beginPath()
    ctx.arc(p.x * escala, p.y * escala, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fillStyle = ctx.strokeStyle
    ctx.fill()
    setVacio(false)
  }

  function posicionAbsoluta(ev: PointerEvent): Punto {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((ev.clientX - rect.left) / rect.width) * ANCHO,
      y: ((ev.clientY - rect.top) / rect.height) * ALTO,
    }
  }

  // El modal es chico comparado con toda el área activa de una tableta
  // gráfica (que suele mapear a la pantalla completa) — es normal que el
  // paciente empiece a firmar con el lápiz ya presionado ANTES de entrar al
  // recuadro. Por eso no arrancamos el trazo solo en pointerdown (que exige
  // que la presión haya empezado adentro): en cada evento revisamos
  // `e.buttons` (¿hay un botón/lápiz presionado ahora mismo?, sin importar
  // dónde empezó) y arrancamos el trazo en el primer evento presionado que
  // llegue al lienzo, sea por pointerdown o por haber entrado ya presionado.
  function estaPresionado(e: React.PointerEvent | PointerEvent) {
    return (e.buttons & 1) === 1
  }

  function iniciarTrazo(e: React.PointerEvent<HTMLCanvasElement>) {
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* no-op */ }
    dibujando.current = true
    puntosTrazo.current = [posicionAbsoluta(e.nativeEvent)]
  }

  // Procesa un único evento nativo (el final, o uno de los "coalesced
  // events" — ver comentario en `manejarMovimiento`).
  function procesarEvento(ev: PointerEvent) {
    const presion = ev.pressure > 0 ? ev.pressure : 0.5
    const actual = posicionAbsoluta(ev)
    const puntos = puntosTrazo.current
    puntos.push(actual)
    if (puntos.length > 3) puntos.shift()
    if (puntos.length === 3) trazarSuave(puntos[0], puntos[1], puntos[2], presion)
  }

  function manejarMovimiento(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!estaPresionado(e)) return
    if (!dibujando.current) { iniciarTrazo(e); return }
    // A velocidades de trazo altas, el navegador agrupa varias muestras del
    // lápiz/tableta en un solo evento de React para no saturar el hilo
    // principal. getCoalescedEvents() recupera esas muestras intermedias;
    // sin esto el trazo se ve "a saltos" en vez de una línea fluida.
    const nativo = e.nativeEvent
    const eventos = typeof nativo.getCoalescedEvents === 'function' ? nativo.getCoalescedEvents() : []
    if (eventos.length > 0) {
      for (const ev of eventos) procesarEvento(ev)
    } else {
      procesarEvento(nativo)
    }
  }

  function finalizarTrazo(e: React.PointerEvent<HTMLCanvasElement>) {
    // Un toque corto (nunca llegó a acumular 3 muestras) no dibujó nada
    // todavía — se marca como un punto para que no desaparezca.
    if (dibujando.current && puntosTrazo.current.length < 3 && puntosTrazo.current.length > 0) {
      trazarPunto(puntosTrazo.current[puntosTrazo.current.length - 1], 0.5)
    }
    dibujando.current = false
    puntosTrazo.current = []
    if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId)
    }
  }

  // El trazo puede salirse momentáneamente del lienzo mientras se sigue
  // presionando (el canvas recorta lo que se dibuje afuera, no pasa nada) —
  // solo se debe cerrar el trazo si de verdad se soltó el botón/lápiz, no
  // solo porque el puntero salió de los límites visibles.
  function alSalirDelLienzo(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!estaPresionado(e)) finalizarTrazo(e)
  }

  function limpiar() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setVacio(true)
  }

  // Recorta el lienzo al rectángulo real de la tinta dibujada y lo reescala
  // a un tamaño fijo — así da igual si el paciente firmó grande, pequeño,
  // centrado o en una esquina: el PNG final siempre queda estandarizado.
  function recortarYEstandarizar(canvas: HTMLCanvasElement): string {
    const ctx = canvas.getContext('2d')!
    const { width, height } = canvas
    const { data } = ctx.getImageData(0, 0, width, height)

    let minX = width, minY = height, maxX = 0, maxY = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 10) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return canvas.toDataURL('image/png')

    const margen = 14
    minX = Math.max(0, minX - margen)
    minY = Math.max(0, minY - margen)
    maxX = Math.min(width, maxX + margen)
    maxY = Math.min(height, maxY + margen)
    const anchoRecorte = maxX - minX
    const altoRecorte = maxY - minY

    const escala = Math.min(SALIDA_ANCHO / anchoRecorte, SALIDA_ALTO / altoRecorte, 4)
    const anchoFinal = anchoRecorte * escala
    const altoFinal = altoRecorte * escala

    const salida = document.createElement('canvas')
    salida.width = SALIDA_ANCHO
    salida.height = SALIDA_ALTO
    const sctx = salida.getContext('2d')!
    sctx.drawImage(
      canvas, minX, minY, anchoRecorte, altoRecorte,
      (SALIDA_ANCHO - anchoFinal) / 2, (SALIDA_ALTO - altoFinal) / 2, anchoFinal, altoFinal,
    )
    return salida.toDataURL('image/png')
  }

  function guardar() {
    if (!canvasRef.current || vacio) return
    onGuardar(recortarYEstandarizar(canvasRef.current))
  }

  return (
    // Ocupa toda la ventana de la app (no un recuadro chico centrado): así el
    // lienzo puede ser mucho más grande, reduciendo el riesgo de que el
    // lápiz se salga de la zona dibujable e induzca trazos perdidos o
    // errores — sobre todo cuando la tableta tiene su área activa mapeada a
    // toda la pantalla física. El fondo NO cierra el modal al hacer clic.
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--hce-bg)' }}>
      <div className="px-8 py-5 border-b shrink-0" style={{ borderColor: 'var(--hce-border)' }}>
        <h3 className="font-medium text-lg" style={{ color: 'var(--hce-text)' }}>Firma del paciente</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--hce-text-muted)' }}>
          Pide al paciente que firme con el lápiz de la tableta digitalizadora dentro del recuadro.
          No importa el tamaño con el que firme: se ajusta automáticamente al guardar.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center p-1">
        <canvas
          ref={canvasRef}
          width={ANCHO * 2}
          height={ALTO * 2}
          style={{ width: 'min(95vw, 1600px)', maxHeight: '100%', aspectRatio: `${ANCHO} / ${ALTO}`, touchAction: 'none', cursor: 'crosshair' }}
          className="border border-slate-300 rounded-lg bg-white block"
          onPointerDown={manejarMovimiento}
          onPointerMove={manejarMovimiento}
          onPointerEnter={manejarMovimiento}
          onPointerUp={finalizarTrazo}
          onPointerLeave={alSalirDelLienzo}
          onPointerCancel={finalizarTrazo}
        />
      </div>

      <div className="px-8 py-5 border-t shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--hce-border)' }}>
        <button
          type="button"
          onPointerDown={alPresionarBoton}
          onClick={() => alHacerClic(limpiar)}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <Eraser size={14} /> Limpiar
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onPointerDown={alPresionarBoton}
            onClick={() => alHacerClic(pedirCancelar)}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={vacio || guardando}
            className="btn-primary disabled:opacity-40"
          >
            {guardando ? 'Guardando...' : 'Guardar firma'}
          </button>
        </div>
      </div>
      {modalConfirmar}
    </div>
  )
}
