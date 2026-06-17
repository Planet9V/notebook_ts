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
import { useNotes } from '@/lib/hooks/use-notes'
import { useSources } from '@/lib/hooks/use-sources'
import { useEntityLinks, useCreateEntityLink, useDeleteEntityLink } from '@/lib/hooks/use-entity-links'
import { StickyNote, FileText, BookOpen, Trash2, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Custom Node component for entity nodes
function EntityGraphNode({ data, selected }: NodeProps) {
  const d = data as any
  const isNotebook = d.type === 'notebook'
  const isNote = d.type === 'note'
  
  let icon = <FileText className="w-4 h-4 text-cyan-500" />
  let borderStyle = 'border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/10'
  
  if (isNotebook) {
    icon = <BookOpen className="w-5 h-5 text-emerald-400" />
    borderStyle = 'border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 py-4 scale-105'
  } else if (isNote) {
    icon = <StickyNote className="w-4 h-4 text-violet-400" />
    borderStyle = 'border-violet-500/30 hover:border-violet-400 bg-violet-950/10'
  }

  if (selected) {
    borderStyle += ' ring-2 ring-primary border-primary/50'
  }

  return (
    <div className={cn(
      "px-3 py-2.5 rounded-xl border bg-card/90 backdrop-blur-md transition-all duration-200 flex items-center gap-2.5 min-w-[140px] max-w-[200px] shadow-lg",
      borderStyle
    )}>
      <div className="flex-shrink-0 bg-muted/40 p-1.5 rounded-lg border border-border/20">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground truncate select-none leading-tight">
          {d.label}
        </p>
        <p className="text-[8px] font-mono text-muted-foreground mt-0.5 uppercase tracking-wider select-none">
          {d.type}
        </p>
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="!bg-primary/50 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary/50 !w-2 !h-2" />
    </div>
  )
}

const nodeTypes = {
  entityNode: EntityGraphNode
}

interface RelationsGraphProps {
  notebookId: string
  notebookName?: string
  onNodeDoubleClick?: (id: string, type: 'note' | 'source') => void
}

function RelationsGraphContent({
  notebookId,
  notebookName = 'Current Notebook',
  onNodeDoubleClick
}: RelationsGraphProps) {
  const { data: notes = [] } = useNotes(notebookId)
  const { data: sources = [] } = useSources(notebookId)
  const { data: rawLinks = [] } = useEntityLinks(notebookId)

  const createLink = useCreateEntityLink(notebookId)
  const deleteLink = useDeleteEntityLink(notebookId)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  // Recalculate graph nodes and edges on data changes
  useEffect(() => {
    const listNodes: Node[] = []
    const listEdges: Edge[] = []

    // 1. Add central notebook node
    const notebookNodeId = `notebook:${notebookId}`
    listNodes.push({
      id: notebookNodeId,
      type: 'entityNode',
      position: { x: 350, y: 220 },
      data: { label: notebookName, type: 'notebook' }
    })

    // Combine notes and sources to render in a circle
    const items = [
      ...notes.map(n => ({ id: n.id, label: n.title || 'Untitled Note', type: 'note' as const })),
      ...sources.map(s => ({ id: s.id, label: s.title || 'Untitled Source', type: 'source' as const }))
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
        position: { x, y },
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
      listEdges.push({
        id: link.id,
        source: link.in,
        target: link.out,
        animated: true,
        style: { stroke: 'rgba(99, 102, 241, 0.65)', strokeWidth: 2 },
        data: { isDefault: false, linkId: link.id }
      })
    })

    setNodes(listNodes)
    setEdges(listEdges)
  }, [notes, sources, rawLinks, notebookId, notebookName, setNodes, setEdges])

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      // Don't link central notebook Node to notebook Node
      if (params.source.startsWith('notebook:') || params.target.startsWith('notebook:')) {
        return
      }
      createLink.mutate({ sourceId: params.source, targetId: params.target })
    }
  }, [createLink])

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const linkId = (edge.data as any)?.linkId
    if (linkId) {
      setSelectedEdgeId(String(linkId))
    } else {
      setSelectedEdgeId(null)
    }
  }, [])

  const handleDeleteSelectedLink = useCallback(() => {
    if (selectedEdgeId) {
      deleteLink.mutate(selectedEdgeId)
      setSelectedEdgeId(null)
    }
  }, [selectedEdgeId, deleteLink])

  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    const parts = node.id.split(':')
    const type = parts[0]
    if (type === 'note' || type === 'source') {
      onNodeDoubleClick?.(node.id, type)
    }
  }, [onNodeDoubleClick])

  return (
    <div className="w-full h-full relative flex flex-col">
      {/* Action Header bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/40 p-1.5 rounded-lg shadow-md">
        <span className="text-xs text-muted-foreground px-1.5 flex items-center gap-1.5 select-none">
          <Link2 className="w-3.5 h-3.5" /> Drag lines to relate notes & sources
        </span>
        {selectedEdgeId && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDeleteSelectedLink}
            className="h-7 px-2.5 text-[10px] cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Delete Link
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-[350px] w-full border rounded-lg bg-background/20 overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-dot-grid"
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>
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
