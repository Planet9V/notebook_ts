'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { 
  ShieldAlert, 
  Cpu, 
  Network, 
  FileDown, 
  Printer, 
  CheckCircle2, 
  AlertTriangle,
  Pin,
  Sparkles,
  RefreshCw,
  FolderOpen,
  BookOpen,
  Sliders,
  X,
  ChevronRight,
  Play,
  Check,
  RotateCcw,
  Info,
  Lock,
  Activity,
  Terminal,
  Settings
} from 'lucide-react'
import { SourceListResponse } from '@/lib/types/api'
import { B2BComplianceChecklist, ComplianceCheck } from './B2BComplianceChecklist'
import { CSETNetworkCanvas } from './CSETNetworkCanvas'

interface B2BDraftingWorkspaceProps {
  notebookId: string
  notebookName: string
  notebookDescription?: string
  sources: SourceListResponse[]
  contacts?: Array<Record<string, string>>
}

interface ParameterState {
  clientName: string
  auditPrice: string
  duration: string
  startDate: string
  systemTarget: string
}

interface ChecklistState {
  clientName: boolean
  auditPrice: boolean
  duration: boolean
  startDate: boolean
  systemTarget: boolean
}

// ---------------------------------------------------------
// Default Professional B2B Templates
// ---------------------------------------------------------

const getSiliconAuditTemplate = (params: ParameterState, contacts: Array<Record<string, string>> = []) => {
  const primaryContact = contacts[0] || null
  const signatoryName = primaryContact ? primaryContact.name : "__________________________"
  const signatoryTitle = primaryContact ? primaryContact.title : "__________________________"
  const signatoryEmail = primaryContact ? ` (${primaryContact.email})` : ""

  return `
# STATEMENT OF WORK (SOW)
## HARDWARE CRYPTOGRAPHIC SILICON SECURITY AUDIT

This Statement of Work ("SOW") is entered into by and between **Tetrel Security Inc.** ("Tetrel") and **${params.clientName}** ("Client") as of **${params.startDate}**.

### 1. PROJECT OVERVIEW
Client requires a high-fidelity hardware cryptographic audit of their target system, **${params.systemTarget}**. Tetrel will conduct deep microarchitectural, physical side-channel, and cryptographic hardware security evaluations to guarantee system robustness against advanced adversaries.

### 2. SCOPE OF SERVICES
Tetrel will perform the following physical and cryptographic assessments:
*   **Microarchitectural Auditing:** Evaluation of transient execution vulnerabilities and instruction pipeline security.
*   **Physical Side-Channel Analysis (SCA):** Differential Electromagnetic Analysis (DEMA) and Differential Power Analysis (DPA) on key-exchange blocks.
*   **Fault Injection Resilience:** Laser and voltage glitching testing to verify memory controller lock-step controls.

### 3. HARDWARE SPEC SHEET ALIGNMENT
This audit incorporates compliance checks against **Tetrel HS-50 Silicon Cryptographic Auditing** specifications.

\${complianceMatrix}

### 4. TIMELINES & DELIVERABLES
The total estimated engagement duration is **${params.duration}**.

| Phase | Milestone / Deliverable | Target Schedule |
| :--- | :--- | :--- |
| Phase 1 | Initial Target Reconnaissance & Lab Setup | Week 2 |
| Phase 2 | Passive Electromagnetic & Power Acquisition | Week 5 |
| Phase 3 | Active Fault Injection & Glitching Campaign | Week 8 |
| Phase 4 | Executive Security Report & Remediations Draft | Final Week |

### 5. COMMERCIALS & FEES
Client shall pay Tetrel a flat fee of **${params.auditPrice}** for services rendered under this SOW.

### 6. SIGNATURE BLOCK
IN WITNESS WHEREOF, the parties have executed this SOW as of the Date first written above.

**FOR TETREL SECURITY INC.**
Name: __________________________
Title: VP of Hardware Security
Date: __________________________

**FOR ${params.clientName.toUpperCase()}**
Name: ${signatoryName}
Title: ${signatoryTitle}${signatoryEmail}
Date: __________________________
`
}

const getDatacenterAITemplate = (params: ParameterState, contacts: Array<Record<string, string>> = []) => {
  const primaryContact = contacts[0] || null
  const signatoryName = primaryContact ? primaryContact.name : "__________________________"
  const signatoryTitle = primaryContact ? primaryContact.title : "__________________________"
  const signatoryEmail = primaryContact ? ` (${primaryContact.email})` : ""

  return `
# STATEMENT OF WORK (SOW)
## DATACENTER AI GPU CLUSTER SECURITY REVIEW

This Statement of Work ("SOW") is entered into by and between **Tetrel Security Inc.** ("Tetrel") and **${params.clientName}** ("Client") as of **${params.startDate}**.

### 1. PROJECT OVERVIEW
Client requires a comprehensive security and risk review of their target deployment, **${params.systemTarget}**, specifically focusing on multi-node GPU cluster pipelines, model weights isolation, and training pipeline integrity.

### 2. SCOPE OF SERVICES
Tetrel will perform the following high-performance compute audits:
*   **Weights Isolation Reviews:** Auditing GPU memory space boundaries and RDMA network segments for context-bleeding.
*   **Tamper-Proof Training Pipeline Verification:** Hardening data-ingest checkpoints against poison payloads.
*   **AI Model Supply Chain Auditing:** Verifying weights cryptographic integrity and model quantization boundary side-channels.

### 3. HARDWARE SPEC SHEET ALIGNMENT
This audit incorporates compliance checks against **Tetrel DT-200 Datacenter Guard** specifications.

\${complianceMatrix}

### 4. TIMELINES & DELIVERABLES
The total estimated engagement duration is **${params.duration}**.

| Phase | Milestone / Deliverable | Target Schedule |
| :--- | :--- | :--- |
| Phase 1 | Cluster Topology & Segment Map Review | Week 1 |
| Phase 2 | RDMA & Shared-Memory Vulnerability Assessment | Week 3 |
| Phase 3 | Poison Attacks Simulation & Pipeline Hardening | Week 5 |
| Phase 4 | AI Infrastructure Audit Report & Remediation Guide | Final Week |

### 5. COMMERCIALS & FEES
Client shall pay Tetrel a flat fee of **${params.auditPrice}** for services rendered under this SOW.

### 6. SIGNATURE BLOCK
IN WITNESS WHEREOF, the parties have executed this SOW as of the Date first written above.

**FOR TETREL SECURITY INC.**
Name: __________________________
Title: Principal AI Systems Architect
Date: __________________________

**FOR ${params.clientName.toUpperCase()}**
Name: ${signatoryName}
Title: ${signatoryTitle}${signatoryEmail}
Date: __________________________
`
}

const getISO26262Template = (params: ParameterState, contacts: Array<Record<string, string>> = []) => {
  const primaryContact = contacts[0] || null
  const signatoryName = primaryContact ? primaryContact.name : "__________________________"
  const signatoryTitle = primaryContact ? primaryContact.title : "__________________________"
  const signatoryEmail = primaryContact ? ` (${primaryContact.email})` : ""

  return `
# STATEMENT OF WORK (SOW)
## AUTOMOTIVE ISO 26262 COMPLIANCE & SAFETY REVIEW

This Statement of Work ("SOW") is entered into by and between **Tetrel Security Inc.** ("Tetrel") and **${params.clientName}** ("Client") as of **${params.startDate}**.

### 1. PROJECT OVERVIEW
Client requires a functional safety audit of their target system, **${params.systemTarget}**, targeting ASIL Level D automotive semiconductor compliance standards under the ISO 26262 framework.

### 2. SCOPE OF SERVICES
Tetrel will conduct functional safety audits and hardware diagnostic analysis:
*   **ASIL Level D Hardware Verification:** Assessing microarchitectural single-point fault metric (SPFM) and latent fault metric (LFM).
*   **Diagnostic Coverage Modeling:** Validating built-in self-test (BIST) and hardware error-correcting codes (ECC).
*   **Failure Modes, Effects, and Diagnostic Analysis (FMEDA):** Reviewing circuit-level diagnostic integrity.

### 3. HARDWARE SPEC SHEET ALIGNMENT
This audit incorporates compliance checks against **ISO-26262 Automotive Hardware Verification Manual**.

\${complianceMatrix}

### 4. TIMELINES & DELIVERABLES
The total estimated engagement duration is **${params.duration}**.

| Phase | Milestone / Deliverable | Target Schedule |
| :--- | :--- | :--- |
| Phase 1 | FMEDA Assessment & Scope Alignment | Week 2 |
| Phase 2 | Diagnostic Coverage Simulation Campaigns | Week 6 |
| Phase 3 | Fault Injection Verification & ASIL D Metrics | Week 9 |
| Phase 4 | ISO 26262 Safety Case Certificate & Audit Report | Final Week |

### 5. COMMERCIALS & FEES
Client shall pay Tetrel a flat fee of **${params.auditPrice}** for services rendered under this SOW.

### 6. SIGNATURE BLOCK
IN WITNESS WHEREOF, the parties have executed this SOW as of the Date first written above.

**FOR TETREL SECURITY INC.**
Name: __________________________
Title: Director of Functional Safety
Date: __________________________

**FOR ${params.clientName.toUpperCase()}**
Name: ${signatoryName}
Title: ${signatoryTitle}${signatoryEmail}
Date: __________________________
`
}

