// Las plantillas de consentimiento y su contenido generado se guardaban como
// texto plano (con saltos de línea) antes de introducir el editor de texto
// enriquecido (HTML). Estas utilidades permiten que ese contenido antiguo se
// siga mostrando/editando/imprimiendo correctamente sin necesidad de migrar
// los datos ya guardados.

const TAG_HTML = /<[a-z][\s\S]*>/i

export function esHtml(contenido: string): boolean {
  return TAG_HTML.test(contenido)
}

export function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Convierte texto plano (párrafos separados por línea en blanco, saltos de
// línea simples dentro de un párrafo) a HTML equivalente, escapando el texto.
export function textoPlanoAHtml(texto: string): string {
  return texto
    .split(/\n{2,}/)
    .map((parrafo) => `<p>${escapeHtml(parrafo).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// Si el contenido ya es HTML (viene del editor nuevo) lo deja tal cual;
// si es texto plano legacy, lo convierte a HTML antes de usarlo en el editor.
export function asegurarHtml(contenido: string): string {
  if (!contenido.trim()) return ''
  return esHtml(contenido) ? contenido : textoPlanoAHtml(contenido)
}

// El HTML "vacío" que deja Tiptap (p.ej. "<p></p>") no debe tratarse como
// contenido válido — se compara el texto sin las etiquetas.
export function htmlEstaVacio(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').trim() === ''
}
