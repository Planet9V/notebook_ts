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
  NodeResizer,
  EdgeLabelRenderer,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { 
  Shield, 
  Trash2, 
  Play, 
  Pause,
  Maximize2, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  Plus,
  Network,
  LayoutGrid,
  Link,
  Unlock,
  Lock
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
  { type: 'active_directory', label: 'Active Directory', defaultLevel: 4, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'application_server', label: 'Application Server', defaultLevel: 4, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'audio_switch', label: 'Audio Switch', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'building_automation_management_systems', label: 'Building Automation Systems (BAMS)', defaultLevel: 3, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'dcs', label: 'DCS (Distributed Control System)', defaultLevel: 2, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'dns_server', label: 'DNS Server', defaultLevel: 4, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'database_server', label: 'Database Server', defaultLevel: 4, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'dispatch_console', label: 'Dispatch Console', defaultLevel: 3, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'electronic_security_system', label: 'Electronic Security System (ESS)', defaultLevel: 3, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'emergency_medical_service_communications_hardware', label: 'EMS Communications Hardware', defaultLevel: 2, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'ethernet_backhaul', label: 'Ethernet Backhaul', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'firewall', label: 'OT Firewall', defaultLevel: 3, icon: 'firewall', color: 'text-red-500 border-red-500/20' },
  { type: 'handheld_wireless_device', label: 'Handheld Wireless Device', defaultLevel: 2, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'historian', label: 'Data Historian', defaultLevel: 3, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'ids', label: 'IDS (Intrusion Detection System)', defaultLevel: 3, icon: 'firewall', color: 'text-red-500 border-red-500/20' },
  { type: 'ip_camera', label: 'IP Camera', defaultLevel: 2, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'ip_phone', label: 'IP Phone', defaultLevel: 3, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'ips', label: 'IPS (Intrusion Prevention System)', defaultLevel: 3, icon: 'firewall', color: 'text-red-500 border-red-500/20' },
  { type: 'imaging_modalities_and_equipment', label: 'Imaging Modalities & Equipment', defaultLevel: 2, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'imaging_server', label: 'Imaging Server', defaultLevel: 4, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'link_encryption', label: 'Link Encryption', defaultLevel: 3, icon: 'firewall', color: 'text-red-500 border-red-500/20' },
  { type: 'mail_server', label: 'Mail Server', defaultLevel: 4, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'modem', label: 'Modem', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'multi_protocol_label_switching', label: 'MPLS (Label Switching)', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'network_printer', label: 'Network Printer', defaultLevel: 3, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'network_scanner_and_copier', label: 'Network Scanner & Copier', defaultLevel: 3, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'optical_ring_system', label: 'Optical Ring System', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'partner', label: 'Partner System', defaultLevel: 4, icon: 'historian', color: 'text-slate-500 border-slate-500/20' },
  { type: 'physiological_monitoring_system', label: 'Physiological Monitoring System', defaultLevel: 2, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'power_over_ethernet', label: 'Power Over Ethernet (PoE)', defaultLevel: 3, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'public_kiosk', label: 'Public Kiosk', defaultLevel: 3, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'rfid_transmitter', label: 'RFID Transmitter', defaultLevel: 1, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'radio_site', label: 'Radio Site', defaultLevel: 2, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'real_time_location_system', label: 'RTLS (Location System)', defaultLevel: 2, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'relay_panel', label: 'Relay Panel', defaultLevel: 1, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'router', label: 'Router', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'safety_instrumented_system', label: 'Safety Instrumented System (SIS)', defaultLevel: 1, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'security_information_and_event_management_system', label: 'SIEM Server', defaultLevel: 3, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'subscriber_radio', label: 'Subscriber Radio', defaultLevel: 2, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'switch', label: 'Industrial Switch', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'terminal_server', label: 'Terminal Server', defaultLevel: 3, icon: 'hmi', color: 'text-cyan-500 border-cyan-500/20' },
  { type: 'unidirectional_device', label: 'Unidirectional Device (Data Diode)', defaultLevel: 3, icon: 'firewall', color: 'text-red-500 border-red-500/20' },
  { type: 'vlan_router', label: 'VLAN Router', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'vlan_switch', label: 'VLAN Switch', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'vpn', label: 'VPN Gateway', defaultLevel: 3, icon: 'firewall', color: 'text-red-500 border-red-500/20' },
  { type: 'web_server', label: 'Web Server', defaultLevel: 4, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'windows_update_server', label: 'Windows Update Server', defaultLevel: 4, icon: 'historian', color: 'text-amber-500 border-amber-500/20' },
  { type: 'wireless_modem', label: 'Wireless Modem', defaultLevel: 3, icon: 'switch', color: 'text-blue-500 border-blue-500/20' },
  { type: 'wireless_network', label: 'Wireless Network Link', defaultLevel: 3, icon: 'rtu', color: 'text-purple-500 border-purple-500/20' },
  { type: 'rtu', label: 'Remote Terminal Unit (RTU)', defaultLevel: 1, icon: 'rtu', color: 'text-purple-500 border-purple-500/20' },
  { type: 'plc', label: 'Programmable Logic Controller (PLC)', defaultLevel: 1, icon: 'plc', color: 'text-emerald-500 border-emerald-500/20' },
  { type: 'comp', label: 'Component (General)', defaultLevel: 3, icon: 'historian', color: 'text-slate-500 border-slate-500/20' }
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
// 2. CUSTOM NODE: CYBERSECURITY ZONE
// ==========================================
export function ZoneNode({ id, selected, data }: NodeProps) {
  const d = data as any
  
  const styles = useMemo(() => {
    switch (d.zone_sal) {
      case 'Very High':
        return {
          border: 'border-red-600 dark:border-red-600',
          bg: 'bg-red-500/5 dark:bg-red-950/10',
          text: 'text-red-600 dark:text-red-400 border-red-600/30',
          glow: 'from-red-600/20 to-transparent'
        }
      case 'High':
        return {
          border: 'border-orange-500 dark:border-orange-500',
          bg: 'bg-orange-500/5 dark:bg-orange-950/10',
          text: 'text-orange-500 dark:text-orange-400 border-orange-500/30',
          glow: 'from-orange-500/20 to-transparent'
        }
      case 'Medium':
      case 'Moderate':
        return {
          border: 'border-amber-500 dark:border-amber-500',
          bg: 'bg-amber-500/5 dark:bg-amber-950/10',
          text: 'text-amber-500 dark:text-amber-400 border-amber-500/30',
          glow: 'from-amber-500/20 to-transparent'
        }
      case 'Low':
      default:
        return {
          border: 'border-cyan-500 dark:border-cyan-500',
          bg: 'bg-cyan-500/5 dark:bg-cyan-950/10',
          text: 'text-cyan-500 dark:text-cyan-400 border-cyan-500/30',
          glow: 'from-cyan-500/20 to-transparent'
        }
    }
  }, [d.zone_sal])

  return (
    <div className={`w-full h-full rounded-2xl border-2 ${styles.bg} ${styles.border} relative overflow-hidden select-none`}>
      <NodeResizer 
        color="#0ea5e9" 
        minWidth={150} 
        minHeight={150} 
        isVisible={selected}
        onResizeEnd={(event, params) => {
          if (d.onResizeEnd) {
            d.onResizeEnd(params.width, params.height)
          }
        }}
      />
      {/* Accent glow on top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${styles.glow} opacity-50`} />

      {/* Label overlay */}
      <div className="absolute top-4 left-6 flex items-center gap-2 pointer-events-none">
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${styles.text}`}>
          {d.zone_sal?.toUpperCase() || 'LOW'} SAL
        </div>
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-widest">
          {d.label || 'Cybersecurity Zone'}
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          ({d.zone_type || 'Control'})
        </span>
      </div>
    </div>
  )
}

// ==========================================
// 3. CUSTOM NODE: OT DEVICE & WORKFLOW SCANS CONTEXT
// ==========================================
export const NetworkCanvasContext = React.createContext<{
  currentlyAuditedNodes?: string[]
  activeThreatPaths?: string[][]
}>({})

export function CustomDeviceNode({ id, data, selected }: NodeProps) {
  const d = data as any
  const config = DEVICE_TYPES.find(dt => dt.type === d.deviceType)
  const baseIcon = config ? config.icon : d.deviceType
  const iconSrc = `/assets/devices/${baseIcon}.svg`
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
// 4. CUSTOM EDGE: COMPLIANCE STEP EDGE
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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  const isViolated = d?.violated
  const protocol = d?.protocol
  const encrypted = d?.encrypted

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
            ? 'stroke-red-500 dark:stroke-red-500' 
            : encrypted 
              ? 'stroke-emerald-500/70 dark:stroke-emerald-500/50 hover:stroke-emerald-400'
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

      {/* Render custom edge labels for Protocol & Encryption */}
      {protocol && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 rounded bg-slate-950/90 border border-white/10 text-[9px] font-mono font-bold text-cyan-400 shadow-md flex items-center gap-1 select-none cursor-pointer hover:border-cyan-500/50"
          >
            <span>{protocol}</span>
            {encrypted ? (
              <Lock className="h-2.5 w-2.5 text-emerald-500" />
            ) : (
              <Unlock className="h-2.5 w-2.5 text-red-500" />
            )}
            {isViolated && (
              <AlertTriangle className="h-2.5 w-2.5 text-red-500 animate-pulse" />
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

// ==========================================
// 5. CUSTOM EDGE: THREAT FLOW ANIMATED EDGE
// ==========================================
export function ThreatFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  return (
    <>
      {/* Background glow trail */}
      <path
        id={`${id}-bg`}
        className="stroke-cyan-500/20 dark:stroke-cyan-400/15"
        d={edgePath}
        style={{
          ...style,
          strokeWidth: 6,
          fill: 'none',
        }}
      />

      {/* Animated dash-flow foreground */}
      <path
        id={id}
        className="tetrel-threat-flow stroke-cyan-400 dark:stroke-cyan-300 react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2.5,
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
  deviceNode: CustomDeviceNode,
  zoneNode: ZoneNode
}

const edgeTypes = {
  complianceEdge: ComplianceEdge,
  threatFlowEdge: ThreatFlowEdge
}

interface CSETNetworkCanvasProps {
  notebookId?: string
  onValidationSuccess?: (verifiedIds: string[], threatPaths: string[][], rawPayload?: Record<string, unknown>) => void
  currentlyAuditedNodes?: string[]
  activeThreatPaths?: string[][]
  selectedNodeId?: string | null
}

// Bounding box collision helper
const detectParentZone = (node: Node, allNodes: Node[]): string => {
  if (node.data?.parentId) return node.data.parentId as string
  
  const nx = node.position.x
  const ny = node.position.y
  
  const zones = allNodes.filter(n => n.type === 'zoneNode')
  for (const z of zones) {
    const zx = z.position.x
    const zy = z.position.y
    const zw = z.width || z.style?.width || 300
    const zh = z.height || z.style?.height || 200
    
    if (zx !== undefined && zy !== undefined && zw !== undefined && zh !== undefined) {
      if (nx >= zx && nx <= zx + (zw as number) && ny >= zy && ny <= zy + (zh as number)) {
        return z.id
      }
    }
  }
  return ''
}

function CSETNetworkCanvasContent({
  notebookId,
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
      data: { 
        label: 'Enterprise Switch', 
        deviceType: 'switch', 
        purdueLevel: 4, 
        violated: false,
        ip_address: '192.168.1.10',
        subnet_mask: '255.255.255.0',
        mac_address: '00:1A:2B:3C:4D:5E',
        hostname: 'enterprise-switch',
        manufacturer: 'Cisco',
        os_version: 'IOS',
        firmware_version: '15.2',
        parentId: ''
      }
    },
    {
      id: 'node-ot-firewall',
      type: 'deviceNode',
      position: { x: 450, y: 380 },
      data: { 
        label: 'OT Boundary Firewall', 
        deviceType: 'firewall', 
        purdueLevel: 3, 
        violated: false,
        ip_address: '192.168.1.1',
        subnet_mask: '255.255.255.0',
        mac_address: '00:1A:2B:3C:4D:5F',
        hostname: 'ot-firewall',
        manufacturer: 'Fortinet',
        os_version: 'FortiOS',
        firmware_version: '7.0.5',
        parentId: ''
      }
    },
    {
      id: 'node-ops-hmi',
      type: 'deviceNode',
      position: { x: 200, y: 380 },
      data: { 
        label: 'Operator HMI Station', 
        deviceType: 'hmi', 
        purdueLevel: 3, 
        violated: false,
        ip_address: '192.168.2.100',
        subnet_mask: '255.255.255.0',
        mac_address: '00:1A:2B:3C:4D:60',
        hostname: 'ops-hmi',
        manufacturer: 'Siemens',
        os_version: 'WinCC',
        firmware_version: '7.5',
        parentId: ''
      }
    },
    {
      id: 'node-field-plc',
      type: 'deviceNode',
      position: { x: 200, y: 660 },
      data: { 
        label: 'Process Control PLC', 
        deviceType: 'plc', 
        purdueLevel: 1, 
        violated: false,
        ip_address: '192.168.2.10',
        subnet_mask: '255.255.255.0',
        mac_address: '00:1A:2B:3C:4D:61',
        hostname: 'process-plc',
        manufacturer: 'Siemens',
        os_version: 'S7-1200',
        firmware_version: '4.4.0',
        parentId: ''
      }
    }
  ]

  const initialEdges: Edge[] = [
    {
      id: 'edge-ent-to-fw',
      source: 'node-ent-switch',
      target: 'node-ot-firewall',
      type: 'complianceEdge',
      data: { violated: false, protocol: 'HTTPS', encrypted: true }
    },
    {
      id: 'edge-fw-to-hmi',
      source: 'node-ot-firewall',
      target: 'node-ops-hmi',
      type: 'complianceEdge',
      data: { violated: false, protocol: 'HTTPS', encrypted: true }
    },
    {
      id: 'edge-hmi-to-plc',
      source: 'node-ops-hmi',
      target: 'node-field-plc',
      type: 'complianceEdge',
      data: { violated: false, protocol: 'Modbus', encrypted: false }
    }
  ]

  const [nodes, setNodes, onNodesChange] = useNodesState([...initialSwimlaneNodes, ...initialDeviceNodes])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  const [selectedNode, setSelectedNode] = useState<Node<any> | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge<any> | null>(null)
  const [threatPaths, setThreatPaths] = useState<string[][]>([])
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [nodeViolations, setNodeViolations] = useState<Record<string, string[]>>({})
  const [edgeViolations, setEdgeViolations] = useState<Record<string, string[]>>({})

  // Zone resize handler passed into zoneNode data
  const handleZoneResize = useCallback((nodeId: string, width: number, height: number) => {
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === nodeId) {
          const updated = {
            ...n,
            style: { ...n.style, width, height },
            width,
            height
          }
          if (notebookId) {
            saveAsset(updated)
          }
          return updated
        }
        return n
      })
    )
  }, [notebookId, setNodes])

  const mapAssetToNode = useCallback((asset: any): Node => {
    const config = DEVICE_TYPES.find(dt => dt.type === asset.type);
    let label = asset.hostname || config?.label || asset.node_id;
    if (asset.node_id === 'node-ent-switch') label = 'Enterprise Switch';
    else if (asset.node_id === 'node-ot-firewall') label = 'OT Boundary Firewall';
    else if (asset.node_id === 'node-ops-hmi') label = 'Operator HMI Station';
    else if (asset.node_id === 'node-field-plc') label = 'Process Control PLC';
    
    const isZone = asset.type === 'zone';
    
    return {
      id: asset.node_id,
      type: isZone ? 'zoneNode' : 'deviceNode',
      position: { x: asset.x, y: asset.y },
      style: isZone ? { width: asset.width || 350, height: asset.height || 250 } : undefined,
      width: isZone ? (asset.width || 350) : undefined,
      height: isZone ? (asset.height || 250) : undefined,
      data: {
        label,
        deviceType: asset.type,
        purdueLevel: asset.purdueLevel,
        violated: false,
        ip_address: asset.ip_address || '',
        mac_address: asset.mac_address || '',
        subnet_mask: asset.subnet_mask || '',
        hostname: asset.hostname || '',
        manufacturer: asset.manufacturer || '',
        os_version: asset.os_version || '',
        firmware_version: asset.firmware_version || '',
        parentId: asset.parentId || '',
        zone_sal: asset.zone_sal || 'Low',
        zone_type: asset.zone_type || 'Control',
        onResizeEnd: isZone ? (w: number, h: number) => handleZoneResize(asset.node_id, w, h) : undefined
      }
    };
  }, [handleZoneResize]);

  const saveAsset = useCallback(async (node: Node) => {
    if (!notebookId || (node.type !== 'deviceNode' && node.type !== 'zoneNode')) return
    try {
      const payload = {
        notebook_id: notebookId,
        node_id: node.id,
        type: node.data.deviceType,
        purdueLevel: node.type === 'zoneNode' ? 0 : node.data.purdueLevel,
        manufacturer: node.data.manufacturer || '',
        os_version: node.data.os_version || '',
        firmware_version: node.data.firmware_version || '',
        ip_address: node.data.ip_address || '',
        mac_address: node.data.mac_address || '',
        subnet_mask: node.data.subnet_mask || '',
        hostname: node.data.hostname || '',
        x: node.position.x,
        y: node.position.y,
        parentId: node.data.parentId || null,
        width: node.type === 'zoneNode' ? (node.width || node.style?.width || null) : null,
        height: node.type === 'zoneNode' ? (node.height || node.style?.height || null) : null,
        zone_sal: node.type === 'zoneNode' ? (node.data.zone_sal || null) : null,
        zone_type: node.type === 'zoneNode' ? (node.data.zone_type || null) : null
      }
      await apiClient.post(`/notebooks/${notebookId}/assets`, payload)
    } catch (err) {
      console.error('Failed to save asset:', err)
    }
  }, [notebookId])

  const initDb = useCallback(async () => {
    if (!notebookId) return
    for (const node of initialDeviceNodes) {
      const payload = {
        notebook_id: notebookId,
        node_id: node.id,
        type: node.data.deviceType,
        purdueLevel: node.data.purdueLevel,
        manufacturer: node.data.manufacturer || '',
        os_version: node.data.os_version || '',
        firmware_version: node.data.firmware_version || '',
        ip_address: node.data.ip_address || '',
        mac_address: node.data.mac_address || '',
        subnet_mask: node.data.subnet_mask || '',
        hostname: node.data.hostname || '',
        x: node.position.x,
        y: node.position.y,
        parentId: node.data.parentId || null,
        width: null,
        height: null,
        zone_sal: null,
        zone_type: null
      }
      await apiClient.post(`/notebooks/${notebookId}/assets`, payload)
    }
    setNodes([...initialSwimlaneNodes, ...initialDeviceNodes])
  }, [notebookId, setNodes])

  // Load assets and edges from database on mount if notebookId is provided
  useEffect(() => {
    if (!notebookId) return

    const loadData = async () => {
      try {
        // Load assets
        const response = await apiClient.get(`/notebooks/${notebookId}/assets`)
        const assets = response.data
        if (assets && assets.length > 0) {
          const dbNodes = assets.map(mapAssetToNode)
          setNodes([...initialSwimlaneNodes, ...dbNodes])
        } else {
          await initDb()
        }

        // Load edges
        const edgesRes = await apiClient.get(`/notebooks/${notebookId}/edges`)
        const dbEdges = edgesRes.data
        if (dbEdges && dbEdges.length > 0) {
          setEdges(dbEdges.map((e: any) => ({
            id: e.edge_id,
            source: e.source,
            target: e.target,
            type: 'complianceEdge',
            data: {
              protocol: e.protocol || '',
              encrypted: e.encrypted || false,
              violated: false
            }
          })))
        } else {
          // If no edges in DB, save initial edges
          const initialPayload = initialEdges.map(e => ({
            edge_id: e.id,
            source: e.source,
            target: e.target,
            protocol: e.data?.protocol || null,
            encrypted: e.data?.encrypted || false
          }))
          await apiClient.post(`/notebooks/${notebookId}/edges`, initialPayload)
          setEdges(initialEdges)
        }
      } catch (err) {
        console.error('Failed to load assets/edges:', err)
      }
    }

    loadData()
  }, [notebookId, mapAssetToNode, initDb, setNodes, setEdges])

  // Watch edges changes and sync to DB
  useEffect(() => {
    if (!notebookId) return
    const timer = setTimeout(async () => {
      try {
        const payload = edges.map(e => ({
          edge_id: e.id,
          source: e.source,
          target: e.target,
          protocol: e.data?.protocol || null,
          encrypted: e.data?.encrypted || false
        }))
        await apiClient.post(`/notebooks/${notebookId}/edges`, payload)
      } catch (err) {
        console.error('Failed to sync edges:', err)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [edges, notebookId])

  const handleNodeDragStop = useCallback(async (event: React.MouseEvent, node: Node) => {
    if (!notebookId || (node.type !== 'deviceNode' && node.type !== 'zoneNode')) return
    await saveAsset(node)
  }, [notebookId, saveAsset])
  
  // Sync open state with selections
  useEffect(() => {
    if (selectedNode || selectedEdge) {
      setIsDrawerOpen(true)
    }
  }, [selectedNode, selectedEdge])

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
        setSelectedEdge(null)
        setNodes(prev => prev.map(n => ({ ...n, selected: n.id === selectedNodeId })))
      }
    }
  }, [selectedNodeId, setNodes])

  const handleCloseDrawer = () => {
    setSelectedNode(null)
    setSelectedEdge(null)
    setIsDrawerOpen(false)
  }

  // 2. Perform graph security validation with FastAPI NetworkX
  const triggerValidation = useCallback(async (currentNodes: Node[], currentEdges: Edge[]) => {
    setIsValidating(true)
    setValidationError(null)

    // Prepare JSON payload for the NetworkX backend endpoint
    const activeNodes = currentNodes.filter(n => n.type === 'deviceNode' || n.type === 'zoneNode')
    const payload = {
      nodes: activeNodes.map(n => ({
        id: n.id,
        type: (n.type === 'zoneNode' ? 'zone' : n.data.deviceType) as string,
        purdueLevel: (n.type === 'zoneNode' ? 0 : n.data.purdueLevel) as number,
        ip_address: n.data.ip_address || '',
        mac_address: n.data.mac_address || '',
        subnet_mask: n.data.subnet_mask || '',
        hostname: n.data.hostname || '',
        manufacturer: n.data.manufacturer || '',
        os_version: n.data.os_version || '',
        firmware_version: n.data.firmware_version || '',
        parentId: n.type === 'deviceNode' ? detectParentZone(n, currentNodes) : (n.data.parentId || null),
        width: n.type === 'zoneNode' ? (n.width || n.style?.width || null) : null,
        height: n.type === 'zoneNode' ? (n.height || n.style?.height || null) : null,
        zone_sal: n.type === 'zoneNode' ? (n.data.zone_sal || null) : null,
        zone_type: n.type === 'zoneNode' ? (n.data.zone_type || null) : null,
        x: n.position.x,
        y: n.position.y
      })),
      edges: currentEdges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        protocol: e.data?.protocol || null,
        encrypted: e.data?.encrypted || false
      }))
    }

    try {
      const response = await apiClient.post('/graph/validate', payload)
      const data = response.data

      const violatedNodeIds = new Set<string>(data.violatedNodes || [])
      const violatedEdgeIds = new Set<string>(data.violatedEdges || [])
      setThreatPaths(data.threatPaths || [])
      setNodeViolations(data.nodeViolations || {})
      setEdgeViolations(data.edgeViolations || {})

      // Update nodes state with violation markers
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.type === 'deviceNode' || node.type === 'zoneNode') {
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

      // Build set of edge keys that are on the top 2 threat paths
      const topThreatPaths = (data.threatPaths || []).slice(0, 2)
      const threatEdgeKeys = new Set<string>()
      topThreatPaths.forEach((path: string[]) => {
        for (let i = 0; i < path.length - 1; i++) {
          threatEdgeKeys.add(`${path[i]}|${path[i + 1]}`)
          threatEdgeKeys.add(`${path[i + 1]}|${path[i]}`) // bidirectional
        }
      })

      // Update edges state with violation markers and threat flow type
      setEdges((prevEdges) =>
        prevEdges.map((edge) => {
          const isOnThreatPath = threatEdgeKeys.has(`${edge.source}|${edge.target}`)
          return {
            ...edge,
            type: isOnThreatPath ? 'threatFlowEdge' : 'complianceEdge',
            data: {
              ...edge.data,
              violated: violatedEdgeIds.has(edge.id)
            }
          }
        })
      )

      // Invoke success handler to sync checklist
      if (onValidationSuccess && data.verifiedRequirements) {
        onValidationSuccess(data.verifiedRequirements, data.threatPaths || [], payload)
      }

    } catch (err: unknown) {
      console.error('FastAPI validation failed:', err)
      const error = err as { response?: { data?: { detail?: string } }; message?: string }
      setValidationError('FastAPI: ' + (error.response?.data?.detail || error.message))
    } finally {
      setIsValidating(false)
    }
  }, [setNodes, setEdges, onValidationSuccess, notebookId])

  // Calculate a memoized topology signature representing the structure and relevant properties of the graph
  const topologySignature = useMemo(() => {
    const activeNodes = nodes.filter(n => n.type === 'deviceNode' || n.type === 'zoneNode')
    const nodePart = activeNodes
      .map(n => `${n.id}:${n.type}:${n.type === 'zoneNode' ? '' : n.data?.purdueLevel}:${n.data?.label}:${n.data?.ip_address || ''}:${n.data?.mac_address || ''}:${n.data?.subnet_mask || ''}:${n.data?.hostname || ''}:${n.data?.manufacturer || ''}:${n.data?.os_version || ''}:${n.data?.firmware_version || ''}:${n.data?.parentId || ''}:${n.data?.zone_sal || ''}:${n.data?.zone_type || ''}:${n.width || n.style?.width || ''}:${n.height || n.style?.height || ''}`)
      .sort()
      .join('|')
    const edgePart = edges.map(e => `${e.source}->${e.target}:${e.data?.protocol || ''}:${e.data?.encrypted ? '1' : '0'}`).sort().join('|')
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
        data: { violated: false, protocol: 'HTTPS', encrypted: true }
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  // 4. Click node handler to inspect details
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'deviceNode' || node.type === 'zoneNode') {
      setSelectedNode(node)
      setSelectedEdge(null)
      setIsDrawerOpen(true)
    } else {
      setSelectedNode(null)
      setSelectedEdge(null)
    }
  }, [])

  // Click edge handler
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
    setIsDrawerOpen(true)
  }, [])
 
  // 5. Update properties of selected node
  const handleUpdateNodeProperty = (property: string, value: string | number | boolean) => {
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
          
          // If level changed, snap its coordinate vertically (only for devices)
          if (property === 'purdueLevel' && n.type === 'deviceNode') {
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

    if (notebookId) {
      const currentTarget = nodes.find(n => n.id === selectedNode.id)
      if (currentTarget) {
        const uNode = {
          ...currentTarget,
          data: {
            ...currentTarget.data,
            [property]: value
          }
        }
        if (property === 'purdueLevel' && currentTarget.type === 'deviceNode') {
          const levelCenterY = value === 4 ? 110 : value === 3 ? 390 : 670
          uNode.position = {
            ...uNode.position,
            y: levelCenterY
          }
        }
        saveAsset(uNode)
      }
    }
  }

  // Update properties of selected edge
  const handleUpdateEdgeProperty = (property: string, value: string | boolean) => {
    if (!selectedEdge) return

    setEdges((prevEdges) =>
      prevEdges.map((e) => {
        if (e.id === selectedEdge.id) {
          const updatedEdge = {
            ...e,
            data: {
              ...e.data,
              [property]: value
            }
          }
          setSelectedEdge(updatedEdge)
          return updatedEdge
        }
        return e
      })
    )
  }

  // 6. Delete selected node
  const handleDeleteSelected = async () => {
    if (!selectedNode) return
    if (notebookId) {
      try {
        await apiClient.delete(`/notebooks/${notebookId}/assets/${selectedNode.id}`)
      } catch (err) {
        console.error('Failed to delete asset:', err)
      }
    }
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id))
    setEdges((prev) => prev.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
    setSelectedNode(null)
    setIsDrawerOpen(false)
  }

  // Delete selected edge
  const handleDeleteSelectedEdge = () => {
    if (!selectedEdge) return
    setEdges((prev) => prev.filter((e) => e.id !== selectedEdge.id))
    setSelectedEdge(null)
    setIsDrawerOpen(false)
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
        violated: false,
        ip_address: '',
        mac_address: '',
        subnet_mask: '',
        hostname: '',
        manufacturer: '',
        os_version: '',
        firmware_version: '',
        parentId: ''
      }
    }

    setNodes((prev) => [...prev, newNode])

    if (notebookId) {
      saveAsset(newNode)
    }
  }

  // Click to Add Zone Node
  const handleAddZone = () => {
    const randX = 200 + Math.floor(Math.random() * 300)
    const randY = 150 + Math.floor(Math.random() * 200)

    const newZoneNode: Node = {
      id: `zone-${Date.now()}`,
      type: 'zoneNode',
      position: { x: randX, y: randY },
      style: { width: 350, height: 250 },
      width: 350,
      height: 250,
      data: {
        label: 'Cybersecurity Zone',
        deviceType: 'zone',
        purdueLevel: 0,
        violated: false,
        zone_sal: 'Low',
        zone_type: 'Control',
        parentId: '',
        onResizeEnd: (w: number, h: number) => handleZoneResize(newZoneNode.id, w, h)
      }
    }

    setNodes((prev) => [...prev, newZoneNode])

    if (notebookId) {
      saveAsset(newZoneNode)
    }
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
    setSelectedEdge(null)
    setNodeViolations({})
    setEdgeViolations({})
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

            {/* Mute Canvas Motion toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsMuted(!isMuted)}
              className={`h-8 text-xs font-semibold active:scale-[0.98] ${
                isMuted 
                  ? 'border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10' 
                  : 'hover:border-cyan-500/40 hover:bg-cyan-500/5 text-muted-foreground'
              }`}
              aria-label={isMuted ? 'Unmute canvas motion' : 'Mute canvas motion'}
            >
              {isMuted ? <Play className="h-3.5 w-3.5 mr-1.5" /> : <Pause className="h-3.5 w-3.5 mr-1.5" />}
              {isMuted ? 'Unmute' : 'Mute'}
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
            
            <button
              type="button"
              onClick={handleAddZone}
              className="w-full px-2.5 py-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Shield className="h-3.5 w-3.5" />
              Add Cyber Zone
            </button>

            <div className="h-px bg-white/10 my-1" />

            <div className="flex flex-col gap-1.5 max-h-[45vh] overflow-y-auto pr-1 scrollbar-thin">
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
          <div className={`flex-1 h-full min-h-[480px] ${isMuted ? 'tetrel-canvas-muted' : ''}`}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onNodeDragStop={handleNodeDragStop}
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
                  if (n.type === 'zoneNode') return '#F97316'
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
              
              {/* IF NODE SELECTED */}
              {selectedNode && (
                <div className="space-y-4">
                  {selectedNode.type === 'zoneNode' ? (
                    // Zone node properties editor
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Zone Name</label>
                        <input
                          type="text"
                          value={selectedNode.data.label}
                          onChange={(e) => handleUpdateNodeProperty('label', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Security Assurance Level (SAL)</label>
                        <select
                          value={selectedNode.data.zone_sal || 'Low'}
                          onChange={(e) => handleUpdateNodeProperty('zone_sal', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Very High">Very High</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Zone Type</label>
                        <select
                          value={selectedNode.data.zone_type || 'Control'}
                          onChange={(e) => handleUpdateNodeProperty('zone_type', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="Control">Control</option>
                          <option value="DMZ">DMZ</option>
                          <option value="Corporate">Corporate</option>
                          <option value="Safety">Safety</option>
                          <option value="Offsite">Offsite</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    // Device node properties editor
                    <>
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

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Cybersecurity Zone (Parent)</label>
                        <select
                          value={selectedNode.data.parentId || ''}
                          onChange={(e) => handleUpdateNodeProperty('parentId', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">Auto-Detect (Coords)</option>
                          {nodes
                            .filter((n) => n.type === 'zoneNode')
                            .map((z) => (
                              <option key={z.id} value={z.id}>
                                {((z.data as any).label as string) || z.id}
                              </option>
                            ))}
                        </select>
                        {!selectedNode.data.parentId && (
                          <p className="text-[8px] text-muted-foreground/60 italic mt-0.5">
                            Currently auto-detects zone bounds based on (x,y) coordinates.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">IP Address</label>
                        <input
                          type="text"
                          value={selectedNode.data.ip_address || ''}
                          onChange={(e) => handleUpdateNodeProperty('ip_address', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="e.g. 192.168.1.10"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Subnet Mask</label>
                        <input
                          type="text"
                          value={selectedNode.data.subnet_mask || ''}
                          onChange={(e) => handleUpdateNodeProperty('subnet_mask', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="e.g. 255.255.255.0"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">MAC Address</label>
                        <input
                          type="text"
                          value={selectedNode.data.mac_address || ''}
                          onChange={(e) => handleUpdateNodeProperty('mac_address', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="e.g. 00:1A:2B:3C:4D:5E"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Hostname</label>
                        <input
                          type="text"
                          value={selectedNode.data.hostname || ''}
                          onChange={(e) => handleUpdateNodeProperty('hostname', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="e.g. plc-01"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Manufacturer / Vendor</label>
                        <input
                          type="text"
                          value={selectedNode.data.manufacturer || ''}
                          onChange={(e) => handleUpdateNodeProperty('manufacturer', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="e.g. Siemens"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">OS / Operating System</label>
                        <input
                          type="text"
                          value={selectedNode.data.os_version || ''}
                          onChange={(e) => handleUpdateNodeProperty('os_version', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="e.g. S7-1200"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Firmware Version</label>
                        <input
                          type="text"
                          value={selectedNode.data.firmware_version || ''}
                          onChange={(e) => handleUpdateNodeProperty('firmware_version', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          placeholder="e.g. 4.4.0"
                        />
                      </div>
                    </>
                  )}

                  {nodeViolations[selectedNode.id] && nodeViolations[selectedNode.id].length > 0 && (
                    <div className="p-2.5 border border-red-500/20 bg-red-500/5 rounded space-y-1">
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                        Audit Violations
                      </p>
                      <ul className="list-disc pl-3.5 text-[9px] text-red-600 dark:text-red-400 space-y-1 leading-relaxed">
                        {nodeViolations[selectedNode.id].map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteSelected}
                      className="w-full text-xs hover:bg-red-500/5 hover:border-red-500/30 text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete {selectedNode.type === 'zoneNode' ? 'Zone' : 'Asset'}
                    </Button>
                  </div>
                </div>
              )}

              {/* IF EDGE/CONNECTION SELECTED */}
              {selectedEdge && (
                <div className="space-y-4">
                  <div className="p-3 border rounded bg-card/45 border-border/40 text-[10px] font-mono leading-relaxed space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-cyan-400">
                      <Link className="h-3.5 w-3.5" />
                      Link Information
                    </p>
                    <p className="text-muted-foreground">
                      Source: {((nodes.find(n => n.id === selectedEdge.source)?.data) as any)?.label || selectedEdge.source}
                    </p>
                    <p className="text-muted-foreground">
                      Target: {((nodes.find(n => n.id === selectedEdge.target)?.data) as any)?.label || selectedEdge.target}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Communication Protocol</label>
                    <select
                      value={selectedEdge.data?.protocol || ''}
                      onChange={(e) => handleUpdateEdgeProperty('protocol', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-border/80 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="">[None / General]</option>
                      <option value="Modbus">Modbus</option>
                      <option value="DNP3">DNP3</option>
                      <option value="OPC-UA">OPC-UA</option>
                      <option value="Ethernet/IP">Ethernet/IP</option>
                      <option value="PROFINET">PROFINET</option>
                      <option value="HTTP">HTTP</option>
                      <option value="HTTPS">HTTPS</option>
                      <option value="SSH">SSH</option>
                      <option value="Telnet">Telnet</option>
                      <option value="FTP">FTP</option>
                      <option value="SFTP">SFTP</option>
                      <option value="SMB">SMB</option>
                      <option value="RDP">RDP</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between border border-border/40 rounded px-3 py-2 bg-background/30">
                    <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      {selectedEdge.data?.encrypted ? (
                        <Lock className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5 text-red-500" />
                      )}
                      Encrypted Connection
                    </label>
                    <input
                      type="checkbox"
                      checked={selectedEdge.data?.encrypted || false}
                      onChange={(e) => handleUpdateEdgeProperty('encrypted', e.target.checked)}
                      className="h-4 w-4 rounded border-border text-cyan-500 focus:ring-cyan-500"
                    />
                  </div>

                  {edgeViolations[selectedEdge.id] && edgeViolations[selectedEdge.id].length > 0 && (
                    <div className="p-2.5 border border-red-500/20 bg-red-500/5 rounded space-y-1">
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                        Audit Violations
                      </p>
                      <ul className="list-disc pl-3.5 text-[9px] text-red-600 dark:text-red-400 space-y-1 leading-relaxed">
                        {edgeViolations[selectedEdge.id].map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteSelectedEdge}
                      className="w-full text-xs hover:bg-red-500/5 hover:border-red-500/30 text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete Link
                    </Button>
                  </div>
                </div>
              )}

              {/* IF NEITHER NODE NOR EDGE SELECTED */}
              {!selectedNode && !selectedEdge && (
                <div className="text-center py-6 text-muted-foreground/60 space-y-2">
                  <Shield className="h-8 w-8 mx-auto text-muted-foreground/30" />
                  <p className="text-[10.5px] font-medium">No asset or link selected</p>
                  <p className="text-[9px] text-muted-foreground/80 max-w-[160px] mx-auto leading-relaxed">
                    Select a device node, cybersecurity zone, or link inside the drawing grid to inspect details and properties.
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
