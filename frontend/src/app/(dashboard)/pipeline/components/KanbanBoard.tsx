'use client'

import { useState, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { NotebookResponse } from '@/lib/types/api'
import { useUpdateNotebook } from '@/lib/hooks/use-notebooks'
import { useTranslation } from '@/lib/hooks/use-translation'
import { PIPELINE_STAGES, STAGE_LABELS, PipelineStage } from '@/lib/constants/stages'
import { toast } from 'sonner'
import { CreateNotebookDialog } from '@/components/notebooks/CreateNotebookDialog'
import { DealDrawer } from './DealDrawer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  Book,
  Plus,
  DollarSign,
  Building,
  Calendar,
  Sparkles,
  RefreshCw,
  Upload,
  DatabaseZap,
} from 'lucide-react'
import { useNotebookScanningStatus } from '@/lib/hooks/use-pipeline'

interface KanbanBoardProps {
  notebooks: NotebookResponse[]
}

interface Column {
  id: string
  title: string
  colorClass: string
  borderClass: string
  badgeClass: string
}

interface DealCardProps {
  nb: NotebookResponse
  index: number
  onClick: () => void
  t: any
}

function DealCard({ nb, index, onClick, t }: DealCardProps) {
  const { data: status } = useNotebookScanningStatus(nb.id)

  return (
    <Draggable key={nb.id} draggableId={nb.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          style={provided.draggableProps.style}
          className={`bg-background/85 hover:bg-background border-sidebar-border hover:border-muted-foreground/30 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 select-none group relative ${
            snapshot.isDragging ? 'shadow-xl scale-102 border-primary rotate-1' : ''
          }`}
        >
          <CardContent className="p-3 space-y-3">
            {/* Deal name and client name */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                <Building className="h-3 w-3" />
                <span className="truncate max-w-[140px]" title={nb.client_name || 'Unnamed Client'}>
                  {nb.client_name || t('pipeline.unnamedClient', 'Unnamed Client')}
                </span>
              </div>
              <h4 className="font-bold text-sm text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                {nb.name}
              </h4>
            </div>

            {/* Deal Value Display */}
            <div className="flex items-center gap-0.5 text-base font-bold text-foreground font-mono tracking-tight">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>
                {nb.estimated_value?.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }) || '0'}
              </span>
              
              {/* RAG Research indicators */}
              {(nb.source_count > 0 || nb.note_count > 0) && (
                <div className="ml-auto flex items-center gap-2 shrink-0 pr-1">
                  {nb.source_count > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-medium" title={`${nb.source_count} connected sources`}>
                      <FileText className="h-3 w-3 text-primary/80" />
                      {nb.source_count}
                    </span>
                  )}
                  {nb.note_count > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-medium" title={`${nb.note_count} connected notes`}>
                      <Book className="h-3 w-3 text-violet-400/80" />
                      {nb.note_count}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Sparkle prompt RAG helper icon */}
            {nb.source_count > 0 && (
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-primary/10 rounded-full p-1 border border-primary/20 text-primary">
                <Sparkles className="h-3 w-3 animate-pulse" />
              </div>
            )}

            {/* Date Footer & Scanning Status */}
            <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono pt-2 border-t border-sidebar-border/10">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(nb.updated).toLocaleDateString()}</span>
              </div>
              {status?.scanning && (
                <Badge variant="outline" className="text-[9px] font-semibold text-primary bg-primary/5 border-primary/20 animate-pulse px-1.5 py-0.5 flex items-center gap-1">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin text-primary" />
                  <span>Researching...</span>
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  )
}

export function KanbanBoard({ notebooks }: KanbanBoardProps) {
  const { t } = useTranslation()
  const updateNotebook = useUpdateNotebook()

  // Local state for optimistic UI updates during drags
  const [boardData, setBoardData] = useState<Record<string, NotebookResponse[]>>(
    () => Object.fromEntries(PIPELINE_STAGES.map((s) => [s, []]))
  )

  // Selected deal for drawer
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Create notebook modal settings
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedStageForNewNotebook, setSelectedStageForNewNotebook] = useState<string>('lead')

  const STAGE_COLORS: Record<PipelineStage, { colorClass: string; borderClass: string; badgeClass: string }> = {
    bulk_import: {
      colorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
      borderClass: 'border-t-slate-500',
      badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    },
    data_enrichment: {
      colorClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      borderClass: 'border-t-orange-500',
      badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    },
    lead: {
      colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      borderClass: 'border-t-amber-500',
      badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    },
    research: {
      colorClass: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
      borderClass: 'border-t-cyan-500',
      badgeClass: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    },
    technical_discovery: {
      colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      borderClass: 'border-t-blue-500',
      badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    proposal: {
      colorClass: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
      borderClass: 'border-t-violet-500',
      badgeClass: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    },
    won: {
      colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      borderClass: 'border-t-emerald-500',
      badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    },
  }

  const STAGE_TITLES: Record<PipelineStage, string> = {
    bulk_import: 'Import Staging',
    data_enrichment: 'Data Enrichment',
    lead: 'Leads Prospecting',
    research: 'Client Research',
    technical_discovery: 'Technical Discovery',
    proposal: 'Proposal Drafts',
    won: 'Contract Won',
  }

  const STAGE_EMPTY_MSG: Record<PipelineStage, string> = {
    bulk_import: 'No imported records',
    data_enrichment: 'No records enriching',
    lead: 'No active dossiers',
    research: 'No active dossiers',
    technical_discovery: 'No active dossiers',
    proposal: 'No active dossiers',
    won: 'No active dossiers',
  }

  const columns: Column[] = useMemo(() =>
    PIPELINE_STAGES.map((stage) => ({
      id: stage,
      title: t(`pipeline.stage.${stage}`, STAGE_TITLES[stage]),
      ...STAGE_COLORS[stage],
    })),
  [t])

  // Categorize notebooks into columns whenever they update from server queries
  useEffect(() => {
    const categorized: Record<string, NotebookResponse[]> = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s, []])
    )

    notebooks.forEach((nb) => {
      if (nb.archived) return
      const stage = nb.stage || 'lead'
      if (categorized[stage]) {
        categorized[stage].push(nb)
      } else {
        categorized['lead'].push(nb) // Fallback to Lead column
      }
    })

    setBoardData(categorized)
  }, [notebooks])

  // Compute total estimated deal values per column
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s, 0])
    )
    Object.keys(boardData).forEach((colId) => {
      totals[colId] = boardData[colId].reduce((sum, nb) => sum + (nb.estimated_value || 0), 0)
    })
    return totals
  }, [boardData])

  // Handle Drag End event
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    // 1. Dropped outside any valid Droppable column
    if (!destination) return

    // 2. Dropped in the exact same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceColId = source.droppableId
    const destColId = destination.droppableId

    // 3. Optimistic local UI State Mutation
    const updatedBoard = { ...boardData }
    const sourceItems = [...updatedBoard[sourceColId]]
    const destItems = sourceColId === destColId ? sourceItems : [...updatedBoard[destColId]]

    // Find the dragged card item
    const [draggedItem] = sourceItems.splice(source.index, 1)
    
    // Update its stage property optimistically
    const updatedItem = { ...draggedItem, stage: destColId }

    // Insert into destination list
    destItems.splice(destination.index, 0, updatedItem)

    // Apply back to state
    updatedBoard[sourceColId] = sourceItems
    if (sourceColId !== destColId) {
      updatedBoard[destColId] = destItems
    }
    setBoardData(updatedBoard)

    // 4. Trigger backend PATCH / PUT API Mutation via useUpdateNotebook
    try {
      await updateNotebook.mutateAsync({
        id: draggableId,
        data: { stage: destColId },
      })
    } catch (error) {
      console.error('Failed to update stage on server, reverting board state.', error)
      toast.error('Failed to move deal — reverted')
      // Rollback to original sync state by re-triggering from prop notebooks
      const rollback: Record<string, NotebookResponse[]> = Object.fromEntries(
        PIPELINE_STAGES.map((s) => [s, []])
      )
      notebooks.forEach((nb) => {
        if (nb.archived) return
        const stage = nb.stage || 'lead'
        if (rollback[stage]) rollback[stage].push(nb)
      })
      setBoardData(rollback)
    }
  }

  // Open deal drawer sideover pane
  const handleCardClick = (id: string) => {
    setActiveNotebookId(id)
    setDrawerOpen(true)
  }

  // Open Create Notebook pre-categorized dialog
  const openCreateDialog = (stageId: string) => {
    setSelectedStageForNewNotebook(stageId)
    setCreateDialogOpen(true)
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Board Canvas */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[1400px] gap-4 items-start h-[calc(100vh-270px)] min-h-[500px]">
          {columns.map((col) => (
            <div
              key={col.id}
              className="flex flex-col bg-background/30 border border-sidebar-border rounded-xl p-3 h-full overflow-hidden shadow-sm backdrop-blur-sm relative"
            >
              {/* Column Top Indicator Ribbon */}
              <div className={`absolute top-0 left-0 right-0 h-1 border-t-2 ${col.borderClass}`} />

              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mt-1.5 px-1 shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                  <h3 className="font-semibold text-sm truncate text-foreground" title={col.title}>
                    {col.title}
                  </h3>
                  <Badge variant="outline" className={`font-mono text-[10px] shrink-0 ${col.badgeClass}`}>
                    {boardData[col.id]?.length || 0}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openCreateDialog(col.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 rounded-md"
                  aria-label={`Add deal to ${col.title}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Column Total Dollar Value display */}
              <div className="px-1 pb-3 text-xs font-semibold text-muted-foreground font-mono shrink-0 flex items-center gap-1 border-b border-sidebar-border/50">
                <span>Value:</span>
                <span className="text-foreground tracking-tight">
                  ${columnTotals[col.id].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Column Droppable Drag Area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <ScrollArea
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto mt-3 rounded-lg pr-1.5 transition-colors duration-200 ${
                      snapshot.isDraggingOver ? 'bg-sidebar-accent/25' : ''
                    }`}
                  >
                    <div className="space-y-3 pb-4 min-h-[150px]">
                      {boardData[col.id]?.map((nb, index) => (
                        <DealCard
                          key={nb.id}
                          nb={nb}
                          index={index}
                          onClick={() => handleCardClick(nb.id)}
                          t={t}
                        />
                      ))}
                      {provided.placeholder}
                      
                      {/* Empty Column Guidance */}
                      {(!boardData[col.id] || boardData[col.id].length === 0) && (
                        <div className="flex flex-col items-center justify-center border border-dashed border-sidebar-border rounded-xl p-6 text-center text-muted-foreground mt-4 h-32 shrink-0">
                          {col.id === 'bulk_import' ? (
                            <Upload className="h-6 w-6 mb-1 opacity-20 text-slate-400" />
                          ) : col.id === 'data_enrichment' ? (
                            <DatabaseZap className="h-6 w-6 mb-1 opacity-20 text-orange-400" />
                          ) : (
                            <Plus className="h-6 w-6 mb-1 opacity-20 text-primary" />
                          )}
                          <p className="text-[11px] font-semibold">{STAGE_EMPTY_MSG[col.id as PipelineStage]}</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => openCreateDialog(col.id)}
                            className="text-[10px] text-primary p-0 h-auto mt-1"
                          >
                            + Add Deal
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </Droppable>
            </div>
          ))}
        </div>
        </div>
      </DragDropContext>

      {/* Global pre-categorized Create Notebook Dialog */}
      <CreateNotebookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultStage={selectedStageForNewNotebook}
      />

      {/* Slide-over Deal Details & RAG Chat Drawer */}
      <DealDrawer
        notebookId={activeNotebookId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}
