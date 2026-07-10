import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, CaseUpper, Undo2, Redo2, Eraser,
} from 'lucide-react'

export type EditorConsentimientoHandle = {
  insertarEnCursor: (texto: string) => void
}

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

const EditorConsentimiento = forwardRef<EditorConsentimientoHandle, Props>(
  function EditorConsentimiento({ value, onChange, placeholder }, ref) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          code: false, codeBlock: false, heading: false, horizontalRule: false, link: false,
        }),
        TextAlign.configure({ types: ['paragraph'] }),
        Placeholder.configure({ placeholder: placeholder ?? '' }),
      ],
      content: value,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      editorProps: {
        attributes: { class: 'tiptap-content' },
      },
    })

    // Sincroniza cambios externos de `value` (p.ej. al cambiar de plantilla)
    // sin pisar lo que el usuario está escribiendo activamente en el editor.
    useEffect(() => {
      if (!editor) return
      if (editor.isFocused) return
      if (editor.getHTML() === value) return
      editor.commands.setContent(value || '', { emitUpdate: false })
    }, [value, editor])

    useImperativeHandle(ref, () => ({
      insertarEnCursor(texto: string) {
        editor?.chain().focus().insertContent(texto).run()
      },
    }), [editor])

    function mayusculas() {
      if (!editor) return
      const { from, to, empty } = editor.state.selection
      if (empty) return
      const seleccion = editor.state.doc.textBetween(from, to, '\n')
      editor.chain().focus().insertContentAt({ from, to }, seleccion.toUpperCase()).run()
    }

    if (!editor) return null

    const claseBoton = (activo = false) =>
      `p-1.5 rounded hover:bg-slate-200 transition-colors ${activo ? 'bg-slate-200 text-[var(--hce-primary)]' : 'text-slate-600'}`

    return (
      <div>
        <div className="flex flex-wrap items-center gap-1 border border-slate-200 rounded-t-lg bg-slate-50 px-2 py-1.5">
          <button type="button" title="Negrilla" onClick={() => editor.chain().focus().toggleBold().run()}
            className={claseBoton(editor.isActive('bold'))}><Bold size={14} /></button>
          <button type="button" title="Cursiva" onClick={() => editor.chain().focus().toggleItalic().run()}
            className={claseBoton(editor.isActive('italic'))}><Italic size={14} /></button>
          <button type="button" title="Subrayado" onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={claseBoton(editor.isActive('underline'))}><Underline size={14} /></button>
          <button type="button" title="Tachado" onClick={() => editor.chain().focus().toggleStrike().run()}
            className={claseBoton(editor.isActive('strike'))}><Strikethrough size={14} /></button>
          <button type="button" title="Mayúsculas — selecciona el texto primero" onClick={mayusculas}
            className={claseBoton()}><CaseUpper size={14} /></button>

          <span className="w-px h-5 bg-slate-300 mx-1" />

          <button type="button" title="Lista con viñetas" onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={claseBoton(editor.isActive('bulletList'))}><List size={14} /></button>
          <button type="button" title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={claseBoton(editor.isActive('orderedList'))}><ListOrdered size={14} /></button>
          <button type="button" title="Sangría / cita" onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={claseBoton(editor.isActive('blockquote'))}><Quote size={14} /></button>

          <span className="w-px h-5 bg-slate-300 mx-1" />

          <button type="button" title="Alinear izquierda" onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={claseBoton(editor.isActive({ textAlign: 'left' }))}><AlignLeft size={14} /></button>
          <button type="button" title="Centrar" onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={claseBoton(editor.isActive({ textAlign: 'center' }))}><AlignCenter size={14} /></button>
          <button type="button" title="Alinear derecha" onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={claseBoton(editor.isActive({ textAlign: 'right' }))}><AlignRight size={14} /></button>
          <button type="button" title="Justificar" onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={claseBoton(editor.isActive({ textAlign: 'justify' }))}><AlignJustify size={14} /></button>

          <span className="w-px h-5 bg-slate-300 mx-1" />

          <button type="button" title="Deshacer" onClick={() => editor.chain().focus().undo().run()}
            className={claseBoton()}><Undo2 size={14} /></button>
          <button type="button" title="Rehacer" onClick={() => editor.chain().focus().redo().run()}
            className={claseBoton()}><Redo2 size={14} /></button>
          <button type="button" title="Limpiar formato" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            className={claseBoton()}><Eraser size={14} /></button>
        </div>
        <div className="editor-consentimiento">
          <EditorContent editor={editor} />
        </div>
      </div>
    )
  }
)

export default EditorConsentimiento
