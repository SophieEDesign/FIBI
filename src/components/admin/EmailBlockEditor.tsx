'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'

interface EmailBlockEditorProps {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
}

/**
 * TipTap block editor for email templates. Outputs email-safe-ish HTML stored in html_content.
 * Includes a raw HTML toggle for power users.
 */
export default function EmailBlockEditor({ value, onChange, disabled }: EmailBlockEditorProps) {
  const [mode, setMode] = useState<'blocks' | 'html'>('blocks')
  const [rawHtml, setRawHtml] = useState(value)

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        code: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: 'color: #2563eb; text-decoration: underline;',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          style: 'max-width: 100%; height: auto; border-radius: 8px;',
        },
      }),
      Placeholder.configure({
        placeholder: 'Write your email…',
      }),
    ],
    []
  )

  const editor = useEditor({
    extensions,
    content: value || '',
    editable: !disabled && mode === 'blocks',
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      onChange(html)
      setRawHtml(html)
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[200px] px-3 py-2 focus:outline-none text-gray-800',
      },
    },
  })

  // Sync external value into editor when switching back to blocks or loading template
  useEffect(() => {
    if (!editor || mode !== 'blocks') return
    const current = editor.getHTML()
    if (value !== current && value !== rawHtml) {
      editor.commands.setContent(value || '', { emitUpdate: false })
      setRawHtml(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when value/mode change externally
  }, [value, mode, editor])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled && mode === 'blocks')
  }, [editor, disabled, mode])

  const insertButton = () => {
    if (!editor) return
    const href = window.prompt('Button link URL', 'https://fibi.world')
    if (!href) return
    const label = window.prompt('Button label', 'Open FiBi') || 'Open FiBi'
    editor
      .chain()
      .focus()
      .insertContent(
        `<p style="text-align:center;margin:24px 0;"><a href="${href.replace(/"/g, '')}" style="display:inline-block;background:#171717;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${label.replace(/</g, '')}</a></p>`
      )
      .run()
  }

  const insertImage = () => {
    if (!editor) return
    const src = window.prompt('Image URL')
    if (!src) return
    editor.chain().focus().setImage({ src }).run()
  }

  const insertSpacer = () => {
    if (!editor) return
    editor
      .chain()
      .focus()
      .insertContent('<p style="margin:0;padding:0;line-height:32px;font-size:32px;">&nbsp;</p>')
      .run()
  }

  const switchToHtml = () => {
    const html = editor?.getHTML() ?? rawHtml
    setRawHtml(html)
    setMode('html')
  }

  const switchToBlocks = () => {
    onChange(rawHtml)
    editor?.commands.setContent(rawHtml || '', { emitUpdate: false })
    setMode('blocks')
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <button
          type="button"
          disabled={disabled || mode === 'html'}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-40"
        >
          H1
        </button>
        <button
          type="button"
          disabled={disabled || mode === 'html'}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-40"
        >
          H2
        </button>
        <button
          type="button"
          disabled={disabled || mode === 'html'}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className="px-2 py-1 text-xs font-bold rounded hover:bg-gray-200 disabled:opacity-40"
        >
          B
        </button>
        <button
          type="button"
          disabled={disabled || mode === 'html'}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className="px-2 py-1 text-xs italic rounded hover:bg-gray-200 disabled:opacity-40"
        >
          I
        </button>
        <button
          type="button"
          disabled={disabled || mode === 'html'}
          onClick={() => {
            const url = window.prompt('Link URL')
            if (!url) return
            editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-40"
        >
          Link
        </button>
        <button
          type="button"
          disabled={disabled || mode === 'html'}
          onClick={insertImage}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-40"
        >
          Image
        </button>
        <button
          type="button"
          disabled={disabled || mode === 'html'}
          onClick={insertButton}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-40"
        >
          Button
        </button>
        <button
          type="button"
          disabled={disabled || mode === 'html'}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-40"
        >
          Divider
        </button>
        <button
          type="button"
          disabled={disabled || mode === 'html'}
          onClick={insertSpacer}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-40"
        >
          Spacer
        </button>
        <span className="flex-1" />
        {mode === 'blocks' ? (
          <button
            type="button"
            onClick={switchToHtml}
            className="px-2 py-1 text-xs text-gray-600 underline"
          >
            Edit HTML
          </button>
        ) : (
          <button
            type="button"
            onClick={switchToBlocks}
            className="px-2 py-1 text-xs text-gray-600 underline"
          >
            Back to blocks
          </button>
        )}
      </div>

      {mode === 'blocks' ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          value={rawHtml}
          disabled={disabled}
          onChange={(e) => {
            setRawHtml(e.target.value)
            onChange(e.target.value)
          }}
          rows={14}
          className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
          spellCheck={false}
        />
      )}
    </div>
  )
}
