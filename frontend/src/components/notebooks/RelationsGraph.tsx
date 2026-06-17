'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeProps,
  ReactFlowProvider
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useNotes, useUpdateNote, useNodeLayouts, useSaveNodeLayout } from '@/lib/hooks/use-notes'
import { useSources } from '@/lib/hooks/use-sources'
import { useEntityLinks, useCreateEntityLink, useDeleteEntityLink, useSuggestedLinks } from '@/lib/hooks/use-entity-links'
import { useTasks, useCreateTaskSpecLink } from '@/lib/hooks/use-tasks'
import { toast } from 'sonner'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { useNotebook } from '@/lib/hooks/use-notebooks'
import { useCustomer } from '@/lib/hooks/use-customers'
import { useLocation } from '@/lib/hooks/use-locations'
import { useRouter } from 'next/navigation'
import { StickyNote, FileText, BookOpen, Trash2, Link2, Bot, Sparkles, Check, X, Building, MapPin, Plus, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NoteEditorDialog } from '@/app/(dashboard)/notebooks/components/NoteEditorDialog'
import { AddSourceDialog } from '@/components/sources/AddSourceDialog'

// Custom Node component for entity nodes with glassmorphic shades and glowing borders
function EntityGraphNode({ data, selected }: NodeProps) {
  const d = data as any
  const isNotebook = d.type === 'notebook'
  const isNote = d.type === 'note'
  const isCustomer = d.type === 'customer'
  const isLocation = d.type === 'location'
  const isTask = d.type === 'task'
  
  let icon = <FileText className="w-4 h-4 text-cyan-400" />
  let borderStyle = 'border-cyan-500/30 hover:border-cyan-400 bg-gradient-to-br from-cyan-500/5 to-cyan-950/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]'
  
  if (isNotebook) {
    icon = <BookOpen className="w-5 h-5 text-emerald-400 animate-pulse" />
    borderStyle = 'border-emerald-500/50 hover:border-emerald-400 bg-gradient-to-br from-emerald-500/10 to-emerald-950/30 py-4 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]'
  } else if (isNote) {
    icon = <StickyNote className="w-4 h-4 text-violet-400" />
    borderStyle = 'border-violet-500/30 hover:border-violet-400 bg-gradient-to-br from-violet-500/5 to-violet-950/20 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)]'
  } else if (isCustomer) {
    icon = <Building className="w-4 h-4 text-amber-400 animate-bounce [animation-duration:3s]" />
    borderStyle = 'border-amber-500/40 hover:border-amber-300 bg-gradient-to-br from-amber-500/10 to-amber-950/25 shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_22px_rgba(245,158,11,0.25)]'
  } else if (isLocation) {
    icon = <MapPin className="w-4 h-4 text-rose-400 animate-bounce [animation-duration:2.5s]" />
    borderStyle = 'border-rose-500/40 hover:border-rose-300 bg-gradient-to-br from-rose-500/10 to-rose-950/25 shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_22px_rgba(244,63,94,0.25)]'
  } else if (isTask) {
    icon = <ClipboardCheck className="w-4 h-4 text-emerald-400" />
    borderStyle = 'border-emerald-500/30 hover:border-emerald-400 bg-gradient-to-br from-emerald-500/5 to-emerald-950/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]'
  }

  if (selected) {
    borderStyle += ' ring-2 ring-violet-500/50 border-violet-400/80 shadow-[0_0_25px_rgba(139,92,246,0.3)]'
  }

  return (
    <div className={cn(
      "px-3.5 py-3 rounded-xl border bg-card/75 backdrop-blur-md transition-all duration-300 ease-out flex items-center gap-3 min-w-[150px] max-w-[210px] shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] select-none",
      borderStyle
    )}>
      <div className="flex-shrink-0 bg-muted/40 p-2 rounded-lg border border-border/20 shadow-inner">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground truncate leading-tight tracking-tight">
          {d.label}
        </p>
        <p className="text-[8px] font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-80">
          {d.type}
        </p>
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground/30 !w-2 !h-2 hover:!bg-primary transition-colors duration-150" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground/30 !w-2 !h-2 hover:!bg-primary transition-colors duration-150" />
    </div>
  )
}

const nodeTypes = {
  entityNode: EntityGraphNode
}