// ---------------------------------------------------------
// Simple Markdown to HTML Parser
// ---------------------------------------------------------
function parseMarkdownToHtml(md: string): string {
  let html = md;
  
  // Replace Headers
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  
  // Replace Tables and Lists line-by-line
  const lines = html.split('\n');
  let inTable = false;
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Handle table
    if (line.startsWith('|') && line.endsWith('|')) {
      if (inList) {
        inList = false;
        lines[i] = '</ul>' + lines[i];
      }
      if (!inTable) {
        inTable = true;
        lines[i] = '<table><thead>' + renderTableRow(line, true) + '</thead><tbody>';
      } else if (line.includes('---')) {
        // Divider row
        lines[i] = '';
      } else {
        lines[i] = renderTableRow(line, false);
      }
      continue;
    } else {
      if (inTable) {
        inTable = false;
        lines[i] = '</tbody></table>' + lines[i];
      }
    }
    
    // Handle bullet list item
    if (line.startsWith('* ') || line.startsWith('- ')) {
      const content = line.substring(2).trim();
      if (!inList) {
        inList = true;
        lines[i] = '<ul><li>' + content + '</li>';
      } else {
        lines[i] = '<li>' + content + '</li>';
      }
    } else {
      if (inList) {
        inList = false;
        lines[i] = '</ul>' + lines[i];
      }
    }
  }
  
  // Close any active tags at the end of content
  if (inTable) {
    lines.push('</tbody></table>');
  }
  if (inList) {
    lines.push('</ul>');
  }
  
  html = lines.join('\n');
  
  // Replace Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Replace Linebreaks
  html = html.replace(/\n\n/g, '<p></p>');
  
  return html;
}

function renderTableRow(markdownLine: string, isHeader: boolean): string {
  const cells = markdownLine.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
  const tag = isHeader ? 'th' : 'td';
  const rowHtml = cells.map(cell => `<${tag}>${cell}</${tag}>`).join('');
  return `<tr>${rowHtml}</tr>`;
}

const ALL_COMPLIANCE_CHECKS: Record<string, Omit<ComplianceCheck, 'checked'>[]> = {
  'HS-50': [
    {
      id: 'hs50-dema',
      title: 'Power & EM Differential Analysis Resilience',
      description: 'Verify key-exchange block electromagnetic emission profiles against Tetrel\'s physical DEMA reference templates.',
      badge: 'HS-50 DEMA Compliant',
      specSource: 'HS-50 Hardware Audit Manual, Section 4.2',
      referenceText: 'All hardware key-exchange modules must undergo differential electromagnetic auditing to isolate leakages below -110dBm.'
    },
    {
      id: 'hs50-glitch',
      title: 'Glitch Injection step-lock verification',
      description: 'Laser voltage injection tests on memory boundaries to guarantee functional step-lock isolation.',
      badge: 'Laser Resistant',
      specSource: 'HS-50 Hardware Audit Manual, Section 5.9',
      referenceText: 'Step-lock registers must implement auto-recovery thresholds within 3 clock cycles of fault detection.'
    },
    {
      id: 'hs50-timing',
      title: 'Side-Channel Leakage Minimization',
      description: 'Confirm AES-256 block timing leakage metrics remain within acceptable noise floor tolerances.',
      badge: 'AES-Timing Clear',
      specSource: 'HS-50 Technical Spec Sheet, Page 12',
      referenceText: 'Timing deviations across cryptographic executions must not exceed 0.05% under high-concurrency threads.'
    }
  ],
  'DT-200': [
    {
      id: 'dt200-rdma',
      title: 'RDMA Context-Bleeding Separation',
      description: 'Inspect RDMA networking configuration to ensure absolute memory context isolation between GPU slices.',
      badge: 'RDMA Segment Active',
      specSource: 'DT-200 Security Architecture, Page 8',
      referenceText: 'Multi-node GPU architectures must enforce absolute address segregation across network-attached storage buffers.'
    },
    {
      id: 'dt200-tamper',
      title: 'Tamper-Proof Ingest Verification',
      description: 'Cryptographically sign model-weight uploads at target checkpoints to prevent poison payload execution.',
      badge: 'Payload Signed',
      specSource: 'DT-200 Ingest Guideline, Section 3.1',
      referenceText: 'SHA-512 hashes of baseline datasets must be validated at every epoch change to guarantee weight purity.'
    },
    {
      id: 'dt200-quant',
      title: 'Quantization Side-Channel Defense',
      description: 'Mitigate hardware timing side-channels during model quantization layer execution.',
      badge: 'Quantization Masked',
      specSource: 'DT-200 Core Blueprint, Section 7.4',
      referenceText: 'Layer-wise activation timing must be masked with random delay insertions (1-5µs) to prevent weights reconstruction.'
    }
  ],
  'ISO-26262': [
    {
      id: 'iso-spfm',
      title: 'ASIL-D Single-Point Fault Metric (SPFM)',
      description: 'Ensure hardware design achieves >99% diagnostic coverage for single-point faults.',
      badge: 'ASIL-D SPFM Validated',
      specSource: 'ISO-26262 Safety Standard, Part 5',
      referenceText: 'Critical logic pathways in automotive semiconductors require concurrent monitoring to exceed the 99% SPFM threshold.'
    },
    {
      id: 'iso-ecc',
      title: 'Error-Correcting Codes (ECC) Diagnostic Coverage',
      description: 'Verify double-bit error detection and single-bit correction coverage on SRAM cells.',
      badge: 'ECC Diagnostic Active',
      specSource: 'Automotive Safety Manual, Section 8.3',
      referenceText: 'ECC diagnostic coverage must be evaluated through simulated fault-injection sweeps at minimum and maximum temperatures.'
    },
    {
      id: 'iso-lfm',
      title: 'Latent Fault Metric (LFM) Boundary Checks',
      description: 'Validate that latent faults in safety-critical registers do not propagate to the primary system bus.',
      badge: 'LFM Boundary Verified',
      specSource: 'ISO-26262 safety guidelines, Page 34',
      referenceText: 'Self-test routines executed at power-on must test latent fault conditions in all redundant logic gates.'
    }
  ]
}

