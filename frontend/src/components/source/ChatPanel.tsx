'use client'

import { useState, useRef, useEffect, useId, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Bot, User, Send, Loader2, FileText, Lightbulb, StickyNote, Clock, Search, FilePlus, LayoutDashboard, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import {
  SourceChatMessage,
  SourceChatContextIndicator,
  BaseChatSession
} from '@/lib/types/api'
import { ModelSelector } from './ModelSelector'
import { ContextIndicator } from '@/components/common/ContextIndicator'
import { SessionManager } from '@/components/source/SessionManager'
import { MessageActions } from '@/components/source/MessageActions'
import { convertReferencesToCompactMarkdown, createCompactReferenceLinkComponent } from '@/lib/utils/source-references'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/hooks/use-translation'
import { ResearchDashboard } from '@/components/notebooks/ResearchDashboard'
import { PlanningDashboard } from '@/components/notebooks/PlanningDashboard'

interface NotebookContextStats {
  sourcesInsights: number
  sourcesFull: number
  notesCount: number
  tokenCount?: number
  charCount?: number
}

interface ChatPanelProps {
  messages: SourceChatMessage[]
  isStreaming: boolean
  contextIndicators: SourceChatContextIndicator | null
  onSendMessage: (message: string, modelOverride?: string) => void
  modelOverride?: string
  onModelChange?: (model?: string) => void
  // Session management props
  sessions?: BaseChatSession[]
  currentSessionId?: string | null
  onCreateSession?: (title: string) => void
  onSelectSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onUpdateSession?: (sessionId: string, title: string) => void
  loadingSessions?: boolean
  // Generic props for reusability
  title?: string
  contextType?: 'source' | 'notebook'
  // Notebook context stats (for notebook chat)
  notebookContextStats?: NotebookContextStats
  // Notebook ID for saving notes
  notebookId?: string
}

export function ChatPanel({
  messages,
  isStreaming,
  contextIndicators,
  onSendMessage,
  modelOverride,
  onModelChange,
  sessions = [],
  currentSessionId,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  onUpdateSession,
  loadingSessions = false,
  title,
  contextType = 'source',
  notebookContextStats,
  notebookId
}: ChatPanelProps) {
  const { t } = useTranslation()
  const chatInputId = useId()
  const [input, setInput] = useState('')
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { openModal } = useModalManager()

  // Commands lookup list
  const ALL_COMMANDS = useMemo(() => [
    { value: '/deep-research ', label: '/deep-research <query>', desc: 'Run deep search and compile a detailed report', icon: Search },
    { value: '/planning-with-files init', label: '/planning-with-files init', desc: 'Create planning notes (task_plan, findings, progress)', icon: FilePlus },
    { value: '/planning-with-files status', label: '/planning-with-files status', desc: 'Show visual dashboard of roadmap checklist state', icon: LayoutDashboard },
    { value: '/planning-with-files sync', label: '/planning-with-files sync', desc: 'Sync tasks bidirectionally with markdown checklist', icon: RefreshCw }
  ], [])

  const filteredCommands = useMemo(() => {
    if (!input.startsWith('/')) return []
    return ALL_COMMANDS.filter(cmd => 
      cmd.value.toLowerCase().startsWith(input.toLowerCase()) ||
      input.toLowerCase().startsWith(cmd.value.split(' ')[0].toLowerCase())
    )
  }, [input, ALL_COMMANDS])

  const selectCommand = (cmdValue: string) => {
    setInput(cmdValue)
    setShowAutocomplete(false)
    setActiveIndex(0)
    const inputEl = document.getElementById(chatInputId)
    if (inputEl) {
      inputEl.focus()
    }
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    if (val.startsWith('/')) {
      setShowAutocomplete(true)
      setActiveIndex(0)
    } else {
      setShowAutocomplete(false)
    }
  }

  const handleReferenceClick = (type: string, id: string) => {
    const modalType = type === 'source_insight' ? 'insight' : type as 'source' | 'note' | 'insight'

    try {
      openModal(modalType, id)
      // Note: The modal system uses URL parameters and doesn't throw errors for missing items.
      // The modal component itself will handle displaying "not found" states.
      // This try-catch is here for future enhancements or unexpected errors.
    } catch {
      toast.error(t('common.noResults'))
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      onSendMessage(input.trim(), modelOverride)
      setInput('')
      setShowAutocomplete(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showAutocomplete && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % filteredCommands.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectCommand(filteredCommands[activeIndex].value)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowAutocomplete(false)
        return
      }
    }

    // Detect platform for correct modifier key
    const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
    const isModifierPressed = isMac ? e.metaKey : e.ctrlKey

    if (e.key === 'Enter' && isModifierPressed) {
      e.preventDefault()
      handleSend()
    }
  }

  // Detect platform for placeholder text
  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
  const keyHint = isMac ? '⌘+Enter' : 'Ctrl+Enter'

  return (
    <>
    <Card className="flex flex-col h-full flex-1 overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {title || (contextType === 'source' ? t('chat.chatWith').replace('{name}', t('navigation.sources')) : t('chat.chatWith').replace('{name}', t('common.notebook')))}
          </CardTitle>
          {onSelectSession && onCreateSession && onDeleteSession && (
            <Dialog open={sessionManagerOpen} onOpenChange={setSessionManagerOpen}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setSessionManagerOpen(true)}
                disabled={loadingSessions}
              >
                <Clock className="h-4 w-4" />
                <span className="text-xs">{t('chat.sessions')}</span>
              </Button>
              <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
                <DialogTitle className="sr-only">{t('chat.sessionsTitle')}</DialogTitle>
                <SessionManager
                  sessions={sessions}
                  currentSessionId={currentSessionId ?? null}
                  onCreateSession={(title) => onCreateSession?.(title)}
                  onSelectSession={(sessionId) => {
                    onSelectSession(sessionId)
                    setSessionManagerOpen(false)
                  }}
                  onUpdateSession={(sessionId, title) => onUpdateSession?.(sessionId, title)}
                  onDeleteSession={(sessionId) => onDeleteSession?.(sessionId)}
                  loadingSessions={loadingSessions}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <ScrollArea className="flex-1 min-h-0 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  {t('chat.startConversation').replace('{type}', contextType === 'source' ? t('navigation.sources') : t('common.notebook'))}
                </p>
                <p className="text-xs mt-2">{t('chat.askQuestions')}</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.type === 'human' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.type === 'ai' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.type === 'human'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.type === 'ai' ? (
                        <AIMessageContent
                          content={message.content}
                          onReferenceClick={handleReferenceClick}
                          onSendMessage={onSendMessage}
                          isStreaming={isStreaming}
                        />
                      ) : (
                        <p className="text-sm break-all">{message.content}</p>
                      )}
                    </div>
                    {message.type === 'ai' && (
                      <MessageActions
                        content={message.content}
                        notebookId={notebookId}
                      />
                    )}
                  </div>
                  {message.type === 'human' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {isStreaming && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                </div>
                <div className="rounded-lg px-4 py-2 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Context Indicators */}
        {contextIndicators && (
          <div className="border-t px-4 py-2">
            <div className="flex flex-wrap gap-2 text-xs">
              {contextIndicators.sources?.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {contextIndicators.sources.length} {t('navigation.sources')}
                </Badge>
              )}
              {contextIndicators.insights?.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Lightbulb className="h-3 w-3" />
                  {contextIndicators.insights.length} {contextIndicators.insights.length === 1 ? t('common.insight') : t('common.insights')}
                </Badge>
              )}
              {contextIndicators.notes?.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <StickyNote className="h-3 w-3" />
                  {contextIndicators.notes.length} {contextIndicators.notes.length === 1 ? t('common.note') : t('common.notes')}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Notebook Context Indicator */}
        {notebookContextStats && (
          <ContextIndicator
            sourcesInsights={notebookContextStats.sourcesInsights}
            sourcesFull={notebookContextStats.sourcesFull}
            notesCount={notebookContextStats.notesCount}
            tokenCount={notebookContextStats.tokenCount}
            charCount={notebookContextStats.charCount}
          />
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 space-y-3 border-t relative">
          {/* Autocomplete command menu */}
          {showAutocomplete && filteredCommands.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-card/95 border border-border/80 shadow-2xl rounded-xl p-1.5 z-50 backdrop-blur-lg max-h-[220px] overflow-y-auto">
              <div className="text-[10px] text-muted-foreground px-3 py-1.5 font-bold uppercase tracking-wider border-b border-border/30 mb-1">
                Chat Commands
              </div>
              <div className="space-y-0.5">
                {filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon
                  const isActive = idx === activeIndex
                  return (
                    <div
                      key={cmd.value}
                      onClick={() => selectCommand(cmd.value)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 select-none border border-transparent",
                        isActive 
                          ? "bg-primary/15 border-primary/20 text-foreground" 
                          : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-md border mt-0.5",
                        isActive ? "bg-primary/25 border-primary/30" : "bg-muted/40 border-border/20"
                      )}>
                        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-semibold tracking-tight", isActive ? "text-cyan-300" : "text-foreground")}>
                          {cmd.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-medium">
                          {cmd.desc}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Model selector */}
          {onModelChange && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('chat.model')}</span>
              <ModelSelector
                currentModel={modelOverride}
                onModelChange={onModelChange}
                disabled={isStreaming}
              />
            </div>
          )}

          <div className="flex gap-2 items-end min-w-0">
            <Textarea
              id={chatInputId}
              name="chat-message"
              autoComplete="off"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`${t('chat.sendPlaceholder')} (${t('chat.pressToSend').replace('{key}', keyHint)})`}
              disabled={isStreaming}
              className="flex-1 min-h-[40px] max-h-[100px] resize-none py-2 px-3 min-w-0"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="h-[40px] w-[40px] flex-shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    </>
  )
}

interface ParsedBlock {
  type: 'text' | 'research' | 'planning'
  content: string
  attrs: Record<string, string>
}

function parseMessageContent(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  let lastIndex = 0

  // Regex to match research_result or planning_status tags
  const tagRegex = /<(research_result|planning_status)([^>]*)>([\s\S]*?)<\/\1>/g
  let match

  while ((match = tagRegex.exec(text)) !== null) {
    const matchIndex = match.index
    const [fullMatch, tagName, attrString, innerContent] = match

    // Add preceding text block if any
    if (matchIndex > lastIndex) {
      blocks.push({
        type: 'text',
        content: text.slice(lastIndex, matchIndex),
        attrs: {}
      })
    }

    // Parse attributes
    const attrs: Record<string, string> = {}
    const attrRegex = /(\w+)='([^']*)'|(\w+)="([^"]*)"/g
    let attrMatch
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      const name = attrMatch[1] || attrMatch[3]
      const value = attrMatch[2] || attrMatch[4]
      if (name) {
        attrs[name] = value
      }
    }

    blocks.push({
      type: tagName === 'research_result' ? 'research' : 'planning',
      content: innerContent,
      attrs
    })

    lastIndex = tagRegex.lastIndex
  }

  // Add trailing text block if any
  if (lastIndex < text.length) {
    blocks.push({
      type: 'text',
      content: text.slice(lastIndex),
      attrs: {}
    })
  }

  // If no match found at all, return the whole text as a single text block
  if (blocks.length === 0) {
    blocks.push({
      type: 'text',
      content: text,
      attrs: {}
    })
  }

  return blocks
}

// Helper component to render AI messages with clickable references and custom dashboards
function AIMessageContent({
  content,
  onReferenceClick,
  onSendMessage,
  isStreaming
}: {
  content: string
  onReferenceClick: (type: string, id: string) => void
  onSendMessage: (message: string) => void
  isStreaming?: boolean
}) {
  const { t } = useTranslation()
  const blocks = useMemo(() => parseMessageContent(content), [content])

  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => {
        if (block.type === 'research') {
          return (
            <ResearchDashboard
              key={idx}
              sourceId={block.attrs.source_id || ''}
              content={block.content}
              onReferenceClick={onReferenceClick}
            />
          )
        }
        if (block.type === 'planning') {
          return (
            <PlanningDashboard
              key={idx}
              planId={block.attrs.plan_id || ''}
              findingsId={block.attrs.findings_id || ''}
              progressId={block.attrs.progress_id || ''}
              content={block.content}
              onReferenceClick={onReferenceClick}
              onSendMessage={onSendMessage}
              isStreaming={isStreaming}
            />
          )
        }

        // Default text block
        const markdownWithCompactRefs = convertReferencesToCompactMarkdown(block.content, t('common.references'))
        const LinkComponent = createCompactReferenceLinkComponent(onReferenceClick)

        return (
          <div key={idx} className="prose prose-sm prose-neutral dark:prose-invert max-w-none break-words prose-headings:font-semibold prose-a:text-blue-600 prose-a:break-all prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-p:mb-4 prose-p:leading-7 prose-li:mb-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: LinkComponent,
                p: ({ children }) => <p className="mb-4">{children}</p>,
                h1: ({ children }) => <h1 className="mb-4 mt-6">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-3 mt-5">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-3 mt-4">{children}</h3>,
                h4: ({ children }) => <h4 className="mb-2 mt-4">{children}</h4>,
                h5: ({ children }) => <h5 className="mb-2 mt-3">{children}</h5>,
                h6: ({ children }) => <h6 className="mb-2 mt-3">{children}</h6>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                ul: ({ children }) => <ul className="mb-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="mb-4 space-y-1">{children}</ol>,
                table: ({ children }) => (
                  <div className="my-4 overflow-x-auto">
                    <table className="min-w-full border-collapse border border-border">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
                th: ({ children }) => <th className="border border-border px-3 py-2 text-left font-semibold">{children}</th>,
                td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
              }}
            >
              {markdownWithCompactRefs}
            </ReactMarkdown>
          </div>
        )
      })}
    </div>
  )
}
