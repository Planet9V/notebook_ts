'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { NotebookHeader } from '../components/NotebookHeader'
import { SourcesColumn } from '../components/SourcesColumn'
import { NotesColumn } from '../components/NotesColumn'
import { ChatColumn } from '../components/ChatColumn'
import { B2BDraftingWorkspace } from '../components/B2BDraftingWorkspace'
import { useNotebook } from '@/lib/hooks/use-notebooks'
import { useNotebookSources } from '@/lib/hooks/use-sources'
import { useNotes } from '@/lib/hooks/use-notes'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DataPageSkeleton } from '@/components/common/DataPageSkeleton'
import { useNotebookColumnsStore } from '@/lib/stores/notebook-columns-store'
import { useIsDesktop } from '@/lib/hooks/use-media-query'
import { useTranslation } from '@/lib/hooks/use-translation'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, StickyNote, MessageSquare, Mic } from 'lucide-react'
import { VoiceChatPanel } from '@/components/voice/VoiceChatPanel'
import { Button } from '@/components/ui/button'
import { useBreadcrumbLabel } from '@/lib/hooks/use-breadcrumb-label'

export type ContextMode = 'off' | 'insights' | 'full'

export interface ContextSelections {
  sources: Record<string, ContextMode>
  notes: Record<string, ContextMode>
}

