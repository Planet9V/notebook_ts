'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect } from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BlockEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  height?: number
  onTemplateSelect?: (category: string) => void
}

const TEMPLATES = {
  sales: `<h3>Service Definition</h3><ul><li><strong>Price</strong>: $0.00</li><li><strong>Market Segment</strong>: </li><li><strong>Sales Executive</strong>: </li></ul>`,
  marketing: `<h3>Campaign Plan</h3><ul><li><strong>Target Audience</strong>: </li><li><strong>Budget</strong>: $0.00</li><li><strong>Channels</strong>: </li></ul>`,
  delivery: `<h3>Scope & Compliance</h3><ul><li><strong>Division</strong>: </li><li><strong>Framework</strong>: NIST CSF v2</li><li><strong>SRE Owner</strong>: </li></ul>`,
  research: `<h3>Audit Finding</h3><ul><li><strong>ICS Protocol</strong>: Modbus</li><li><strong>Threat Level</strong>: </li><li><strong>CVE Reference</strong>: </li></ul>`
}

export function BlockEditor({
  value = '',
  onChange,
  placeholder = 'Write something...',
  className,
  height = 400,
  onTemplateSelect
}: BlockEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4 text-foreground bg-background/50',
      },
    },
  })

  // Prevent cursor jumping when content updates externally
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  const buttons = [
    {
      icon: Bold,
      title: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      icon: Italic,
      title: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      icon: Strikethrough,
      title: 'Strikethrough',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
    },
    {
      icon: Heading1,
      title: 'Heading 1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      icon: Heading2,
      title: 'Heading 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      icon: Heading3,
      title: 'Heading 3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    {
      icon: List,
      title: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      icon: ListOrdered,
      title: 'Ordered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      icon: Quote,
      title: 'Blockquote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      icon: Code,
      title: 'Code Block',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
  ]

  const handleInsertTemplate = (category: keyof typeof TEMPLATES) => {
    const html = TEMPLATES[category]
    editor.chain().focus().insertContent(html).run()
    onTemplateSelect?.(category)
  }

  const characters = editor.storage.characterCount.characters()
  const words = editor.storage.characterCount.words()

  return (
    <div
      className={cn(
        'flex flex-col border rounded-lg overflow-hidden bg-background/40 backdrop-blur-md border-border/50 shadow-md transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20',
        className
      )}
      style={{ minHeight: height }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 border-b bg-muted/30 border-border/50">
        <div className="flex flex-wrap items-center gap-1.5">
          {buttons.map((btn, idx) => {
            const Icon = btn.icon
            const active = btn.isActive()
            return (
              <button
                key={idx}
                type="button"
                onClick={btn.action}
                className={cn(
                  'p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground',
                  active && 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary'
                )}
                title={btn.title}
              >
                <Icon className="w-4 h-4" />
              </button>
            )
          })}

          <div className="h-4 w-px bg-border/80 mx-1" />
          <select
            onChange={(e) => {
              const val = e.target.value as keyof typeof TEMPLATES
              if (val) {
                handleInsertTemplate(val)
                e.target.value = ""
              }
            }}
            defaultValue=""
            className="h-7 text-[10px] bg-background border border-border/60 rounded px-1.5 text-muted-foreground focus:outline-none cursor-pointer hover:bg-muted hover:text-foreground transition-all duration-200 font-medium"
          >
            <option value="">Insert Template...</option>
            <option value="sales">Sales Service</option>
            <option value="marketing">Marketing Campaign</option>
            <option value="delivery">Project Delivery Scope</option>
            <option value="research">Research Finding</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent text-muted-foreground"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent text-muted-foreground"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full min-h-[200px]" />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground bg-muted/10">
        <div className="flex items-center gap-2">
          <span>{words} words</span>
          <span>•</span>
          <span>{characters} characters</span>
        </div>
        <div className="text-primary/70 font-medium tracking-wide uppercase">Block Editor</div>
      </div>
    </div>
  )
}
