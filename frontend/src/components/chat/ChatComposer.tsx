'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatComposerProps {
  onSendMessage: (message: string) => void;
  isStreaming?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Isolated ChatComposer component.
 * Encapsulates per-keystroke text input state locally so parent message lists
 * and complex visual components do not re-render on keystrokes.
 */
export const ChatComposer = React.memo(function ChatComposer({
  onSendMessage,
  isStreaming = false,
  placeholder = "Type a message...",
  className,
}: ChatComposerProps) {
  const [inputMessage, setInputMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = inputMessage.trim()
    if (!trimmed || isStreaming) return
    onSendMessage(trimmed)
    setInputMessage('')
  }, [inputMessage, isStreaming, onSendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className={cn("relative flex items-end gap-2 p-2 bg-background/80 backdrop-blur rounded-lg border border-border", className)}>
      <Textarea
        ref={textareaRef}
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="min-h-[44px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
        disabled={isStreaming}
      />
      <Button
        type="button"
        size="icon"
        onClick={handleSend}
        disabled={!inputMessage.trim() || isStreaming}
        className="h-10 w-10 shrink-0 rounded-full"
      >
        {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  )
})