export default function NotebookPage() {
  const { t } = useTranslation()
  const params = useParams()

  // Ensure the notebook ID is properly decoded from URL
  const notebookId = params?.id ? decodeURIComponent(params.id as string) : ''

  const { data: notebook, isLoading: notebookLoading } = useNotebook(notebookId)
  const {
    sources,
    isLoading: sourcesLoading,
    refetch: refetchSources,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotebookSources(notebookId)
  const { data: notes, isLoading: notesLoading } = useNotes(notebookId)

  // Set human-readable breadcrumb label
  useBreadcrumbLabel(notebook?.name)

  useEffect(() => {
    document.title = notebook?.name ? `${notebook.name} | Tetrel` : 'Notebook | Tetrel'
  }, [notebook?.name])

  // Get collapse states for dynamic layout
  const { sourcesCollapsed, notesCollapsed } = useNotebookColumnsStore()

  // Detect desktop to avoid double-mounting ChatColumn
  const isDesktop = useIsDesktop()

  // Mobile tab state (Sources, Notes, Chat, or Voice)
  const [mobileActiveTab, setMobileActiveTab] = useState<'sources' | 'notes' | 'chat' | 'voice'>('chat')

  // B2B Drafting Mode toggle
  const [isB2BMode, setIsB2BMode] = useState<boolean>(false)

  // Voice panel state (desktop overlay)
  const [showVoicePanel, setShowVoicePanel] = useState(false)

  // Context selection state
  const [contextSelections, setContextSelections] = useState<ContextSelections>({
    sources: {},
    notes: {}
  })

  // Initialize and update selections when sources load or change
  useEffect(() => {
    if (sources && sources.length > 0) {
      setContextSelections(prev => {
        const newSourceSelections = { ...prev.sources }
        sources.forEach(source => {
          const currentMode = newSourceSelections[source.id]
          const hasInsights = source.insights_count > 0

          if (currentMode === undefined) {
            // Initial setup - default based on insights availability
            newSourceSelections[source.id] = hasInsights ? 'insights' : 'full'
          } else if (currentMode === 'full' && hasInsights) {
            // Source gained insights while in 'full' mode - auto-switch to 'insights'
            newSourceSelections[source.id] = 'insights'
          }
        })
        return { ...prev, sources: newSourceSelections }
      })
    }
  }, [sources])

  useEffect(() => {
    if (notes && notes.length > 0) {
      setContextSelections(prev => {
        const newNoteSelections = { ...prev.notes }
        notes.forEach(note => {
          // Only set default if not already set
          if (!(note.id in newNoteSelections)) {
            // Notes default to 'full'
            newNoteSelections[note.id] = 'full'
          }
        })
        return { ...prev, notes: newNoteSelections }
      })
    }
  }, [notes])

  // Handler to update context selection
  const handleContextModeChange = (itemId: string, mode: ContextMode, type: 'source' | 'note') => {
    setContextSelections(prev => ({
      ...prev,
      [type === 'source' ? 'sources' : 'notes']: {
        ...(type === 'source' ? prev.sources : prev.notes),
        [itemId]: mode
      }
    }))
  }

  if (notebookLoading) {
    return (
      <AppShell>
        <div className="flex-1 p-6">
          <DataPageSkeleton layout="detail" />
        </div>
      </AppShell>
    )
  }

  if (!notebook) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">{t('notebooks.notFound')}</h1>
          <p className="text-muted-foreground">{t('notebooks.notFoundDesc')}</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 p-6 pb-0">
          <NotebookHeader 
            notebook={notebook} 
            isB2BMode={isB2BMode}
            onToggleB2BMode={() => setIsB2BMode(!isB2BMode)}
          />
        </div>

        <div className="flex-1 p-6 pt-2 overflow-hidden flex flex-col min-h-0">
          {/* If B2B Drafting Workspace is active, override both mobile & desktop column views with the unified drafting workspace */}
          {isB2BMode ? (
            <B2BDraftingWorkspace
              notebookId={notebookId}
              notebookName={notebook.name}
              notebookDescription={notebook.description || ''}
              sources={sources || []}
              contacts={notebook.contacts || []}
            />
          ) : (
            <>
              {/* Mobile: Tabbed interface - only render on mobile to avoid double-mounting */}
              {!isDesktop && (
                <>
                  <div className="lg:hidden mb-4">
                    <Tabs value={mobileActiveTab} onValueChange={(value) => setMobileActiveTab(value as 'sources' | 'notes' | 'chat' | 'voice')}>
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="sources" className="gap-2">
                          <FileText className="h-4 w-4" />
                          {t('navigation.sources')}
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="gap-2">
                          <StickyNote className="h-4 w-4" />
                          {t('common.notes')}
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="gap-2">
                          <MessageSquare className="h-4 w-4" />
                          {t('common.chat')}
                        </TabsTrigger>
                        <TabsTrigger value="voice" className="gap-2">
                          <Mic className="h-4 w-4" />
                          Voice
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Mobile: Show only active tab */}
                  <div className="flex-1 overflow-hidden lg:hidden">
                    {mobileActiveTab === 'sources' && (
                      <SourcesColumn
                        sources={sources}
                        isLoading={sourcesLoading}
                        notebookId={notebookId}
                        notebookName={notebook?.name}
                        onRefresh={refetchSources}
                        contextSelections={contextSelections.sources}
                        onContextModeChange={(sourceId, mode) => handleContextModeChange(sourceId, mode, 'source')}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        fetchNextPage={fetchNextPage}
                      />
                    )}
                    {mobileActiveTab === 'notes' && (
                      <NotesColumn
                        notes={notes}
                        isLoading={notesLoading}
                        notebookId={notebookId}
                        contextSelections={contextSelections.notes}
                        onContextModeChange={(noteId, mode) => handleContextModeChange(noteId, mode, 'note')}
                      />
                    )}
                    {mobileActiveTab === 'chat' && (
                      <ChatColumn
                        notebookId={notebookId}
                        contextSelections={contextSelections}
                        sources={sources}
                        sourcesLoading={sourcesLoading}
                      />
                    )}
                    {mobileActiveTab === 'voice' && (
                      <div className="flex-1 overflow-hidden">
                        <VoiceChatPanel
                          context={{
                            notebookId: notebookId,
                            pageType: 'notebook',
                            contextLabel: notebook?.name || 'Notebook',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Desktop: Collapsible columns layout */}
              <div className={cn(
                'hidden lg:flex h-full min-h-0 gap-6 transition-all duration-150',
                'flex-row'
              )}>
                {/* Sources Column */}
                <div className={cn(
                  'transition-all duration-150',
                  sourcesCollapsed ? 'w-12 flex-shrink-0' : 'flex-none basis-1/3'
                )}>
                  <SourcesColumn
                    sources={sources}
                    isLoading={sourcesLoading}
                    notebookId={notebookId}
                    notebookName={notebook?.name}
                    onRefresh={refetchSources}
                    contextSelections={contextSelections.sources}
                    onContextModeChange={(sourceId, mode) => handleContextModeChange(sourceId, mode, 'source')}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    fetchNextPage={fetchNextPage}
                  />
                </div>

                {/* Notes Column */}
                <div className={cn(
                  'transition-all duration-150',
                  notesCollapsed ? 'w-12 flex-shrink-0' : 'flex-none basis-1/3'
                )}>
                  <NotesColumn
                    notes={notes}
                    isLoading={notesLoading}
                    notebookId={notebookId}
                    contextSelections={contextSelections.notes}
                    onContextModeChange={(noteId, mode) => handleContextModeChange(noteId, mode, 'note')}
                  />
                </div>

                {/* Chat Column - always expanded, takes remaining space */}
                <div className="transition-all duration-150 flex-1 min-w-0 lg:pr-6 lg:-mr-6 relative">
                  <ChatColumn
                    notebookId={notebookId}
                    contextSelections={contextSelections}
                    sources={sources}
                    sourcesLoading={sourcesLoading}
                  />

                  {/* Voice Panel Toggle Button */}
                  <Button
                    variant={showVoicePanel ? 'default' : 'outline'}
                    size="icon"
                    className="absolute bottom-4 right-4 z-10 h-12 w-12 rounded-full shadow-lg"
                    onClick={() => setShowVoicePanel(!showVoicePanel)}
                    aria-label={showVoicePanel ? 'Close voice chat' : 'Open voice chat'}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>

                  {/* Voice Panel Overlay */}
                  {showVoicePanel && (
                    <div className="absolute bottom-20 right-4 z-20 w-[400px] max-h-[500px] shadow-2xl rounded-xl overflow-hidden border bg-background">
                      <VoiceChatPanel
                        context={{
                          notebookId: notebookId,
                          pageType: 'notebook',
                          contextLabel: notebook?.name || 'Notebook',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
