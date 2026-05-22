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
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeProps,
  EdgeProps,
  getSmoothStepPath,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { 
  Shield, 
  Trash2, 
  Play, 
  Maximize2, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  Plus,
  Network,
  LayoutGrid
} from 'lucide-react'
import apiClient from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import ELK from 'elkjs/lib/elk.bundled.js'

// Instantiate ELK layout engine
const elk = new ELK()

// Define device config
interface DeviceTypeConfig {
  type: string
  label: string
  defaultLevel: number
  icon: string
  color: string
}

export const DEVICE_TYPES: DeviceTypeConfig[] = [
  { type: 'firewall', label: 'OT Firewall', defaultLevel: 3, icon: 'firewall', color: 'text-red-500 border-red-500/20' },
  { type: 'plc', label: 'Programmable Logic Controller (PLC)', defaultLevel: 1, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'switch', label: 'Industrial Switch', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'hmi', label: 'Human-Machine Interface (HMI)', defaultLevel: 2, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'historian', label: 'Data Historian', defaultLevel: 3, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'rtu', label: 'Remote Terminal Unit (RTU)', defaultLevel: 1, icon: 'rtu', color: 'text-purple-500 border-purple-500/20' }
]

// ==========================================
// 1. CUSTOM NODE: SWIMLANES
// ==========================================
export function SwimlaneNode({ data }: NodeProps) {
  const d = data as any
  const styles = useMemo(() => {
    switch (d.purdueLevel) {
      case 4:
        return {
          bg: 'bg-slate-500/5 dark:bg-slate-500/5',
          border: 'border-slate-500/20 dark:border-slate-500/20',
          text: 'text-slate-400 dark:text-slate-400 border-slate-500/30',
          gradient: 'from-slate-500/10 to-transparent'
        }
      case 3:
        return {
          bg: 'bg-cyan-500/5 dark:bg-cyan-500/5',
          border: 'border-cyan-500/20 dark:border-cyan-500/20',
          text: 'text-cyan-400 dark:text-cyan-400 border-cyan-500/30',
          gradient: 'from-cyan-500/10 to-transparent'
        }
      case 1:
      case 2:
      default:
        return {
          bg: 'bg-emerald-500/5 dark:bg-emerald-500/5',
          border: 'border-emerald-500/20 dark:border-emerald-500/20',
          text: 'text-emerald-400 dark:text-emerald-400 border-emerald-500/30',
          gradient: 'from-emerald-500/10 to-transparent'
        }
    }
  }, [d.purdueLevel])

  return (
    <div 
      className={`w-full h-full rounded-2xl border ${styles.bg} ${styles.border} relative overflow-hidden select-none pointer-events-none`}
      style={{ minWidth: d.width || 1200, minHeight: d.height || 220 }}
    >
      {/* Accent glow on top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${styles.gradient} opacity-50`} />

      {/* Label overlay */}
      <div className="absolute top-4 left-6 flex items-center gap-2">
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${styles.text}`}>
          LEVEL {d.purdueLevel === 1 ? '1-2' : d.purdueLevel}
        </div>
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-widest">
          {d.label}
        </span>
      </div>
    </div>
  )
}

// ==========================================
// 2. CUSTOM NODE: OT DEVICE & WORKFLOW SCANS CONTEXT
// ==========================================
export const NetworkCanvasContext = React.createContext<{
  currentlyAuditedNodes?: string[]
  activeThreatPaths?: string[][]
}>({})

export function CustomDeviceNode({ id, data, selected }: NodeProps) {
  const d = data as any
  const iconSrc = `/assets/devices/${d.deviceType}.svg`
  const isViolated = d.violated
  
  const { currentlyAuditedNodes = [], activeThreatPaths = [] } = React.useContext(NetworkCanvasContext)
  const isAudited = currentlyAuditedNodes.includes(id)
  const isThreat = activeThreatPaths.some(path => path.includes(id))

  let borderStyle = 'border-border/60 hover:border-cyan-500/40 shadow-black/20'
  if (selected) {
    borderStyle = 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-cyan-500/10'
  } else if (isThreat) {
    borderStyle = 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)] border-2 animate-bounce'
  } else if (isAudited) {
    borderStyle = 'border-cyan-500 shadow-[0_0_15px_rgba(14,165,233,0.4)] border-2 scale-105 animate-pulse'
  } else if (isViolated) {
    borderStyle = 'border-red-500 shadow-red-500/10 animate-pulse'
  }

  return (
    <div className={`relative px-4 py-3 rounded-xl border bg-card/85 backdrop-blur-md transition-all flex items-center gap-3 w-48 shadow-lg ${borderStyle}`}>
      {/* Glow background */}
      <div className={`absolute inset-0 rounded-xl opacity-10 transition-opacity ${
        selected ? 'bg-cyan-500' : isThreat ? 'bg-orange-500' : isAudited ? 'bg-cyan-500' : isViolated ? 'bg-red-500' : 'bg-transparent'
      }`} />
      
      {/* Node contents */}
      <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center p-1.5">
        <img 
          src={iconSrc} 
          alt={d.deviceType} 
          className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
          onError={(e) => {
            // Fallback: draw standard shape if image fails
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
      
      <div className="relative z-10 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-semibold text-foreground truncate leading-snug">
            {d.label}
          </p>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground mt-0.5 uppercase tracking-wider">
          Level {d.purdueLevel} • {d.deviceType}
        </p>
      </div>

      {(isViolated || isThreat) && (
        <div className={`absolute -top-1.5 -right-1.5 z-20 flex h-4.5 w-4.5 items-center justify-center rounded-full border shadow-md ${
          isThreat ? 'bg-orange-600 border-orange-500' : 'bg-red-600 border-red-500'
        }`}>
          <AlertTriangle className="h-2.5 w-2.5 text-white" />
        </div>
      )}

      {/* Connection points: handles in 4 directions */}
      <Handle type="source" position={Position.Top} id="t-src" className="!bg-cyan-500 !w-2 !h-2 !border-none opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Top} id="t-tgt" className="!bg-cyan-600 !w-2 !h-2 !border-none opacity-0 hover:opacity-100 transition-opacity" />
      
      <Handle type="source" position={Position.Bottom} id="b-src" className="!bg-cyan-500 !w-2 !h-2 !border-none opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Bottom} id="b-tgt" className="!bg-cyan-600 !w-2 !h-2 !border-none opacity-0 hover:opacity-100 transition-opacity" />
      
      <Handle type="source" position={Position.Left} id="l-src" className="!bg-cyan-500 !w-2 !h-2 !border-none opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Left} id="l-tgt" className="!bg-cyan-600 !w-2 !h-2 !border-none opacity-0 hover:opacity-100 transition-opacity" />
      
      <Handle type="source" position={Position.Right} id="r-src" className="!bg-cyan-500 !w-2 !h-2 !border-none opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Right} id="r-tgt" className="!bg-cyan-600 !w-2 !h-2 !border-none opacity-0 hover:opacity-100 transition-opacity" />
    </div>
  )
}

// ==========================================
// 3. CUSTOM EDGE: COMPLIANCE STEP EDGE
// ==========================================
export function ComplianceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: EdgeProps) {
  const d = data as any
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  const isViolated = d?.violated

  return (
    <>
      {/* Outer pulsing glow for violations */}
      {isViolated && (
        <path
          id={`${id}-glow`}
          className="stroke-red-500/40 opacity-70 animate-pulse"
          d={edgePath}
          style={{
            ...style,
            strokeWidth: 8,
            fill: 'none',
          }}
        />
      )}

      {/* Primary Edge Line */}
      <path
        id={id}
        className={`react-flow__edge-path transition-colors duration-300 ${
          isViolated 
            ? 'stroke-red-500 dark:stroke-red-500 animate-pulse' 
            : 'stroke-cyan-500/70 dark:stroke-cyan-500/50 hover:stroke-cyan-400'
        }`}
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isViolated ? 3.5 : 2,
          fill: 'none',
        }}
      />
    </>
  )
}

// ==========================================
// CORE CANVAS COMPONENT WITH REACTFLOW
// ==========================================
const nodeTypes = {
  swimlaneNode: SwimlaneNode,
  deviceNode: CustomDeviceNode
}

const edgeTypes = {
  complianceEdge: ComplianceEdge
}

interface CSETNetworkCanvasProps {
  onValidationSuccess?: (verifiedIds: string[], threatPaths: string[][], rawPayload?: any) => void
  currentlyAuditedNodes?: string[]
  activeThreatPaths?: string[][]
  selectedNodeId?: string | null
}

function CSETNetworkCanvasContent({
  onValidationSuccess,
  currentlyAuditedNodes = [],
  activeThreatPaths = [],
  selectedNodeId = null
}: CSETNetworkCanvasProps) {
  const { screenToFlowPosition } = useReactFlow()

  // 1. Initial background swimlane nodes
  const initialSwimlaneNodes: Node[] = [
    {
      id: 'lane-4',
      type: 'swimlaneNode',
      position: { x: 0, y: 0 },
      draggable: false,
      selectable: false,
      data: { label: 'Level 4: Enterprise Network', purdueLevel: 4, width: 1400, height: 260 }
    },
    {
      id: 'lane-3',
      type: 'swimlaneNode',
      position: { x: 0, y: 280 },
      draggable: false,
      selectable: false,
      data: { label: 'Level 3: Operations Control Network', purdueLevel: 3, width: 1400, height: 260 }
    },
    {
      id: 'lane-1-2',
      type: 'swimlaneNode',
      position: { x: 0, y: 560 },
      draggable: false,
      selectable: false,
      data: { label: 'Level 1-2: Process Control & Field Zone', purdueLevel: 1, width: 1400, height: 260 }
    }
  ]

  // Default baseline topology matching standard ICS architectures
  const initialDeviceNodes: Node[] = [
    {
      id: 'node-ent-switch',
      type: 'deviceNode',
      position: { x: 200, y: 100 },
      data: { label: 'Enterprise Switch', deviceType: 'switch', purdueLevel: 4, violated: false }
    },
    {
      id: 'node-ot-firewall',
      type: 'deviceNode',
      position: { x: 450, y: 380 },
      data: { label: 'OT Boundary Firewall', deviceType: 'firewall', purdueLevel: 3, violated: false }
    },
    {
      id: 'node-ops-hmi',
      type: 'deviceNode',
      position: { x: 200, y: 380 },
      data: { label: 'Operator HMI Station', deviceType: 'hmi', purdueLevel: 3, violated: false }
    },
    {
      id: 'node-field-plc',
      type: 'deviceNode',
      position: { x: 200, y: 660 },
      data: { label: 'Process Control PLC', deviceType: 'plc', purdueLevel: 1, violated: false }
    }
  ]

  const initialEdges: Edge[] = [
    {
      id: 'edge-ent-to-fw',
      source: 'node-ent-switch',
      target: 'node-ot-firewall',
      type: 'complianceEdge',
      data: { violated: false }
    },
    {
      id: 'edge-fw-to-hmi',
      source: 'node-ot-firewall',
      target: 'node-ops-hmi',
      type: 'complianceEdge',
      data: { violated: false }
    },
    {
      id: 'edge-hmi-to-plc',
      source: 'node-ops-hmi',
      target: 'node-field-plc',
      type: 'complianceEdge',
      data: { violated: false }
    }
  ]

  const [nodes, setNodes, onNodesChange] = useNodesState([...initialSwimlaneNodes, ...initialDeviceNodes])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  const [selectedNode, setSelectedNode] = useState<Node<any> | null>(null)
  const [threatPaths, setThreatPaths] = useState<string[][]>([])
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

  // Sync open state with selection
  useEffect(() => {
    if (selectedNode) {
      setIsDrawerOpen(true)
    }
  }, [selectedNode])

  // Sync open state with new threat path alerts
  useEffect(() => {
    if (threatPaths.length > 0) {
      setIsDrawerOpen(true)
    }
  }, [threatPaths])

  // Handle selectedNodeId external updates
  useEffect(() => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId)
      if (node) {
        setSelectedNode(node)
        setNodes(prev => prev.map(n => ({ ...n, selected: n.id === selectedNodeId })))
      }
    }
  }, [selectedNodeId, setNodes])

  const handleCloseDrawer = () => {
    setSelectedNode(null)
    setIsDrawerOpen(false)
  }

  // 2. Perform graph security validation with FastAPI NetworkX
  const triggerValidation = useCallback(async (currentNodes: Node[], currentEdges: Edge[]) => {
    setIsValidating(true)
    setValidationError(null)

    // Prepare JSON payload for the NetworkX backend endpoint
    const deviceNodes = currentNodes.filter(n => n.type === 'deviceNode')
    const payload = {
      nodes: deviceNodes.map(n => ({
        id: n.id,
        type: n.data.deviceType as string,
        purdueLevel: n.data.purdueLevel as number
      })),
      edges: currentEdges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target
      }))
    }

    try {
      const response = await apiClient.post('/graph/validate', payload)
      const data = response.data

      const violatedNodeIds = new Set<string>(data.violatedNodes || [])
      const violatedEdgeIds = new Set<string>(data.violatedEdges || [])
      setThreatPaths(data.threatPaths || [])

      // Update nodes state with violation markers
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.type === 'deviceNode') {
            return {
              ...node,
              data: {
                ...node.data,
                violated: violatedNodeIds.has(node.id)
              }
            }
          }
          return node
        })
      )

      // Update edges state with violation markers
      setEdges((prevEdges) =>
        prevEdges.map((edge) => ({
          ...edge,
          data: {
            ...edge.data,
            violated: violatedEdgeIds.has(edge.id)
          }
        }))
      )

      // Invoke success handler to sync checklist
      if (onValidationSuccess && data.verifiedRequirements) {
        onValidationSuccess(data.verifiedRequirements, data.threatPaths || [], payload)
      }

    } catch (err: any) {
      console.error('FastAPI validation failed:', err)
      setValidationError('FastAPI: ' + (err.response?.data?.detail || err.message))
    } finally {
      setIsValidating(false)
    }
  }, [setNodes, setEdges, onValidationSuccess])

  // Calculate a memoized topology signature representing the structure and relevant properties of the graph
  const topologySignature = useMemo(() => {
    const deviceNodes = nodes.filter(n => n.type === 'deviceNode')
    const nodePart = deviceNodes
      .map(n => `${n.id}:${n.data?.purdueLevel}:${n.data?.deviceType}:${n.data?.label}`)
      .sort()
      .join('|')
    const edgePart = edges.map(e => `${e.source}->${e.target}`).sort().join('|')
    return `${nodePart}#${edgePart}`
  }, [nodes, edges])

  // Trigger validation on canvas topology changes
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerValidation(nodes, edges)
    }, 400) // Debounce validation calls to prevent API flooding

    return () => clearTimeout(timer)
  }, [topologySignature, triggerValidation])

  // 3. Connect Nodes handler
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `edge-${Date.now()}`,
        type: 'complianceEdge',
        data: { violated: false }
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  // 4. Click node handler to inspect details
  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === 'deviceNode') {
      setSelectedNode(node)
    } else {
      setSelectedNode(null)
    }
  }, [])

  // 5. Update properties of selected node
  const handleUpdateNodeProperty = (property: string, value: any) => {
    if (!selectedNode) return

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === selectedNode.id) {
          const updatedNode = {
            ...n,
            data: {
              ...n.data,
              [property]: value
            }
          }
          
          // If level changed, snap its coordinate vertically
          if (property === 'purdueLevel') {
            const levelCenterY = value === 4 ? 110 : value === 3 ? 390 : 670
            updatedNode.position = {
              ...n.position,
              y: levelCenterY
            }
          }

          // Keep selected node state in sync
          setSelectedNode(updatedNode)
          return updatedNode
        }
        return n
      })
    )
  }

  // 6. Delete selected node
  const handleDeleteSelected = () => {
    if (!selectedNode) return
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id))
    setEdges((prev) => prev.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
    setSelectedNode(null)
  }

  // 7. Click to Add device node handler
  const handleAddDevice = (deviceType: string) => {
    const config = DEVICE_TYPES.find(d => d.type === deviceType)
    if (!config) return

    const level = config.defaultLevel
    const centerY = level === 4 ? 110 : level === 3 ? 390 : 670
    // Place randomly scattered on horizontal axis
    const randX = 150 + Math.floor(Math.random() * 400)

    const newNode: Node = {
      id: `node-${deviceType}-${Date.now()}`,
      type: 'deviceNode',
      position: { x: randX, y: centerY },
      data: {
        label: config.label,
        deviceType,
        purdueLevel: level,
        violated: false
      }
    }

    setNodes((prev) => [...prev, newNode])
  }

  // 8. Auto-layout Canvas using ELKjs with Purdue vertical constraints
  const handleAutoLayout = async () => {
    const deviceNodes = nodes.filter((n) => n.type === 'deviceNode')
    
    // Build ELK-structured children
    const elkNodes = deviceNodes.map((n) => ({
      id: n.id,
      width: 192, // 12rem
      height: 64 // default height
    }))

    const elkEdges = edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target]
    }))

    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '100',
        'elk.layered.spacing.edgeNodeBetweenLayers': '80'
      },
      children: elkNodes,
      edges: elkEdges
    }

    try {
      const layout = await elk.layout(graph)
      if (!layout.children) return

      // Map positions back to React Flow nodes, snapping Y coordinate to level swimlanes
      const positions = new Map<string, { x: number; y: number }>()
      layout.children.forEach((child) => {
        const node = deviceNodes.find((n) => n.id === child.id)
        if (node) {
          const level = node.data.purdueLevel as number
          const levelCenterY = level === 4 ? 110 : level === 3 ? 390 : 670
          positions.set(child.id, {
            x: child.x || 100,
            y: levelCenterY // Enforce swimlane vertical lock
          })
        }
      })

      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.type === 'deviceNode' && positions.has(node.id)) {
            const pos = positions.get(node.id)!
            return {
              ...node,
              position: pos
            }
          }
          return node
        })
      )

      // Re-trigger validation immediately after layout updates
      setTimeout(() => {
        triggerValidation(nodes, edges)
      }, 100)

    } catch (err) {
      console.error('ELK Layout error:', err)
    }
  }

  // 9. Reset canvas to baseline topology
  const handleResetCanvas = () => {
    setNodes([...initialSwimlaneNodes, ...initialDeviceNodes])
    setEdges(initialEdges)
    setSelectedNode(null)
  }

  return (
    <NetworkCanvasContext.Provider value={{ currentlyAuditedNodes, activeThreatPaths }}>
      <div className="flex flex-col h-full min-h-0 bg-background/55 text-foreground relative overflow-hidden">
        
        {/* Top Header and Control Bar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 border-b bg-card/40 backdrop-blur-md z-15 gap-4">
          <div className="flex items-center gap-2.5">
            <Network className="h-4.5 w-4.5 text-cyan-500" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">OT Network Boundary Architect</h4>
              <p className="text-[10px] text-muted-foreground">Purdue Model Zone compliance validation powered by NetworkX</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ELK Auto-Layout Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleAutoLayout}
              className="h-8 text-xs font-semibold hover:border-cyan-500/40 hover:bg-cyan-500/5 active:scale-[0.98]"
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5 text-cyan-500" />
              Auto-Layout ELK
            </Button>

            {/* Reset Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetCanvas}
              className="h-8 text-xs font-semibold hover:border-red-500/30 hover:bg-red-500/5 text-muted-foreground active:scale-[0.98]"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Reset Topology
            </Button>

            <Badge 
              variant="outline" 
              className={`font-mono text-[9px] font-bold ${
                isValidating 
                  ? 'border-cyan-500/30 text-cyan-500 bg-cyan-500/5 animate-pulse' 
                  : validationError 
                    ? 'border-red-500/30 text-red-500 bg-red-500/5' 
                    : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5'
              }`}
            >
              {isValidating ? 'COMPUTING PATHS...' : validationError ? 'AUDIT FAIL' : 'SECURE SEC-AUDIT'}
            </Badge>
          </div>
        </div>

        {/* Main Canvas + Side Toolboxes panel */}
        <div className="flex-1 flex min-h-0 relative">
          
          {/* LEFT FLOATING TRAY: Device items catalog */}
          <div className="absolute left-4 top-4 z-10 w-48 p-3 border rounded-xl border-white/5 bg-slate-950/85 backdrop-blur-md shadow-2xl flex flex-col gap-2.5">
            <p className="text-[10px] font-bold text-cyan-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-cyan-500" />
              OT Device Library
            </p>
            <div className="flex flex-col gap-1.5">
              {DEVICE_TYPES.map((d) => (
                <button
                  key={d.type}
                  type="button"
                  onClick={() => handleAddDevice(d.type)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-white/5 bg-slate-900/40 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-cyan-400 flex items-center justify-between group transition-all"
                >
                  <span>{d.label.split(' (')[0]}</span>
                  <span className="text-[8px] font-mono border border-white/10 rounded px-1 group-hover:border-cyan-500/30">L{d.defaultLevel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* REACT FLOW DIAGRAM CONTAINER */}
          <div className="flex-1 h-full min-h-[480px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              minZoom={0.2}
              maxZoom={1.5}
              defaultViewport={{ x: 100, y: 50, zoom: 0.7 }}
            >
              <Background variant={BackgroundVariant.Lines} color="#0ea5e9" size={12} style={{ opacity: 0.08 }} />
              <Controls className="!bg-card !border-border !rounded-lg" />
              <MiniMap 
                className="!bg-card/90 !border-border !rounded-lg overflow-hidden" 
                nodeColor={(n) => {
                  if (n.type === 'swimlaneNode') return 'transparent'
                  return (n.data as any).violated ? '#EF4444' : '#06B6D4'
                }}
                maskColor="rgba(0, 0, 0, 0.4)"
              />
            </ReactFlow>
          </div>

          {/* RIGHT INSPECTOR PANEL: Selected node details & network threats */}
          <div className={`absolute right-0 top-0 bottom-0 w-80 border-l border-white/10 bg-slate-950/95 backdrop-blur-md flex flex-col h-full min-h-0 transition-transform duration-300 ease-in-out z-20 shadow-2xl ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
              <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5 text-cyan-500" />
                Property Inspector
              </h5>
              <button 
                type="button" 
                onClick={handleCloseDrawer}
                className="text-[9px] font-mono font-bold text-muted-foreground hover:text-red-400 uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/5 hover:border-red-500/20 bg-slate-950/40 transition-colors"
              >
                [Close]
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Device Name</label>
                    <input
                      type="text"
                      value={selectedNode.data.label}
                      onChange={(e) => handleUpdateNodeProperty('label', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Purdue model level</label>
                    <select
                      value={selectedNode.data.purdueLevel}
                      onChange={(e) => handleUpdateNodeProperty('purdueLevel', parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500 capitalize"
                    >
                      <option value={4}>Level 4 (Enterprise)</option>
                      <option value={3}>Level 3 (Operations Control)</option>
                      <option value={1}>Level 1-2 (Process Control)</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteSelected}
                      className="w-full text-xs hover:bg-red-500/5 hover:border-red-500/30 text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete Asset
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground/60 space-y-2">
                  <Shield className="h-8 w-8 mx-auto text-muted-foreground/30" />
                  <p className="text-[10.5px] font-medium">No asset selected</p>
                  <p className="text-[9px] text-muted-foreground/80 max-w-[160px] mx-auto leading-relaxed">
                    Select a device node inside the drawing grid to inspect details and properties.
                  </p>
                </div>
              )}

              {/* Path Threat Detection Section */}
              {threatPaths.length > 0 && (
                <div className="pt-4 border-t border-dashed border-border/60 space-y-3">
                  <h6 className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
                    Purdue Isolation Threat
                  </h6>
                  <div className="space-y-2">
                    {threatPaths.map((path, idx) => (
                      <div 
                        key={idx}
                        className="p-2.5 border border-red-500/20 bg-red-500/5 rounded text-[9.5px] text-red-600 dark:text-red-400 font-medium leading-relaxed"
                      >
                        <p className="font-bold mb-1">Unmediated Level 1 to 4 Path:</p>
                        <div className="flex flex-wrap items-center gap-1 text-[8.5px] font-mono mt-1">
                          {path.map((nodeId, nodeIdx) => {
                            const node = nodes.find(n => n.id === nodeId)
                            const label = node ? (node.data as any).label : nodeId
                            return (
                              <React.Fragment key={nodeId}>
                                {nodeIdx > 0 && <span className="text-red-500/60 font-mono">{"->"}</span>}
                                <span className="bg-red-500/10 border border-red-500/25 px-1 py-0.5 rounded truncate max-w-[70px]">{label}</span>
                              </React.Fragment>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zero-violation success feedback */}
              {threatPaths.length === 0 && (
                <div className="pt-4 border-t border-dashed border-border/60 text-center py-2 space-y-1">
                  <CheckCircle2 className="h-7 w-7 mx-auto text-emerald-500" />
                  <p className="text-[9.5px] font-bold text-emerald-500 uppercase tracking-wider">Topology Secure</p>
                  <p className="text-[8.5px] text-muted-foreground leading-relaxed px-1">
                    All Level 1-2 paths traversing to Level 4 are mediated via high-availability security gates.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </NetworkCanvasContext.Provider>
  )
}

export function CSETNetworkCanvas(props: CSETNetworkCanvasProps) {
  return (
    <ReactFlowProvider>
      <CSETNetworkCanvasContent {...props} />
    </ReactFlowProvider>
  )
}
