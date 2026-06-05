'use client'

import dynamic from 'next/dynamic'
import { forwardRef } from 'react'
import { useTheme } from '@/lib/stores/theme-store'
import '@uiw/react-md-editor/markdown-editor.css'


const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

export interface MarkdownEditorProps {
  value?: string
  onChange?: (value?: string) => void
  placeholder?: string
  height?: number
  preview?: 'live' | 'edit' | 'preview'
  hideToolbar?: boolean
  textareaId?: string
  name?: string
  className?: string
}

export const MarkdownEditor = forwardRef<HTMLDivElement, MarkdownEditorProps>(
  ({ value = '', onChange, placeholder, height = 300, preview = 'live', hideToolbar = false, className, textareaId, name }, ref) => {
    const { effectiveTheme } = useTheme()

    return (
      <div className={className} ref={ref}>
        <MDEditor
          value={value}
          onChange={onChange}
          preview={preview}
          height={height}
          hideToolbar={hideToolbar}
          textareaProps={{
            placeholder: placeholder || 'Enter markdown...',
            id: textareaId,
            name: name,
          }}
          data-color-mode={effectiveTheme}
        />
      </div>
    )
  }
)

MarkdownEditor.displayName = 'MarkdownEditor'