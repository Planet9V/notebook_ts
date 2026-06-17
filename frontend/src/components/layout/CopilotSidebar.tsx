'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useCopilotStore } from '@/lib/stores/copilot-store'
import { useNotebooks, useNotebook } from '@/lib/hooks/use-notebooks'
import { useNotebookSources } from '@/lib/hooks/use-sources'
import { useNotes } from '@/lib/hooks/use-notes'
import { useNotebookChat } from '@/lib/hooks/useNotebookChat'
import { ChatPanel } from '@/components/source/ChatPanel'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Bot, ChevronRight, ChevronLeft, Brain, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopilotChatWrapperProps {
  notebookId: string
  title: string
}

function CopilotChatWrapper({ notebookId, title }: CopilotChatWrapperProps) {
  const { data: notebook } = useNotebook(notebookId)
  const { sources = [], isLoading: sourcesLoading } = useNotebookSources(notebookId)
  const { data: notes = [], isLoading: notesLoading } = useNotes(notebookId)

  // Default context selections (all full content)
  const contextSelections = useMemo(() => {
    const sSelections: Record<string, 'full'> = {}
    sources.forEach(s => {
      sSelections[s.id] = 'full'
    })
    const nSelections: Record<string, 'full'> = {}
    notes.forEach(n => {
      nSelections[n.id] = 'full'
    })
    return {
      sources: sSelections,
      notes: nSelections
    }
  }, [sources, notes])

  const chat = useNotebookChat({
    notebookId,
    sources,
    notes,
    contextSelections
  })

  const contextStats = useMemo(() => ({
    sourcesInsights: 0,
    sourcesFull: sources.length,
    notesCount: notes.length,
    tokenCount: chat.tokenCount,
    charCount: chat.charCount
  }), [sources, notes, chat.tokenCount, chat.charCount])

  if (sourcesLoading || notesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <span className="text-sm text-muted-foreground animate-pulse">Loading context...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ChatPanel
        title={title}
        contextType="notebook"
        messages={chat.messages}
        isStreaming={chat.isSending}
        contextIndicators={null}
        onSendMessage={(message, modelOverride) => chat.sendMessage(message, modelOverride)}
        modelOverride={chat.currentSession?.model_override ?? chat.pendingModelOverride ?? undefined}
        onModelChange={(model) => chat.setModelOverride(model ?? null)}
        sessions={chat.sessions}
        currentSessionId={chat.currentSessionId}
        onCreateSession={(t) => chat.createSession(t)}
        onSelectSession={chat.switchSession}
        onUpdateSession={(sessionId, t) => chat.updateSession(sessionId, { title: t })}
        onDeleteSession={chat.deleteSession}
        loadingSessions={chat.loadingSessions}
        notebookContextStats={contextStats}
        notebookId={notebookId}
      />
    </div>
  )
}

export function CopilotSidebar() {
  const { isOpen, toggleOpen, setOpen } = useCopilotStore()
  const pathname = usePathname()
  const { data: notebooks = [] } = useNotebooks(false) // Fetch unarchived notebooks

  // 1. Detect page/url context
  const urlNotebookId = useMemo(() => {
    const match = pathname?.match(/\/notebooks\/([^/]+)/)
    return match ? decodeURIComponent(match[1]) : null
  }, [pathname])

  // 2. Selectable notebook ID when not on a specific notebook page
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null)

  // Keep selected notebook synced if url changes
  useEffect(() => {
    if (urlNotebookId) {
      setSelectedNotebookId(urlNotebookId)
    } else if (notebooks.length > 0 && !selectedNotebookId) {
      setSelectedNotebookId(notebooks[0].id)
    }
  }, [urlNotebookId, notebooks, selectedNotebookId])

  const activeNotebook = notebooks.find(n => n.id === selectedNotebookId)
  const activeNotebookName = activeNotebook?.name || 'Notebook AI Agent'

  return (
    <>
      {/* Floating Toggle Button (visible when sidebar is closed) */}
      {!isOpen && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-40 h-11 w-11 rounded-full shadow-xl bg-background/90 backdrop-blur-md border border-primary/20 hover:bg-primary/10 transition-all duration-300 group cursor-pointer"
          title="Open AI Co-Pilot"
        >
          <Bot className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
        </Button>
      )}

      {/* Sidebar Panel */}
      <div className={cn(
        "fixed top-0 right-0 z-50 h-screen w-85 sm:w-96 border-l bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col transition-transform duration-300 ease-out border-border/40",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/10 border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">AI Co-Pilot</h3>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Notebook Selector (only when not inside a specific notebook details page) */}
        {!urlNotebookId && notebooks.length > 0 && (
          <div className="p-3 border-b bg-muted/5 border-border/40 shrink-0 flex flex-col gap-1.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1 select-none">
              <BookOpen className="w-3 h-3" /> Select Chat Context
            </span>
            <Select
              value={selectedNotebookId || undefined}
              onValueChange={setSelectedNotebookId}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a Notebook..." />
              </SelectTrigger>
              <SelectContent>
                {notebooks.map(nb => (
                  <SelectItem key={nb.id} value={nb.id} className="text-xs">
                    {nb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Chat Workspace */}
        {selectedNotebookId ? (
          <CopilotChatWrapper
            key={selectedNotebookId}
            notebookId={selectedNotebookId}
            title={urlNotebookId ? `Co-Pilot: ${activeNotebookName}` : activeNotebookName}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <Bot className="w-12 h-12 mb-3 stroke-[1.5] opacity-40" />
            <p className="text-sm font-medium">No notebook context selected</p>
            <p className="text-xs mt-1 max-w-[200px]">Create or select a notebook context to start chatting.</p>
          </div>
        )}
      </div>
    </>
  )
}