export function B2BDraftingWorkspace({
  notebookId,
  notebookName,
  notebookDescription = '',
  sources,
  contacts = []
}: B2BDraftingWorkspaceProps) {
  // 1. Initial State Definition
  const [params, setParams] = useState<ParameterState>({
    clientName: notebookName || 'Acme Labs',
    auditPrice: '$75,000',
    duration: '45 Days',
    startDate: 'June 1, 2026',
    systemTarget: 'HS-Silicon cryptographic key storage module v2'
  })

  const [checklist, setChecklist] = useState<ChecklistState>({
    clientName: false,
    auditPrice: false,
    duration: false,
    startDate: false,
    systemTarget: false
  })

  const [activeBlueprint, setActiveBlueprint] = useState<'silicon' | 'datacenter' | 'iso26262'>('silicon')
  const [documentContent, setDocumentContent] = useState<string>('')
  
  // RAG Spec Sheet Pins state
  const [pinnedSpecs, setPinnedSpecs] = useState<Record<string, boolean>>({
    'HS-50': true,
    'DT-200': false,
    'ISO-26262': false
  })

  // Compliance checklist states
  const [checkedChecks, setCheckedChecks] = useState<Record<string, boolean>>({
    'hs50-dema': true,
    'hs50-glitch': false,
    'hs50-timing': false,
    'dt200-rdma': false,
    'dt200-tamper': false,
    'dt200-quant': false,
    'iso-spfm': false,
    'iso-ecc': false,
    'iso-lfm': false
  })

  const [selectedCheck, setSelectedCheck] = useState<ComplianceCheck | null>(null)
  const [activeTab, setActiveTab] = useState<'editor' | 'canvas' | 'ledger'>('editor')
  const [activeThreatPaths, setActiveThreatPaths] = useState<string[][]>([])

  // Agentic Cockpit States
  const [isCockpitOpen, setIsCockpitOpen] = useState(false)
  const [workflowMode, setWorkflowMode] = useState<'auto' | 'manual'>('auto')
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false)
  const [activePromptAgent, setActivePromptAgent] = useState<string>('Skeptic Reviewer')

  const [agentConfigs, setAgentConfigs] = useState([
    { task: 'Topology Auditor', model: 'gpt-4o-mini', temp: 0.0, desc: 'Verifies network device layers and boundaries against Purdue specs.' },
    { task: 'Skeptic Reviewer', model: 'claude-3-5-sonnet', temp: 0.2, desc: 'Identifies microarchitectural vulnerabilities and timing attacks.' },
    { task: 'Drafting Copilot', model: 'deepseek-chat', temp: 0.7, desc: 'Assists in phrasing statement-of-work compliance milestones.' }
  ])

  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({
    'Topology Auditor': 'You are a strict network topology auditor enforcing structural boundaries in accordance with the ISA-99/IEC-62443 standard. Analyze the provided {{topology_graph}} and flag any direct physical/logical paths bridging the Corporate Enterprise network (Purdue Level 4) directly to the Industrial Control Core (Purdue Level 2/1).',
    'Skeptic Reviewer': 'You are a hardware security skeptic. Assume the design fails in production. Analyze the Statement of Work (SOW) text and point out any unmediated side-channel threats, inadequate glitch protection bounds, or microarchitectural leaks.',
    'Drafting Copilot': 'You are a professional B2B compliance drafter specializing in high-fidelity technical contracts. Help the user expand the compliance targets into robust, non-ambiguous milestones and deliverables.'
  })

  const [activePromptText, setActivePromptText] = useState<string>(
    'You are a hardware security skeptic. Assume the design fails in production. Analyze the Statement of Work (SOW) text and point out any unmediated side-channel threats, inadequate glitch protection bounds, or microarchitectural leaks.'
  )

  const [cockpitSteps, setCockpitSteps] = useState([
    { id: 1, name: 'Topology Hash Parse', status: 'success', model: 'gpt-4o-mini', latency: 140, tokens: 320, timestamp: '12:38:15' },
    { id: 2, name: 'Purdue Threat Check', status: 'success', model: 'claude-3-5-sonnet', latency: 820, tokens: 1540, timestamp: '12:38:16' },
    { id: 3, name: 'RAG Grounding Scan', status: 'success', model: 'deepseek-chat', latency: 450, tokens: 2180, timestamp: '12:38:16' },
  ])

  const [arbiterObjections, setArbiterObjections] = useState([
    { 
      id: 'obj-1', 
      agent: 'Skeptic Reviewer', 
      severity: 'critical', 
      claim: 'Direct IT-to-OT path identified between engineering HMI and billing domain controller. Dual-homing across Level 4 and Level 2 violates security policy DT-200.', 
      resolved: false,
      targetNodeId: 'node-ops-hmi',
      targetTab: 'canvas'
    },
    { 
      id: 'obj-2', 
      agent: 'Topology Auditor', 
      severity: 'warning', 
      claim: 'Level 1 PLC switches lack redundant power configurations required under target spec HS-50 Section 3.2.', 
      resolved: false,
      targetNodeId: 'node-field-plc',
      targetTab: 'canvas'
    }
  ])

  const [promptFeedback, setPromptFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Integrated Agentic Tracing, Budget Cap, and Custom Agent Builder States
  const [currentlyAuditedNodes, setCurrentlyAuditedNodes] = useState<string[]>([])
  const [costBudgetCap, setCostBudgetCap] = useState<number>(1.50)
  const [isCustomAgentModalOpen, setIsCustomAgentModalOpen] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentModel, setNewAgentModel] = useState('claude-3-5-sonnet')
  const [newAgentTemp, setNewAgentTemp] = useState(0.5)
  const [newAgentPrompt, setNewAgentPrompt] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [topologyGraph, setTopologyGraph] = useState<string>('{\n  "nodes": [],\n  "edges": []\n}')

  // Integrated pricing helpers
  const getModelPrice = (modelName: string) => {
    switch (modelName) {
      case 'claude-3-5-sonnet':
        return { input: 15.0, output: 75.0 }
      case 'gpt-4o':
        return { input: 5.0, output: 15.0 }
      case 'gpt-4o-mini':
        return { input: 0.15, output: 0.60 }
      case 'deepseek-chat':
        return { input: 0.14, output: 0.28 }
      default: // ollama/llama3
        return { input: 0.0, output: 0.0 }
    }
  }

  const calculatePipelineCost = useCallback(() => {
    let totalCost = 0
    agentConfigs.forEach((cfg) => {
      const price = getModelPrice(cfg.model)
      // Assume typical tasks use 1,500 input and 400 output tokens
      const inputCost = (1500 * price.input) / 1000000
      const outputCost = (400 * price.output) / 1000000
      totalCost += inputCost + outputCost
    })
    return totalCost
  }, [agentConfigs])

  // Custom Agent builder submit handler
  const handleAddCustomAgent = useCallback(() => {
    if (!newAgentName.trim()) {
      setPromptFeedback({
        type: 'error',
        message: 'Validation Error: Custom Agent Name cannot be empty.'
      })
      return
    }

    const taskKey = newAgentName.trim()
    setAgentConfigs(prev => [
      ...prev,
      {
        task: taskKey,
        model: newAgentModel,
        temp: newAgentTemp,
        desc: `Custom user-defined evaluator auditing ${taskKey} guidelines.`
      }
    ])

    setEditedPrompts(prev => ({
      ...prev,
      [taskKey]: newAgentPrompt || `You are an expert specialist in ${taskKey}. Audit the active Statement of Work and topology constraints based on your rules.`
    }))

    setCockpitSteps(prev => [
      ...prev,
      {
        id: prev.length + 1,
        name: taskKey,
        status: 'success',
        model: newAgentModel,
        latency: 180,
        tokens: 650,
        timestamp: new Date().toTimeString().split(' ')[0]
      }
    ])

    setNewAgentName('')
    setNewAgentPrompt('')
    setIsCustomAgentModalOpen(false)

    setPromptFeedback({
      type: 'success',
      message: `Custom agent [${taskKey}] integrated dynamically into workflow!`
    })
    setTimeout(() => setPromptFeedback(null), 3500)
  }, [newAgentName, newAgentModel, newAgentTemp, newAgentPrompt])

  // Upgraded Dynamic visual workflow step logging and ReactFlow tracing simulator
  const runWorkflowPipeline = useCallback(() => {
    // Check estimated budget limits before triggering pipeline
    const estimatedCost = calculatePipelineCost()
    if (estimatedCost > costBudgetCap) {
      setPromptFeedback({
        type: 'error',
        message: `Budget Exceeded: Estimated cost of $${estimatedCost.toFixed(4)} exceeds budget cap of $${costBudgetCap.toFixed(2)}. Downgrade models or raise cap.`
      })
      return
    }

    setIsWorkflowRunning(true)
    // Step 1: Auditing all devices in parallel
    setCurrentlyAuditedNodes(['node-ent-switch', 'node-ot-firewall', 'node-ops-hmi', 'node-field-plc'])
    setCockpitSteps(prev => prev.map((step, idx) => ({
      ...step,
      status: idx === 0 ? 'running' : 'pending',
      latency: 0
    })))
    
    setTimeout(() => {
      // Step 1 done -> Step 2 start: Purdue boundary threat paths visual glow highlights
      setCurrentlyAuditedNodes(['node-ent-switch', 'node-ops-hmi'])
      setCockpitSteps(prev => prev.map((step, idx) => {
        const matchingConfig = agentConfigs.find(c => c.task === step.name || c.task.includes(step.name.split(' ')[0]))
        const currentModel = matchingConfig ? matchingConfig.model : step.model
        if (idx === 0) return { ...step, status: 'success', latency: 125, model: currentModel }
        if (idx === 1) return { ...step, status: 'running', model: currentModel }
        return step
      }))
      
      setTimeout(() => {
        // Step 2 done -> Step 3 start: RAG Grounding field zone compliance checks
        setCurrentlyAuditedNodes(['node-ops-hmi', 'node-field-plc'])
        setCockpitSteps(prev => prev.map((step, idx) => {
          const matchingConfig = agentConfigs.find(c => c.task === step.name || c.task.includes(step.name.split(' ')[0]))
          const currentModel = matchingConfig ? matchingConfig.model : step.model
          if (idx === 1) return { ...step, status: 'success', latency: 740, model: currentModel }
          if (idx === 2) return { ...step, status: 'running', model: currentModel }
          return step
        }))
        
        setTimeout(() => {
          // Step 3 done: Clean highlights and clear workflow running state
          setCurrentlyAuditedNodes([])
          setCockpitSteps(prev => prev.map((step, idx) => {
            const matchingConfig = agentConfigs.find(c => c.task === step.name || c.task.includes(step.name.split(' ')[0]))
            const currentModel = matchingConfig ? matchingConfig.model : step.model
            if (idx === 2) return { ...step, status: 'success', latency: 410, model: currentModel }
            return step
          }))
          setIsWorkflowRunning(false)
        }, 800)
      }, 800)
    }, 600)
  }, [agentConfigs, costBudgetCap, calculatePipelineCost])

  // Handle live prompt template overrides with validation checks
  const handleApplyPrompt = useCallback(() => {
    // Basic backend Jinja variable checks simulator
    const activeText = activePromptText
    let requiredVar = ''
    if (activePromptAgent === 'Topology Auditor') requiredVar = '{{topology_graph}}'
    if (activePromptAgent === 'Skeptic Reviewer') requiredVar = '{{sow_content}}'
    
    // Simulating the validator guardrails
    if (requiredVar && !activeText.includes(requiredVar)) {
      setPromptFeedback({
        type: 'error',
        message: `Validation Error: Missing required template variable ${requiredVar}. Action aborted.`
      })
      return
    }

    setEditedPrompts(prev => ({
      ...prev,
      [activePromptAgent]: activeText
    }))
    setPromptFeedback({
      type: 'success',
      message: 'System prompt updated dynamically. New guidelines bound to future graph runs.'
    })

    // Auto clear feedback after 3 seconds
    setTimeout(() => {
      setPromptFeedback(null)
    }, 3000)
  }, [activePromptText, activePromptAgent])

  // Sync active text box on agent select change
  const handleSelectPromptAgent = useCallback((agentName: string) => {
    setActivePromptAgent(agentName)
    setActivePromptText(editedPrompts[agentName] || '')
  }, [editedPrompts])

  const handleLocateObjection = useCallback((obj: any) => {
    if (obj.targetTab) {
      setActiveTab(obj.targetTab as any)
      if (obj.targetNodeId && obj.targetTab === 'canvas') {
        setSelectedNodeId(obj.targetNodeId)
        setCurrentlyAuditedNodes([obj.targetNodeId])
        setTimeout(() => setCurrentlyAuditedNodes([]), 2000)
      }
      setPromptFeedback({
        type: 'success',
        message: `Located target for [${obj.agent}] objection on active ${obj.targetTab} view.`
      })
      setTimeout(() => setPromptFeedback(null), 3000)
    }
  }, [])

  const handleValidationSuccess = useCallback((verifiedIds: string[], threatPaths: string[][], rawPayload?: any) => {
    setActiveThreatPaths(threatPaths || [])
    if (rawPayload) {
      setTopologyGraph(JSON.stringify(rawPayload, null, 2))
    }
    setCheckedChecks(prev => {
      const next = { ...prev }
      const networkDriven = [
        'hs50-dema',
        'hs50-glitch',
        'hs50-timing',
        'dt200-rdma',
        'dt200-tamper',
        'dt200-quant',
        'iso-spfm',
        'iso-ecc',
        'iso-lfm'
      ]
      networkDriven.forEach(id => {
        next[id] = verifiedIds.includes(id)
      })
      return next
    })
  }, [])

  // Dynamically assemble active compliance checks based on pinned specs
  const activeChecks: ComplianceCheck[] = []
  Object.keys(pinnedSpecs).forEach(specKey => {
    if (pinnedSpecs[specKey] && ALL_COMPLIANCE_CHECKS[specKey]) {
      ALL_COMPLIANCE_CHECKS[specKey].forEach(check => {
        activeChecks.push({
          ...check,
          checked: !!checkedChecks[check.id]
        })
      })
    }
  })

  // Keep selectedCheck in sync or reset if it is unpinned
  useEffect(() => {
    if (selectedCheck) {
      const stillActive = activeChecks.some(c => c.id === selectedCheck.id)
      if (!stillActive) {
        setSelectedCheck(activeChecks[0] || null)
      } else {
        const currentCheck = activeChecks.find(c => c.id === selectedCheck.id)
        if (currentCheck && currentCheck.checked !== selectedCheck.checked) {
          setSelectedCheck(currentCheck)
        }
      }
    } else if (activeChecks.length > 0) {
      setSelectedCheck(activeChecks[0])
    }
  }, [pinnedSpecs, checkedChecks])

  const handleToggleCheck = (id: string) => {
    setCheckedChecks(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // 2. Blueprint loading / parameter interpolation hook
  useEffect(() => {
    let updatedContent = ''
    if (activeBlueprint === 'silicon') {
      updatedContent = getSiliconAuditTemplate(params, contacts)
    } else if (activeBlueprint === 'datacenter') {
      updatedContent = getDatacenterAITemplate(params, contacts)
    } else if (activeBlueprint === 'iso26262') {
      updatedContent = getISO26262Template(params, contacts)
    }

    // Compile Verified Compliance Matrix Table
    const verifiedChecks = activeChecks.filter(c => c.checked)
    let complianceMatrix = ''
    if (verifiedChecks.length > 0) {
      complianceMatrix = `
### 3.5 AI-VERIFIED SOW COMPLIANCE MATRIX
The following hardware safety and compliance requirements have been formally audited and verified against Tetrel's product catalog:

| Requirement / Standard | Verification Audit Method | Reference Spec Sheet | Status |
| :--- | :--- | :--- | :--- |
${verifiedChecks.map(c => `| **${c.badge}** | ${c.description} | *${c.specSource}* | **VERIFIED** |`).join('\n')}
`
    } else {
      complianceMatrix = `
### 3.5 AI-VERIFIED SOW COMPLIANCE MATRIX
*No safety specifications or product catalog standards have been verified for this proposal draft yet.*
`
    }

    // Inject complianceMatrix placeholder into SOW template
    updatedContent = updatedContent.replace('${complianceMatrix}', complianceMatrix)

    // Apply high-contrast span highlights to key parameters in the document
    const highlight = (val: string, keyName: string) => 
      `<span class="bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded font-mono text-xs font-semibold" title="AI Parameter: ${keyName}">${val}</span>`

    const highlightGreen = (val: string, keyName: string) => 
      `<span class="bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-mono text-xs font-semibold" title="CRM Dossier: ${keyName}">${val}</span>`

    let highlightedContent = updatedContent
      .replace(new RegExp(escapeRegExp(params.clientName), 'g'), highlight(params.clientName, 'Client Name'))
      .replace(new RegExp(escapeRegExp(params.auditPrice), 'g'), highlight(params.auditPrice, 'Audit Price'))
      .replace(new RegExp(escapeRegExp(params.duration), 'g'), highlight(params.duration, 'Duration'))
      .replace(new RegExp(escapeRegExp(params.startDate), 'g'), highlight(params.startDate, 'Start Date'))
      .replace(new RegExp(escapeRegExp(params.systemTarget), 'g'), highlight(params.systemTarget, 'System Target'))

    // Highlight contacts/signatory values if injected
    const primaryContact = contacts[0]
    if (primaryContact) {
      if (primaryContact.name) {
        highlightedContent = highlightedContent.replace(new RegExp(escapeRegExp(primaryContact.name), 'g'), highlightGreen(primaryContact.name, 'Signatory Name'))
      }
      if (primaryContact.title) {
        highlightedContent = highlightedContent.replace(new RegExp(escapeRegExp(primaryContact.title), 'g'), highlightGreen(primaryContact.title, 'Signatory Title'))
      }
    }

    setDocumentContent(highlightedContent)
  }, [activeBlueprint, params, contacts, checkedChecks, pinnedSpecs])

  // Helper to escape regex special characters
  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // 3. Exporter handlers
  const isExportReady = Object.values(checklist).every(v => v === true)

  const handleExportDocx = () => {
    if (!isExportReady) return

    // Strip out the custom parameter highlighter HTML span wrappers back to plain text for corporate export
    let cleanMd = documentContent.replace(/<span[^>]*>(.*?)<\/span>/g, '$1')
    
    // Parse cleaned markdown to standard Word HTML compilation
    const htmlBody = parseMarkdownToHtml(cleanMd)
    
    const docxHeader = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Tetrel Security SOW Draft</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; color: #1e293b; padding: 40px; }
          h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-top: 30px; font-size: 22pt; font-weight: bold; }
          h2 { color: #0284c7; margin-top: 24px; font-size: 16pt; font-weight: bold; }
          h3 { color: #334155; margin-top: 18px; font-size: 13pt; font-weight: bold; }
          p, li { margin-bottom: 12px; font-size: 11pt; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-size: 10pt; }
          th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
          .confidential-header { text-align: right; color: #ef4444; font-size: 9pt; font-weight: bold; letter-spacing: 1px; margin-bottom: 30px; }
          .signature-title { font-weight: bold; margin-top: 25px; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="confidential-header">TETREL SECURITY INC. - STRICTLY CONFIDENTIAL</div>
        ${htmlBody}
      </body>
      </html>
    `

    const blob = new Blob(['\ufeff' + docxHeader], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `SOW_${params.clientName.replace(/\s+/g, '_')}_Tetrel.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintPdf = () => {
    if (!isExportReady) return
    window.print()
  }

  const toggleSpecPin = (specId: string) => {
    setPinnedSpecs(prev => ({
      ...prev,
      [specId]: !prev[specId]
    }))
  }

  // Helper to retrieve progress stats for each pinned specification sheet
  const getSpecStats = (specKey: string) => {
    const specChecks = ALL_COMPLIANCE_CHECKS[specKey] || []
    const total = specChecks.length
    const verified = specChecks.filter(c => checkedChecks[c.id]).length
    const percent = total > 0 ? Math.round((verified / total) * 100) : 0
    return { total, verified, percent }
  }

  const renderDraftsmanView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0 w-full overflow-hidden">
        {/* Left column: scrollable controls */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 max-h-[calc(100vh-220px)] min-h-0">
          
          {/* WARNING DISCLAIMER BANNER */}
          <Card className="border-amber-500/20 bg-amber-500/5 text-amber-200 shadow-sm border-white/5 bg-slate-900/60 backdrop-blur-md">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400">Compliance & Liability Safeguard</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  Internal draft only. Verify all legal clauses, estimated days, and hardware prices prior to proposal export.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* BLUEPRINT SELECTORS */}
          <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-500 animate-spin" style={{ animationDuration: '4s' }} />
                <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">One-Click Proposal Blueprints</CardTitle>
              </div>
              <CardDescription className="text-[10px] uppercase tracking-wider text-muted-foreground">Select a styled pre-configured sales template</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2.5 pt-0">
              {/* Silicon Audit SOW */}
              <div 
                onClick={() => setActiveBlueprint('silicon')}
                className={`p-3 border rounded-lg transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${
                  activeBlueprint === 'silicon'
                    ? 'border-cyan-500 bg-cyan-500/5 shadow-md shadow-cyan-500/5'
                    : 'hover:bg-slate-800/40 border-white/5 bg-slate-950/20'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeBlueprint === 'silicon' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-800 text-muted-foreground'}`}>
                  <Cpu className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Silicon Security SOW</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Hardware auditing & EM SCA analyses</p>
                </div>
                {activeBlueprint === 'silicon' && <CheckCircle2 className="h-4 w-4 text-cyan-400" />}
              </div>

              {/* Datacenter AI Review */}
              <div 
                onClick={() => setActiveBlueprint('datacenter')}
                className={`p-3 border rounded-lg transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${
                  activeBlueprint === 'datacenter'
                    ? 'border-cyan-500 bg-cyan-500/5 shadow-md shadow-cyan-500/5'
                    : 'hover:bg-slate-800/40 border-white/5 bg-slate-950/20'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeBlueprint === 'datacenter' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-800 text-muted-foreground'}`}>
                  <Network className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Datacenter AI Risk Review</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">GPU clustering isolation & training reviews</p>
                </div>
                {activeBlueprint === 'datacenter' && <CheckCircle2 className="h-4 w-4 text-cyan-400" />}
              </div>

              {/* ISO 26262 Review */}
              <div 
                onClick={() => setActiveBlueprint('iso26262')}
                className={`p-3 border rounded-lg transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${
                  activeBlueprint === 'iso26262'
                    ? 'border-cyan-500 bg-cyan-500/5 shadow-md shadow-cyan-500/5'
                    : 'hover:bg-slate-800/40 border-white/5 bg-slate-950/20'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeBlueprint === 'iso26262' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-800 text-muted-foreground'}`}>
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">ISO 26262 Compliance Review</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">ASIL-D diagnostics & semiconductor compliance</p>
                </div>
                {activeBlueprint === 'iso26262' && <CheckCircle2 className="h-4 w-4 text-cyan-400" />}
              </div>
            </CardContent>
          </Card>

          {/* SPEC SHEET PINNING BRIDGE */}
          <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md shadow-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-cyan-500" />
                <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">Product Catalog RAG Bridge</CardTitle>
              </div>
              <CardDescription className="text-[10px] uppercase tracking-wider text-muted-foreground">Pin hardware security specifications directly to SOW context</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-0">
              {/* Catalog Spec 1 */}
              <div className="flex items-center justify-between p-2.5 border rounded-lg border-white/5 bg-slate-950/25">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Cpu className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-foreground truncate">Tetrel HS-50 Silicon Spec</p>
                    <p className="text-[9px] text-muted-foreground truncate">Active side-channel hardware metrics</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant={pinnedSpecs['HS-50'] ? 'default' : 'outline'}
                  className={`h-7 text-[10px] font-mono font-bold uppercase tracking-wider active:scale-[0.98] ${
                    pinnedSpecs['HS-50'] 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20' 
                      : 'border-white/10 hover:bg-slate-800 text-foreground'
                  }`}
                  onClick={() => toggleSpecPin('HS-50')}
                >
                  {pinnedSpecs['HS-50'] ? 'Pinned' : 'Pin'}
                </Button>
              </div>

              {/* Catalog Spec 2 */}
              <div className="flex items-center justify-between p-2.5 border rounded-lg border-white/5 bg-slate-950/25">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Network className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-foreground truncate">Tetrel DT-200 Datacenter</p>
                    <p className="text-[9px] text-muted-foreground truncate">Cluster security blueprints</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant={pinnedSpecs['DT-200'] ? 'default' : 'outline'}
                  className={`h-7 text-[10px] font-mono font-bold uppercase tracking-wider active:scale-[0.98] ${
                    pinnedSpecs['DT-200'] 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20' 
                      : 'border-white/10 hover:bg-slate-800 text-foreground'
                  }`}
                  onClick={() => toggleSpecPin('DT-200')}
                >
                  {pinnedSpecs['DT-200'] ? 'Pinned' : 'Pin'}
                </Button>
              </div>

              {/* Catalog Spec 3 */}
              <div className="flex items-center justify-between p-2.5 border rounded-lg border-white/5 bg-slate-950/25">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-foreground truncate">ISO-26262 Automotive Safety</p>
                    <p className="text-[9px] text-muted-foreground truncate">Automotive standard FMEDA audit manuals</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant={pinnedSpecs['ISO-26262'] ? 'default' : 'outline'}
                  className={`h-7 text-[10px] font-mono font-bold uppercase tracking-wider active:scale-[0.98] ${
                    pinnedSpecs['ISO-26262'] 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20' 
                      : 'border-white/10 hover:bg-slate-800 text-foreground'
                  }`}
                  onClick={() => toggleSpecPin('ISO-26262')}
                >
                  {pinnedSpecs['ISO-26262'] ? 'Pinned' : 'Pin'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PARAMETERS INPUTS */}
          <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                SOW Parameter Validation
              </CardTitle>
              <CardDescription className="text-[10px] uppercase tracking-wider text-muted-foreground">Refine values & check to approve for corporate export</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* Client Name Input */}
              <div className="p-3 border rounded-lg border-white/5 bg-slate-950/25 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">Client Name</label>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="checkbox" 
                      checked={checklist.clientName} 
                      onChange={(e) => setChecklist(prev => ({ ...prev, clientName: e.target.checked }))}
                      className="rounded text-cyan-500 border-white/10 h-3.5 w-3.5 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                    />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Verify</span>
                  </div>
                </div>
                <Input 
                  value={params.clientName}
                  onChange={(e) => setParams(prev => ({ ...prev, clientName: e.target.value }))}
                  className="h-8 text-xs font-bold border-white/5 bg-slate-950/40 text-foreground focus-visible:ring-cyan-500/50"
                />
              </div>

              {/* Target System Input */}
              <div className="p-3 border rounded-lg border-white/5 bg-slate-950/25 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">Target Security System</label>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="checkbox" 
                      checked={checklist.systemTarget} 
                      onChange={(e) => setChecklist(prev => ({ ...prev, systemTarget: e.target.checked }))}
                      className="rounded text-cyan-500 border-white/10 h-3.5 w-3.5 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                    />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Verify</span>
                  </div>
                </div>
                <Input 
                  value={params.systemTarget}
                  onChange={(e) => setParams(prev => ({ ...prev, systemTarget: e.target.value }))}
                  className="h-8 text-xs font-bold border-white/5 bg-slate-950/40 text-foreground focus-visible:ring-cyan-500/50"
                />
              </div>

              {/* Audit Price Input */}
              <div className="p-3 border rounded-lg border-white/5 bg-slate-950/25 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">Estimated Price</label>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="checkbox" 
                      checked={checklist.auditPrice} 
                      onChange={(e) => setChecklist(prev => ({ ...prev, auditPrice: e.target.checked }))}
                      className="rounded text-cyan-500 border-white/10 h-3.5 w-3.5 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                    />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Verify</span>
                  </div>
                </div>
                <Input 
                  value={params.auditPrice}
                  onChange={(e) => setParams(prev => ({ ...prev, auditPrice: e.target.value }))}
                  className="h-8 text-xs font-mono font-bold border-white/5 bg-slate-950/40 text-cyan-400 focus-visible:ring-cyan-500/50"
                />
              </div>

              {/* Estimated Duration & Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg border-white/5 bg-slate-950/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">Duration</label>
                    <input 
                      type="checkbox" 
                      checked={checklist.duration} 
                      onChange={(e) => setChecklist(prev => ({ ...prev, duration: e.target.checked }))}
                      className="rounded text-cyan-500 border-white/10 h-3 w-3 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                    />
                  </div>
                  <Input 
                    value={params.duration}
                    onChange={(e) => setParams(prev => ({ ...prev, duration: e.target.value }))}
                    className="h-8 text-xs font-bold border-white/5 bg-slate-950/40 text-foreground focus-visible:ring-cyan-500/50"
                  />
                </div>

                <div className="p-3 border rounded-lg border-white/5 bg-slate-950/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">Start Date</label>
                    <input 
                      type="checkbox" 
                      checked={checklist.startDate} 
                      onChange={(e) => setChecklist(prev => ({ ...prev, startDate: e.target.checked }))}
                      className="rounded text-cyan-500 border-white/10 h-3 w-3 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                    />
                  </div>
                  <Input 
                    value={params.startDate}
                    onChange={(e) => setParams(prev => ({ ...prev, startDate: e.target.value }))}
                    className="h-8 text-xs font-bold border-white/5 bg-slate-950/40 text-foreground focus-visible:ring-cyan-500/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* COMPLIANCE CHECKLIST integrated at bottom of scrollable left panel */}
          <div className="min-h-[400px] flex-shrink-0">
            <B2BComplianceChecklist
              checks={activeChecks}
              onToggleCheck={handleToggleCheck}
              selectedCheck={selectedCheck}
              onSelectCheck={setSelectedCheck}
            />
          </div>
        </div>

        {/* Right column: massive SOW Editor */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 border rounded-xl bg-slate-950/40 border-white/5 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 [&_.w-md-editor]:!static [&_.w-md-editor]:!w-full [&_.w-md-editor]:!h-full [&_.w-md-editor-content]:overflow-y-auto">
            <MarkdownEditor
              value={documentContent}
              onChange={(val) => setDocumentContent(val || '')}
              height={700}
              preview="live"
              placeholder="Loading corporate SOW blueprint..."
              className="w-full h-full min-h-[500px]"
            />
          </div>
        </div>
      </div>
    )
  }

  const renderCanvasView = () => {
    return (
      <div className="w-full h-full border rounded-xl bg-slate-950/40 border-white/5 overflow-hidden flex flex-col">
        <CSETNetworkCanvas 
          onValidationSuccess={handleValidationSuccess} 
          currentlyAuditedNodes={currentlyAuditedNodes}
          activeThreatPaths={activeThreatPaths}
          selectedNodeId={selectedNodeId}
        />
      </div>
    )
  }

  const renderLedgerView = () => {
    const verifiedChecksCount = activeChecks.filter(c => c.checked).length
    const totalChecksCount = activeChecks.length
    const globalPercent = totalChecksCount > 0 ? Math.round((verifiedChecksCount / totalChecksCount) * 100) : 0
    
    // Donut chart math
    const radius = 50
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (globalPercent / 100) * circumference

    return (
      <div className="w-full h-full overflow-y-auto pr-2 pb-6 space-y-6 max-h-[calc(100vh-220px)]">
        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Donut compliance chart */}
          <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md shadow-2xl flex flex-col justify-between p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                Global Compliance Donut
              </CardTitle>
            </CardHeader>
            <div className="flex flex-col items-center justify-center py-6 relative">
              <svg className="w-40 h-40 transform -rotate-90">
                {/* Background Circle */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="stroke-slate-800"
                  strokeWidth="10"
                  fill="transparent"
                />
                {/* Progress Circle with cyan glow */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="stroke-cyan-500 transition-all duration-1000 ease-out"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              {/* Central Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold font-mono text-cyan-400">
                  {globalPercent}%
                </span>
                <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mt-1">
                  VERIFIED
                </span>
              </div>
            </div>
            <div className="text-center pt-2 border-t border-white/5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {verifiedChecksCount} OF {totalChecksCount} SAFETY TARGETS ACTIVE
            </div>
          </Card>

          {/* Card 2: Regulation progress meters */}
          <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md shadow-2xl flex flex-col justify-between p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                Regulation Specific Metrics
              </CardTitle>
            </CardHeader>
            
            <div className="space-y-6 py-2 flex-1 flex flex-col justify-center">
              {Object.keys(ALL_COMPLIANCE_CHECKS).map(specKey => {
                const stats = getSpecStats(specKey)
                const isPinned = pinnedSpecs[specKey]
                return (
                  <div key={specKey} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className={`font-bold tracking-wider ${isPinned ? 'text-cyan-400' : 'text-muted-foreground/60'}`}>
                        {specKey} SPECIFICATION
                      </span>
                      <span className={isPinned ? 'text-foreground' : 'text-muted-foreground/40'}>
                        {stats.verified}/{stats.total} Checked
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full border border-white/5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isPinned 
                            ? 'bg-gradient-to-r from-cyan-600 to-cyan-400' 
                            : 'bg-slate-800'
                        }`}
                        style={{ width: `${stats.percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="text-left pt-2 border-t border-white/5 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
              PIN SPECS TO ACTIVATE REGULATORY GAUGES
            </div>
          </Card>

          {/* Card 3: Active threat paths */}
          <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md shadow-2xl p-6 flex flex-col justify-between">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                Active Purdue Path Violations
              </CardTitle>
            </CardHeader>

            <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 space-y-3 py-2">
              {activeThreatPaths.length > 0 ? (
                activeThreatPaths.map((path, idx) => (
                  <div 
                    key={idx}
                    className="p-3 border border-red-500/20 bg-red-500/5 rounded-lg text-[10px] text-red-400 font-mono leading-relaxed"
                  >
                    <p className="font-bold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                      UNMEDIATED L1-L4 PATH
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      {path.map((nodeId, nodeIdx) => {
                        return (
                          <React.Fragment key={nodeId}>
                            {nodeIdx > 0 && <span className="text-red-500/60 font-mono">{"->"}</span>}
                            <span className="bg-red-500/10 border border-red-500/25 px-1.5 py-0.5 rounded text-[9px] truncate max-w-[90px]">
                              {nodeId}
                            </span>
                          </React.Fragment>
                        )
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-xs font-bold font-mono tracking-wider uppercase text-emerald-500">
                      TOPOLOGY SECURE
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 max-w-[200px] mx-auto mt-1 leading-relaxed">
                      All Level 1-2 pathways traversing to Level 4 are fully isolated via active boundary gateways.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-left pt-2 border-t border-white/5 text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-4">
              THREAT ENGINE DRIVEN BY NETWORKX
            </div>
          </Card>
        </div>

        {/* Card 4: RAG Grounding reader - spans full width below the top 3 cards */}
        <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md shadow-2xl p-6">
          <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                RAG Grounding Document Reader
              </CardTitle>
              {selectedCheck && (
                <Badge variant="outline" className="h-5 text-[9px] font-mono border-white/10 bg-slate-950 text-muted-foreground">
                  SOURCE: {selectedCheck.specSource}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          {selectedCheck ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-extrabold font-mono text-slate-200 tracking-wide uppercase">
                  {selectedCheck.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedCheck.description}
                </p>
              </div>
              <div className="p-4 border border-dashed border-cyan-500/10 bg-slate-950/60 rounded text-xs italic text-slate-300 font-mono leading-relaxed relative">
                <span className="absolute -top-2 right-4 px-2 py-0.5 bg-slate-900 border border-white/5 text-[8.5px] font-mono text-muted-foreground uppercase tracking-wider rounded">
                  Raw Grounding Text
                </span>
                "{selectedCheck.referenceText}"
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 py-0.5">
                  AUDIT CLASS: {selectedCheck.badge}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
              <p className="text-xs font-bold font-mono tracking-wider uppercase text-muted-foreground">
                No Grounding Check Selected
              </p>
              <p className="text-[10px] text-muted-foreground/80 max-w-[240px] leading-relaxed">
                Click on a compliance target in the SOW Draftsman tab to read its verified specifications.
              </p>
            </div>
          )}
        </Card>
      </div>
    )
  }

  const compileSandboxPreview = useCallback(() => {
    let text = activePromptText
    if (text.includes('{{topology_graph}}')) {
      const graphMarkup = `<span class="block mt-1.5 p-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded font-mono text-[9px] overflow-x-auto select-all max-h-48 overflow-y-auto whitespace-pre-wrap">${topologyGraph}</span>`
      text = text.replace('{{topology_graph}}', graphMarkup)
    } else if (activePromptAgent === 'Topology Auditor') {
      text += `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-mono bg-red-500/20 border border-red-500/30 text-red-400 ml-1 mt-1 font-bold">[!] MISSING {{topology_graph}} TAG</span>`
    }
    if (text.includes('{{sow_content}}')) {
      const sowSnippet = documentContent ? documentContent.slice(0, 800) + (documentContent.length > 800 ? '\n... (truncated for preview)' : '') : 'No active Statement of Work document compiled yet.'
      const SOWMarkup = `<span class="block mt-1.5 p-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded font-mono text-[9px] overflow-x-auto whitespace-pre-wrap">${sowSnippet}</span>`
      text = text.replace('{{sow_content}}', SOWMarkup)
    } else if (activePromptAgent === 'Skeptic Reviewer') {
      text += `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-mono bg-red-500/20 border border-red-500/30 text-red-400 ml-1 mt-1 font-bold">[!] MISSING {{sow_content}} TAG</span>`
    }
    if (text.includes('{{regulatory_framework}}')) {
      const activeSpecs = Object.keys(pinnedSpecs).filter(k => pinnedSpecs[k]).join(', ') || 'None Pinned'
      const specMarkup = `<span class="inline-block px-1.5 py-0.2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded font-mono font-bold">${activeSpecs}</span>`
      text = text.replace('{{regulatory_framework}}', specMarkup)
    }
    return text
  }, [activePromptText, activePromptAgent, topologyGraph, documentContent, pinnedSpecs])

  const getPromptStatus = useCallback(() => {
    let required = ''
    if (activePromptAgent === 'Topology Auditor') required = '{{topology_graph}}'
    if (activePromptAgent === 'Skeptic Reviewer') required = '{{sow_content}}'
    if (!required) return { status: 'VALID', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' }
    if (activePromptText.includes(required)) {
      return { status: 'VALID', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' }
    }
    return { status: 'VARIABLE MISSING', color: 'text-red-400 border-red-500/30 bg-red-500/5 animate-pulse' }
  }, [activePromptText, activePromptAgent])

  const renderAgenticCockpit = () => {
    const checkVariablePresent = (variable: string) => {
      return activePromptText.includes(variable)
    }

    return (
      <div className="w-[420px] flex-shrink-0 h-full border rounded-xl bg-slate-905/90 backdrop-blur-md border-white/5 shadow-2xl flex flex-col min-h-0 overflow-hidden transition-all duration-300">
        {/* Cockpit Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400 animate-pulse" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
              [Agentic Workflow Cockpit]
            </h3>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/5 active:scale-95"
            onClick={() => setIsCockpitOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Cockpit Inner Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
          {/* Dispatch Controls & Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">
                Execution Mode
              </span>
              <div className="flex items-center bg-slate-950 p-0.5 rounded border border-white/5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setWorkflowMode('auto')}
                  className={`px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${
                    workflowMode === 'auto'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Co-Pilot (Auto)
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowMode('manual')}
                  className={`px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${
                    workflowMode === 'manual'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            <Button
              onClick={runWorkflowPipeline}
              disabled={isWorkflowRunning}
              className={`w-full h-9 font-mono font-bold text-xs uppercase tracking-wider active:scale-[0.98] ${
                isWorkflowRunning
                  ? 'bg-cyan-950 border border-cyan-500/30 text-cyan-400 cursor-not-allowed'
                  : workflowMode === 'auto'
                  ? 'bg-slate-850 text-muted-foreground border border-white/5 hover:bg-slate-700/60'
                  : 'bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/20 text-white shadow-lg shadow-cyan-500/10'
              }`}
            >
              {isWorkflowRunning ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Running Compliance Audit...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Run Compliance Audit
                </>
              )}
            </Button>
            {workflowMode === 'auto' && (
              <p className="text-[9px] font-mono text-muted-foreground leading-normal mt-1 border border-white/5 bg-slate-950/20 p-2 rounded">
                [CO-PILOT ACTIVE] Pipeline triggers automatically on drag or keystroke shifts (350ms debounce).
              </p>
            )}
          </div>

          {/* Cost & Token Budget Estimator Slider */}
          <div className="space-y-3 p-3 border border-white/5 rounded-lg bg-slate-950/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">
                Token Budget Cap
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-400">
                ${costBudgetCap.toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.05"
                max="2.50"
                step="0.05"
                value={costBudgetCap}
                onChange={(e) => setCostBudgetCap(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-1.5 pt-1.5 border-t border-white/5">
              <div className="flex justify-between text-[9px] font-mono uppercase text-muted-foreground">
                <span>Pipeline Est. Cost</span>
                <span className={calculatePipelineCost() > costBudgetCap ? "text-red-400 font-bold" : "text-emerald-400"}>
                  ${calculatePipelineCost().toFixed(4)}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-900 border border-white/5 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    calculatePipelineCost() > costBudgetCap 
                      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                      : 'bg-cyan-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]'
                  }`}
                  style={{ width: `${Math.min((calculatePipelineCost() / costBudgetCap) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] font-mono text-muted-foreground/60 uppercase">
                <span>0%</span>
                <span>{Math.round((calculatePipelineCost() / costBudgetCap) * 100)}% Used</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Durable Step-Run Execution Log */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              Workflow Execution Steps
            </h4>
            <div className="border border-white/5 rounded-lg bg-slate-950/40 overflow-hidden divide-y divide-white/5">
              {cockpitSteps.map((step, idx) => (
                <div key={step.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      {step.status === 'success' ? (
                        <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
                          <Check className="h-3 w-3" />
                        </div>
                      ) : step.status === 'running' ? (
                        <div className="p-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 animate-pulse">
                          <RotateCcw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-slate-800 border border-white/10 text-muted-foreground/60">
                          <div className="h-3 w-3 rounded-full bg-slate-700" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold font-mono tracking-wide ${step.status === 'running' ? 'text-amber-400' : 'text-slate-200'}`}>
                        {idx + 1}. {step.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[9px] font-mono text-muted-foreground bg-slate-900 border border-white/5 px-1.5 py-0.5 rounded">
                          {step.model}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">
                          {step.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {step.status === 'success' && (
                    <div className="text-right flex-shrink-0 font-mono text-[10px] text-cyan-400">
                      <p>{step.latency}ms</p>
                      <p className="text-muted-foreground text-[9px] mt-0.5">{step.tokens} tkn</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Task Configuration Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5 text-cyan-400" />
                Routing Configuration
              </h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsCustomAgentModalOpen(!isCustomAgentModalOpen)}
                className="h-5 px-1.5 text-[8px] font-mono uppercase tracking-wider text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
              >
                [+ Add Custom Agent]
              </Button>
            </div>

            {isCustomAgentModalOpen && (
              <div className="p-3 border border-cyan-500/30 bg-slate-950 rounded-lg space-y-2.5 text-left">
                <p className="text-[9px] font-bold font-mono text-cyan-400 uppercase tracking-widest">[Create Custom Agent]</p>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-mono text-muted-foreground uppercase">Agent Evaluator Name</label>
                  <Input 
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="e.g. Side-Channel Expert"
                    className="h-7 text-[10px] font-mono bg-slate-900 border-white/5 focus:ring-cyan-500/20 text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-mono text-muted-foreground uppercase">Model</label>
                    <select
                      value={newAgentModel}
                      onChange={(e) => setNewAgentModel(e.target.value)}
                      className="w-full h-7 text-[9px] font-mono bg-slate-900 border border-white/5 rounded px-1 text-slate-200"
                    >
                      <option value="claude-3-5-sonnet">Sonnet 3.5</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o-Mini</option>
                      <option value="deepseek-chat">DeepSeek Chat</option>
                      <option value="ollama/llama3">Llama3 Local</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-mono text-muted-foreground uppercase">Temp: {newAgentTemp.toFixed(1)}</label>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={newAgentTemp}
                      onChange={(e) => setNewAgentTemp(parseFloat(e.target.value))}
                      className="w-full h-5 accent-cyan-500 bg-slate-900 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-mono text-muted-foreground uppercase">System Guidelines & Rules</label>
                  <textarea
                    value={newAgentPrompt}
                    onChange={(e) => setNewAgentPrompt(e.target.value)}
                    placeholder="Enforce cryptographic parameters..."
                    className="w-full h-16 p-1.5 border border-white/5 bg-slate-900 text-[10px] font-mono rounded text-slate-300 leading-normal focus:ring-0 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsCustomAgentModalOpen(false)}
                    className="h-6 text-[8.5px] font-mono uppercase text-muted-foreground hover:text-white"
                  >
                    [Cancel]
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddCustomAgent}
                    className="h-6 px-2 text-[8.5px] font-mono font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/20 text-white"
                  >
                    Integrate Agent
                  </Button>
                </div>
              </div>
            )}

            <div className="border border-white/5 rounded-lg bg-slate-950/40 overflow-hidden divide-y divide-white/5">
              {agentConfigs.map((cfg) => (
                <div key={cfg.task} className="p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-200 font-mono">{cfg.task}</p>
                      <p className="text-[9px] text-muted-foreground/80 mt-0.5 leading-normal max-w-[220px]">
                        {cfg.desc}
                      </p>
                    </div>
                    <div className="text-right">
                      <select
                        value={cfg.model}
                        onChange={(e) => {
                          const val = e.target.value
                          setAgentConfigs(prev => prev.map(c => c.task === cfg.task ? { ...c, model: val } : c))
                        }}
                        className="h-6 text-[10px] font-mono font-bold bg-slate-900 border border-white/10 rounded px-1 text-cyan-405 focus:ring-0 focus:border-cyan-500/50"
                      >
                        <option value="claude-3-5-sonnet">Sonnet 3.5</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o-Mini</option>
                        <option value="deepseek-chat">DeepSeek Chat</option>
                        <option value="ollama/llama3">Llama3 Local</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                      Temperature
                    </span>
                    <div className="flex items-center gap-2 flex-grow max-w-[200px]">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={cfg.temp}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          setAgentConfigs(prev => prev.map(c => c.task === cfg.task ? { ...c, temp: val } : c))
                        }}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                      <span className="text-[10px] font-mono font-bold text-cyan-400 w-5 text-right">
                        {cfg.temp.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Prompt Template Editor */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              Prompt Guideline Overrides
            </h4>
            <div className="space-y-2.5 p-3 border border-white/5 rounded-lg bg-slate-950/40">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-muted-foreground uppercase">
                  Target Agent
                </span>
                <select
                  value={activePromptAgent}
                  onChange={(e) => handleSelectPromptAgent(e.target.value)}
                  className="h-6 text-[10px] font-mono font-bold bg-slate-900 border border-white/10 rounded px-1 text-foreground focus:ring-0"
                >
                  <option value="Topology Auditor">Topology Auditor</option>
                  <option value="Skeptic Reviewer">Skeptic Reviewer</option>
                  <option value="Drafting Copilot">Drafting Copilot</option>
                </select>
              </div>

              {/* Text Editor area */}
              <div className="space-y-1">
                <textarea
                  value={activePromptText}
                  onChange={(e) => setActivePromptText(e.target.value)}
                  className="w-full h-32 p-2 border border-white/5 bg-slate-950 text-xs font-mono rounded text-slate-300 leading-normal focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/40 focus:outline-none"
                  placeholder="Enter system prompts directives..."
                />
              </div>

              {/* Live Variables validation indicator */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                  Prompt Variables State
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activePromptAgent === 'Topology Auditor' && (
                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] border flex items-center gap-1 ${
                      checkVariablePresent('{{topology_graph}}')
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      {checkVariablePresent('{{topology_graph}}') ? '[v]' : '[!]'} {'{{topology_graph}}'} (Required)
                    </span>
                  )}
                  {activePromptAgent === 'Skeptic Reviewer' && (
                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] border flex items-center gap-1 ${
                      checkVariablePresent('{{sow_content}}')
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      {checkVariablePresent('{{sow_content}}') ? '[v]' : '[!]'} {'{{sow_content}}'} (Required)
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded font-mono text-[9px] border flex items-center gap-1 ${
                    checkVariablePresent('{{regulatory_framework}}')
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-slate-900 border-white/5 text-muted-foreground/60'
                  }`}>
                    {checkVariablePresent('{{regulatory_framework}}') ? '[v]' : '[ ]'} {'{{regulatory_framework}}'} (Optional)
                  </span>
                </div>
              </div>

              {/* Live Render Preview Sandbox */}
              <details className="border border-white/5 bg-slate-950 p-2.5 rounded group select-none transition-all">
                <summary className="flex items-center justify-between text-[9px] font-mono text-muted-foreground uppercase cursor-pointer hover:text-white">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-cyan-400 group-open:rotate-45 transition-transform" />
                    [Live Render Preview Sandbox]
                  </span>
                  <span className={`text-[8px] px-1 py-0.2 rounded border font-mono font-bold ${getPromptStatus().color}`}>
                    {getPromptStatus().status}
                  </span>
                </summary>
                <div 
                  className="mt-2.5 pt-2 border-t border-white/5 text-[10px] leading-relaxed text-slate-400 font-mono select-text"
                  dangerouslySetInnerHTML={{ __html: compileSandboxPreview() }}
                />
              </details>

              {/* Feedback messages */}
              {promptFeedback && (
                <div className={`p-2 border text-[10px] font-mono rounded leading-relaxed ${
                  promptFeedback.type === 'error'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                }`}>
                  {promptFeedback.message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-1 gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    // Reset to system default prompts
                    const defaults: Record<string, string> = {
                      'Topology Auditor': 'You are a strict network topology auditor enforcing structural boundaries in accordance with the ISA-99/IEC-62443 standard. Analyze the provided {{topology_graph}} and flag any direct physical/logical paths bridging the Corporate Enterprise network (Purdue Level 4) directly to the Industrial Control Core (Purdue Level 2/1).',
                      'Skeptic Reviewer': 'You are a hardware security skeptic. Assume the design fails in production. Analyze the Statement of Work (SOW) text and point out any unmediated side-channel threats, inadequate glitch protection bounds, or microarchitectural leaks.',
                      'Drafting Copilot': 'You are a professional B2B compliance drafter specializing in high-fidelity technical contracts. Help the user expand the compliance targets into robust, non-ambiguous milestones and deliverables.'
                    }
                    setActivePromptText(defaults[activePromptAgent] || '')
                    setPromptFeedback({
                      type: 'success',
                      message: 'Defaults restored. Apply override to save changes.'
                    })
                    setTimeout(() => setPromptFeedback(null), 3000)
                  }}
                  className="h-7 text-[9px] font-mono text-muted-foreground hover:text-foreground active:scale-95"
                >
                  [Reset Defaults]
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={handleApplyPrompt}
                  className="h-7 px-3 text-[9px] font-mono font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/20 text-white active:scale-95 shadow"
                >
                  Apply Override
                </Button>
              </div>
            </div>
          </div>

          {/* Human-in-the-Loop manual Arbiter Gate queue */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-cyan-400" />
                Arbiter Gate Review Queue
              </span>
              <span className="text-[9px] text-cyan-400 font-mono">
                {arbiterObjections.filter(o => !o.resolved).length} Pending
              </span>
            </h4>
            
            <div className="space-y-2.5">
              {arbiterObjections.filter(o => !o.resolved).length > 0 ? (
                arbiterObjections.filter(o => !o.resolved).map((obj) => (
                  <div 
                    key={obj.id} 
                    className={`p-3 border rounded-lg flex flex-col justify-between gap-2.5 bg-slate-950/40 relative overflow-hidden ${
                      obj.severity === 'critical'
                        ? 'border-red-500/20 shadow-sm'
                        : 'border-amber-500/20 shadow-sm'
                    }`}
                  >
                    {/* Left line indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${obj.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    
                    <div className="space-y-1 pl-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-slate-900 border border-white/5 px-1.5 py-0.5 rounded text-slate-300">
                          {obj.agent}
                        </span>
                        <span className={`text-[8.5px] font-mono uppercase tracking-widest font-extrabold px-1 rounded ${
                          obj.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {obj.severity}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-relaxed font-mono">
                        {obj.claim}
                      </p>
                    </div>

                    <div className="flex justify-end items-center gap-2 border-t border-white/5 pt-2 mt-0.5">
                      {obj.targetTab && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLocateObjection(obj)}
                          className="h-6 text-[8.5px] font-mono uppercase tracking-wider text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 mr-auto"
                        >
                          [Locate in App]
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setArbiterObjections(prev => prev.map(o => o.id === obj.id ? { ...o, resolved: true } : o))
                        }}
                        className="h-6 text-[8.5px] font-mono uppercase tracking-wider text-muted-foreground hover:text-white hover:bg-slate-800"
                      >
                        [Dismiss]
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setArbiterObjections(prev => prev.map(o => o.id === obj.id ? { ...o, resolved: true } : o))
                          // Simple action simulation
                          setPromptFeedback({
                            type: 'success',
                            message: `Revision approved: SOW patched in alignment with ${obj.agent} feedback.`
                          })
                          setTimeout(() => setPromptFeedback(null), 3000)
                        }}
                        className="h-6 px-2 text-[8.5px] font-mono font-bold uppercase tracking-wider bg-cyan-600/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 active:scale-95"
                      >
                        Approve Revision
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 border border-dashed border-white/5 bg-slate-950/20 rounded-lg text-center space-y-1.5">
                  <Check className="h-6 w-6 text-emerald-500 mx-auto" />
                  <p className="text-[10px] font-mono uppercase font-bold text-emerald-500 tracking-wider">
                    Arbiter Gate Cleared
                  </p>
                  <p className="text-[9px] text-muted-foreground/80 leading-normal max-w-[240px] mx-auto">
                    No active security objections or parameter violations held in gate review.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cockpit Footer */}
        <div className="p-3 border-t border-white/5 bg-slate-950/40 text-center text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
          Event-Driven LangGraph Agent Pipeline
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] w-full overflow-hidden gap-4">
      {/* Liquid Glass Header Section */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 border rounded-xl bg-slate-900/60 backdrop-blur-md border-white/5 shadow-2xl flex-shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono tracking-wider uppercase text-foreground">B2B Compliance Drafting Workspace</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
              Industrial Utilitarian • Verified Grounding Hub
            </p>
          </div>
        </div>

        {/* Tab Controls: Liquid Glass Segmented bar */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-white/5 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              activeTab === 'editor'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            SOW Draftsman
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('canvas')}
            className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'canvas'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            Network Canvas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Regulatory Ledger
          </button>
        </div>

        {/* Exporter & Cockpit Actions */}
        <div className="flex items-center gap-2">
          {!isExportReady && (
            <span className="text-[10px] font-mono text-amber-500 border border-amber-500/20 bg-amber-500/5 px-2 py-1 rounded">
              PENDING VERIFICATION
            </span>
          )}
          <Button
            size="sm"
            disabled={!isExportReady}
            onClick={handleExportDocx}
            className={`h-8 font-mono font-bold text-xs uppercase tracking-wider active:scale-[0.98] ${
              isExportReady 
                ? 'bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/20 text-white shadow-lg shadow-cyan-500/10' 
                : 'bg-slate-800 text-muted-foreground border border-white/5 cursor-not-allowed'
            }`}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            Export DOCX
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={!isExportReady}
            onClick={handlePrintPdf}
            className="h-8 font-mono font-bold text-xs uppercase tracking-wider active:scale-[0.98] border-white/10 hover:bg-slate-800 text-foreground"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Print PDF
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCockpitOpen(!isCockpitOpen)}
            className={`h-8 font-mono font-bold text-xs uppercase tracking-wider active:scale-[0.98] border-white/10 hover:bg-slate-800 ${
              isCockpitOpen ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-extrabold' : 'text-foreground hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4 mr-1.5" />
            Cockpit
          </Button>
        </div>
      </div>

      {/* Main Mode Views & Side-by-Side Cockpit Container */}
      <div className="flex-grow flex min-h-0 w-full overflow-hidden relative gap-4">
        <div className="flex-grow min-h-0 overflow-hidden transition-all duration-300">
          {activeTab === 'editor' && renderDraftsmanView()}
          {activeTab === 'canvas' && renderCanvasView()}
          {activeTab === 'ledger' && renderLedgerView()}
        </div>

        {/* Agentic Workflow Cockpit Side Drawer */}
        {isCockpitOpen && renderAgenticCockpit()}
      </div>
    </div>
  )
}
