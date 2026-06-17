'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Columns,
  Eye,
  Edit3,
  Copy,
  Check,
  Code
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SplitEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  height?: number
}

export function SplitEditor({
  value = '',
  onChange,
  placeholder = 'Write prompt template in Markdown format...',
  className,
  height = 450
}: SplitEditorProps) {
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text', err)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col border rounded-lg overflow-hidden bg-background/40 backdrop-blur-md border-border/50 shadow-md transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20',
        className
      )}
      style={{ minHeight: height }}
    >
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-muted/30 border-border/50">
        {/* Toggle Mode Buttons */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer text-muted-foreground',
              viewMode === 'edit' && 'bg-background text-foreground shadow-xs'
            )}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editor
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer text-muted-foreground',
              viewMode === 'split' && 'bg-background text-foreground shadow-xs'
            )}
          >
            <Columns className="w-3.5 h-3.5" />
            Split
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer text-muted-foreground',
              viewMode === 'preview' && 'bg-background text-foreground shadow-xs'
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>

        {/* Copy Action */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Raw
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor & Preview Pane Container */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40 overflow-hidden">
        {/* Left Side: Textarea Editor */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div
            className={cn(
              'flex flex-col overflow-hidden bg-background/20',
              viewMode === 'edit' ? 'col-span-2' : 'col-span-1'
            )}
          >
            <Textarea
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-h-[300px] border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm leading-relaxed p-4 resize-none"
            />
          </div>
        )}

        {/* Right Side: Markdown Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={cn(
              'flex flex-col overflow-y-auto bg-muted/5 p-4',
              viewMode === 'preview' ? 'col-span-2' : 'col-span-1'
            )}
          >
            {value.trim() ? (
              <div className="prose dark:prose-invert max-w-none text-sm break-words leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/60 py-12">
                <Code className="w-8 h-8 mb-2 stroke-[1.5]" />
                <span className="text-xs">Preview will render here...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground bg-muted/10">
        <div>Prompt Mode</div>
        <div className="text-primary/70 font-medium tracking-wide uppercase">Split Pane Editor</div>
      </div>
    </div>
  )
}