interface RelationsGraphProps {
  notebookId: string
  notebookName?: string
  onNodeDoubleClick?: (id: string, type: 'note' | 'source' | 'customer' | 'location') => void
}

function RelationsGraphContent({
  notebookId,
  notebookName = 'Current Notebook',
  onNodeDoubleClick
}: RelationsGraphProps) {
  const router = useRouter()
  const { data: notesData } = useNotes(notebookId)
  const { data: sourcesData } = useSources(notebookId)
  const { data: rawLinksData } = useEntityLinks(notebookId)
  const { data: tasksData } = useTasks({ notebook_id: notebookId })

  const notes = useMemo(() => notesData || [], [notesData])
  const sources = useMemo(() => sourcesData || [], [sourcesData])
  const rawLinks = useMemo(() => rawLinksData || [], [rawLinksData])
  const tasks = useMemo(() => tasksData || [], [tasksData])

  // Fetch notebook details to extract parent customer and location
  const { data: notebook } = useNotebook(notebookId)
  const customerId = notebook?.customer_id || ''
  const locationId = notebook?.location_id || ''

  const { data: customer } = useCustomer(customerId, !!customerId)
  const { data: location } = useLocation(locationId, !!locationId)

  const createLink = useCreateEntityLink(notebookId)
  const deleteLink = useDeleteEntityLink(notebookId)
  const updateNote = useUpdateNote()
  const createTaskSpecLink = useCreateTaskSpecLink()

  const { data: layoutsData } = useNodeLayouts('relations')
  const saveLayout = useSaveNodeLayout()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedHierarchyEdge, setSelectedHierarchyEdge] = useState<{
    edgeId: string
    noteId: string
    type: 'customer' | 'location'
  } | null>(null)

  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false)
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false)

  // AI suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [selectedSuggestion, setSelectedSuggestion] = useState<{
    edgeId: string
    sourceId: string
    targetId: string
    reason: string
  } | null>(null)

  const { data: suggestionsData } = useSuggestedLinks(notebookId, showSuggestions)
  const suggestions = useMemo(() => suggestionsData || [], [suggestionsData])
  const { openModal } = useModalManager()

  // Keyboard shortcut listener for 'n' (add note) and 's' (add source)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setIsAddNoteOpen(true)
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        setIsAddSourceOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Recalculate graph nodes and edges on data changes
  useEffect(() => {
    const listNodes: Node[] = []
    const listEdges: Edge[] = []

    const layouts = layoutsData || []
    const getPos = (id: string, defaultX: number, defaultY: number) => {
      const match = layouts.find(l => l.node_id === id)
      return match ? { x: match.x, y: match.y } : { x: defaultX, y: defaultY }
    }

    // 1. Add central notebook node
    const notebookNodeId = `notebook:${notebookId}`
    listNodes.push({
      id: notebookNodeId,
      type: 'entityNode',
      position: getPos(notebookNodeId, 350, 220),
      data: { label: notebookName, type: 'notebook' }
    })

    const actualCustomerIdNode = customerId ? (customerId.startsWith('customer:') ? customerId : `customer:${customerId}`) : ''
    const actualLocationIdNode = locationId ? (locationId.startsWith('location:') ? locationId : `location:${locationId}`) : ''

    // 2. Add customer node if present
    if (customerId && customer && actualCustomerIdNode) {
      listNodes.push({
        id: actualCustomerIdNode,
        type: 'entityNode',
        position: getPos(actualCustomerIdNode, 200, 50),
        data: { label: customer.name || 'Parent Customer', type: 'customer' }
      })
      listEdges.push({
        id: `link-to-cust-${actualCustomerIdNode}`,
        source: actualCustomerIdNode,
        target: notebookNodeId,
        animated: true,
        style: { stroke: 'rgba(245, 158, 11, 0.45)', strokeWidth: 2 },
        data: { isDefault: true }
      })
    }

    // 3. Add location node if present
    if (locationId && location && actualLocationIdNode) {
      listNodes.push({
        id: actualLocationIdNode,
        type: 'entityNode',
        position: getPos(actualLocationIdNode, 500, 50),
        data: { label: location.facility_name || 'Facility Location', type: 'location' }
      })
      listEdges.push({
        id: `link-to-loc-${actualLocationIdNode}`,
        source: notebookNodeId,
        target: actualLocationIdNode,
        animated: true,
        style: { stroke: 'rgba(244, 63, 94, 0.45)', strokeWidth: 2 },
        data: { isDefault: true }
      })
    }

    // Combine notes, sources, and tasks to render in a circle
    const items = [
      ...notes.map(n => ({ id: n.id, label: n.title || 'Untitled Note', type: 'note' as const })),
      ...sources.map(s => ({ id: s.id, label: s.title || 'Untitled Source', type: 'source' as const })),
      ...tasks.map(t => ({ id: t.id, label: t.title || 'Untitled Task', type: 'task' as const }))
    ]

    const totalItems = items.length
    const radius = 220
    const centerX = 350
    const centerY = 220

    items.forEach((item, index) => {
      const angle = (index * 2 * Math.PI) / totalItems
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      // Add node
      listNodes.push({
        id: item.id,
        type: 'entityNode',
        position: getPos(item.id, x, y),
        data: { label: item.label, type: item.type }
      })

      // Add default link to notebook
      listEdges.push({
        id: `link-to-nb-${item.id}`,
        source: notebookNodeId,
        target: item.id,
        animated: false,
        style: { stroke: 'rgba(16, 185, 129, 0.25)', strokeWidth: 1.5 },
        data: { isDefault: true }
      })
    })

    // Add custom entity links from database
    rawLinks.forEach(link => {
      const isTaskSpec = link.link_type === 'task_spec'
      listEdges.push({
        id: link.id,
        source: link.in,
        target: link.out,
        animated: isTaskSpec ? false : true,
        style: isTaskSpec 
          ? { stroke: 'rgba(16, 185, 129, 0.65)', strokeDasharray: '4,4', strokeWidth: 1.5 }
          : { stroke: 'rgba(99, 102, 241, 0.75)', strokeWidth: 2, filter: 'drop-shadow(0px 0px 3px rgba(99, 102, 241, 0.4))' },
        data: { isDefault: false, linkId: link.id, isTaskSpec }
      })
    })

    // Add hierarchy edges Note -> Customer / Location
    notes.forEach(note => {
      const cleanNoteId = note.id.startsWith('note:') ? note.id : `note:${note.id}`
      if (note.customer_id) {
        const targetCustId = note.customer_id.startsWith('customer:') ? note.customer_id : `customer:${note.customer_id}`
        if (actualCustomerIdNode && targetCustId === actualCustomerIdNode) {
          listEdges.push({
            id: `hierarchy-cust-${note.id}`,
            source: targetCustId,
            target: cleanNoteId,
            animated: false,
            style: { stroke: 'rgba(245, 158, 11, 0.45)', strokeDasharray: '4,4', strokeWidth: 1.5 },
            data: { isDefault: false, isHierarchy: true, noteId: note.id, type: 'customer' }
          })
        }
      }
      if (note.location_id) {
        const targetLocId = note.location_id.startsWith('location:') ? note.location_id : `location:${note.location_id}`
        if (actualLocationIdNode && targetLocId === actualLocationIdNode) {
          listEdges.push({
            id: `hierarchy-loc-${note.id}`,
            source: targetLocId,
            target: cleanNoteId,
            animated: false,
            style: { stroke: 'rgba(244, 63, 94, 0.45)', strokeDasharray: '4,4', strokeWidth: 1.5 },
            data: { isDefault: false, isHierarchy: true, noteId: note.id, type: 'location' }
          })
        }
      }
    })

    // Add suggested links as dashed purple edges
    if (showSuggestions) {
      suggestions.forEach(sugg => {
        const suggestionKey = `${sugg.source_id}-${sugg.target_id}`
        if (dismissedSuggestions.has(suggestionKey)) return

        // Verify that both nodes exist in the canvas
        const nodeExists = (id: string) =>
          notes.some(n => n.id === id) || 
          sources.some(src => src.id === id) ||
          id === actualCustomerIdNode ||
          id === customerId ||
          id === actualLocationIdNode ||
          id === locationId

        if (nodeExists(sugg.source_id) && nodeExists(sugg.target_id)) {
          listEdges.push({
            id: `sugg-${suggestionKey}`,
            source: sugg.source_id,
            target: sugg.target_id,
            animated: true,
            style: { stroke: 'rgba(167, 139, 250, 0.6)', strokeWidth: 2, strokeDasharray: '6,6' },
            data: {
              isDefault: false,
              isSuggestion: true,
              reason: sugg.reason,
              sourceId: sugg.source_id,
              targetId: sugg.target_id
            }
          })
        }
      })
    }

    setNodes(listNodes)
    setEdges(listEdges)
  }, [
    notes,
    sources,
    tasks,
    rawLinks,
    notebookId,
    notebookName,
    setNodes,
    setEdges,
    showSuggestions,
    suggestions,
    dismissedSuggestions,
    customerId,
    customer,
    locationId,
    location,
    layoutsData
  ])

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      // Don't link central notebook Node to notebook Node
      if (params.source.startsWith('notebook:') || params.target.startsWith('notebook:')) {
        return
      }

      const sourceIsCust = params.source.startsWith('customer:')
      const targetIsCust = params.target.startsWith('customer:')
      const sourceIsLoc = params.source.startsWith('location:')
      const targetIsLoc = params.target.startsWith('location:')
      
      const sourceIsNote = params.source.startsWith('note:')
      const targetIsNote = params.target.startsWith('note:')

      if ((sourceIsNote && targetIsCust) || (targetIsNote && sourceIsCust)) {
        const noteNodeId = sourceIsNote ? params.source : params.target
        const custNodeId = sourceIsCust ? params.source : params.target
        const cleanCustId = custNodeId.replace('customer:', '')
        
        updateNote.mutate({
          id: noteNodeId,
          data: {
            customer_id: cleanCustId,
            location_id: ''
          }
        })
        toast.success('Linked note to customer')
        return
      }
      
      if ((sourceIsNote && targetIsLoc) || (targetIsNote && sourceIsLoc)) {
        const noteNodeId = sourceIsNote ? params.source : params.target
        const locNodeId = sourceIsLoc ? params.source : params.target
        const cleanLocId = locNodeId.replace('location:', '')
        
        updateNote.mutate({
          id: noteNodeId,
          data: {
            location_id: cleanLocId,
            customer_id: ''
          }
        })
        toast.success('Linked note to location')
        return
      }

      createLink.mutate({ sourceId: params.source, targetId: params.target })
    }
  }, [createLink, updateNote])

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const linkId = (edge.data as any)?.linkId
    if (linkId) {
      setSelectedEdgeId(String(linkId))
      setSelectedSuggestion(null)
      setSelectedHierarchyEdge(null)
    } else if ((edge.data as any)?.isSuggestion) {
      setSelectedSuggestion({
        edgeId: edge.id,
        sourceId: (edge.data as any).sourceId,
        targetId: (edge.data as any).targetId,
        reason: (edge.data as any).reason
      })
      setSelectedEdgeId(null)
      setSelectedHierarchyEdge(null)
    } else if ((edge.data as any)?.isHierarchy) {
      setSelectedHierarchyEdge({
        edgeId: edge.id,
        noteId: (edge.data as any).noteId,
        type: (edge.data as any).type
      })
      setSelectedEdgeId(null)
      setSelectedSuggestion(null)
    } else {
      setSelectedEdgeId(null)
      setSelectedSuggestion(null)
      setSelectedHierarchyEdge(null)
    }
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null)
    setSelectedSuggestion(null)
    setSelectedHierarchyEdge(null)
  }, [])

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    saveLayout.mutate({
      node_id: node.id,
      x: node.position.x,
      y: node.position.y,
      view_type: 'relations'
    })
  }, [saveLayout])

  const handleDeleteSelectedLink = useCallback(() => {
    if (selectedEdgeId) {
      deleteLink.mutate(selectedEdgeId)
      setSelectedEdgeId(null)
    } else if (selectedHierarchyEdge) {
      updateNote.mutate({
        id: selectedHierarchyEdge.noteId,
        data: {
          [selectedHierarchyEdge.type === 'customer' ? 'customer_id' : 'location_id']: ''
        }
      })
      toast.success('Removed link')
      setSelectedHierarchyEdge(null)
    }
  }, [selectedEdgeId, selectedHierarchyEdge, deleteLink, updateNote])

  const handleDismissSuggestion = useCallback((sourceId: string, targetId: string) => {
    const key = `${sourceId}-${targetId}`
    setDismissedSuggestions(prev => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
    setSelectedSuggestion(null)
  }, [])

  const handleAcceptSuggestion = useCallback((sugg: { sourceId: string; targetId: string }) => {
    createLink.mutate({ sourceId: sugg.sourceId, targetId: sugg.targetId })
    handleDismissSuggestion(sugg.sourceId, sugg.targetId)
  }, [createLink, handleDismissSuggestion])

  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    const parts = node.id.split(':')
    const type = parts[0] as 'note' | 'source' | 'customer' | 'location'
    if (type === 'note' || type === 'source') {
      if (onNodeDoubleClick) {
        onNodeDoubleClick(node.id, type)
      } else {
        openModal(type, node.id)
      }
    } else if (type === 'customer') {
      const actualId = parts[1] || node.id
      router.push(`/customers/${actualId}`)
    } else if (type === 'location') {
      router.push('/operations')
    }
  }, [onNodeDoubleClick, openModal, router])

  return (
    <div className="w-full h-full relative flex flex-col">
      {/* Action Header bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/40 p-1.5 rounded-lg shadow-md">
        <span className="text-xs text-muted-foreground px-1.5 flex items-center gap-1.5 select-none">
          <Link2 className="w-3.5 h-3.5" /> Drag lines to relate notes & sources
        </span>

        {/* Add Note Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAddNoteOpen(true)}
          className="h-7 px-2.5 text-[10px] cursor-pointer flex items-center gap-1 transition-all duration-200 hover:bg-muted"
        >
          <Plus className="w-3 h-3" />
          Add Note (N)
        </Button>

        {/* Add Source Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAddSourceOpen(true)}
          className="h-7 px-2.5 text-[10px] cursor-pointer flex items-center gap-1 transition-all duration-200 hover:bg-muted"
        >
          <Plus className="w-3 h-3" />
          Add Source (S)
        </Button>

        {/* Toggle AI Suggestions */}
        <Button
          size="sm"
          variant={showSuggestions ? "default" : "outline"}
          onClick={() => setShowSuggestions(!showSuggestions)}
          className={cn(
            "h-7 px-2.5 text-[10px] cursor-pointer flex items-center gap-1 transition-all duration-200",
            showSuggestions && "bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-sm"
          )}
        >
          <Bot className="w-3 h-3" />
          {showSuggestions ? "Hide Suggestions" : "Show AI Suggestions"}
        </Button>

        {(selectedEdgeId || selectedHierarchyEdge) && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDeleteSelectedLink}
            className="h-7 px-2.5 text-[10px] cursor-pointer flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-150"
          >
            <Trash2 className="w-3 h-3" /> Delete Link
          </Button>
        )}
      </div>

      {/* Suggested link interactive card overlay */}
      {selectedSuggestion && (
        <div className="absolute bottom-3 right-3 z-10 bg-card/95 backdrop-blur-md border border-violet-500/30 p-3 rounded-lg shadow-lg max-w-[280px] flex flex-col gap-2 transition-all duration-150 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 text-violet-400 font-medium text-xs">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>AI Suggested Relation</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {selectedSuggestion.reason}
          </p>
          <div className="flex gap-2 mt-1 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDismissSuggestion(selectedSuggestion.sourceId, selectedSuggestion.targetId)}
              className="h-6 px-2 text-[9px] flex items-center gap-1 hover:bg-muted"
            >
              <X className="w-2.5 h-2.5" />
              Dismiss
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAcceptSuggestion(selectedSuggestion)}
              className="h-6 px-2 text-[9px] bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-700 hover:to-indigo-600 text-white border-0 flex items-center gap-1"
            >
              <Check className="w-2.5 h-2.5" />
              Accept Link
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-[350px] w-full border rounded-lg bg-background/5 dark:bg-background/20 overflow-hidden relative shadow-inner">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))] pointer-events-none z-[1]" />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={handleNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-dot-grid relative z-0"
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>

      <NoteEditorDialog
        open={isAddNoteOpen}
        onOpenChange={setIsAddNoteOpen}
        notebookId={notebookId}
      />

      <AddSourceDialog
        open={isAddSourceOpen}
        onOpenChange={setIsAddSourceOpen}
        defaultNotebookId={notebookId}
      />
    </div>
  )
}

// Background imports dots grid style


export function RelationsGraph(props: RelationsGraphProps) {
  return (
    <ReactFlowProvider>
      <RelationsGraphContent {...props} />
    </ReactFlowProvider>
  )
}
