'use client'

import { useState, useEffect } from 'react'
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
  FolderOpen
} from 'lucide-react'
import { SourceListResponse } from '@/lib/types/api'

interface B2BDraftingWorkspaceProps {
  notebookId: string
  notebookName: string
  notebookDescription?: string
  sources: SourceListResponse[]
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

const getSiliconAuditTemplate = (params: ParameterState) => `
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
Name: __________________________
Title: __________________________
Date: __________________________
`

const getDatacenterAITemplate = (params: ParameterState) => `
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
Name: __________________________
Title: __________________________
Date: __________________________
`

const getISO26262Template = (params: ParameterState) => `
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
Name: __________________________
Title: __________________________
Date: __________________________
`

// ---------------------------------------------------------
// Simple Markdown to HTML Parser
// ---------------------------------------------------------
function parseMarkdownToHtml(md: string): string {
  let html = md;
  
  // Replace Headers
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  
  // Replace Tables
  const lines = html.split('\n');
  let inTable = false;
  let tableHeaderParsed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        lines[i] = '<table><thead>' + renderTableRow(line, true) + '</thead><tbody>';
      } else if (line.includes('---')) {
        // Divider row
        lines[i] = '';
      } else {
        lines[i] = renderTableRow(line, false);
      }
    } else {
      if (inTable) {
        inTable = false;
        lines[i] = '</tbody></table>' + lines[i];
      }
    }
  }
  html = lines.join('\n');

  // Replace bullet points
  html = html.replace(/^\*\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>');
  
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

export function B2BDraftingWorkspace({
  notebookId,
  notebookName,
  notebookDescription = '',
  sources
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

  // 2. Blueprint loading / parameter interpolation hook
  useEffect(() => {
    let updatedContent = ''
    if (activeBlueprint === 'silicon') {
      updatedContent = getSiliconAuditTemplate(params)
    } else if (activeBlueprint === 'datacenter') {
      updatedContent = getDatacenterAITemplate(params)
    } else if (activeBlueprint === 'iso26262') {
      updatedContent = getISO26262Template(params)
    }

    // Apply high-contrast span highlights to key parameters in the document
    const highlight = (val: string, keyName: string) => 
      `<span class="bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded font-mono text-xs font-semibold" title="AI Parameter: ${keyName}">${val}</span>`

    let highlightedContent = updatedContent
      .replace(new RegExp(escapeRegExp(params.clientName), 'g'), highlight(params.clientName, 'Client Name'))
      .replace(new RegExp(escapeRegExp(params.auditPrice), 'g'), highlight(params.auditPrice, 'Audit Price'))
      .replace(new RegExp(escapeRegExp(params.duration), 'g'), highlight(params.duration, 'Duration'))
      .replace(new RegExp(escapeRegExp(params.startDate), 'g'), highlight(params.startDate, 'Start Date'))
      .replace(new RegExp(escapeRegExp(params.systemTarget), 'g'), highlight(params.systemTarget, 'System Target'))

    setDocumentContent(highlightedContent)
  }, [activeBlueprint, params])

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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full min-h-0 flex-1 p-1">
      {/* 1. LEFT PANEL: Controls, blue prints, and parameter verification (5 columns) */}
      <div className="xl:col-span-5 flex flex-col gap-6 overflow-y-auto pr-1">
        
        {/* WARNING DISCLAIMER BANNER */}
        <Card className="border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-semibold">B2B Compliance and Liability Safeguard</p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                Internal draft only. Verify all legal clauses, estimated days, and hardware prices prior to proposal export.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* BLUEPRINT SELECTORS */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-500 animate-spin" style={{ animationDuration: '3s' }} />
              <CardTitle className="text-base font-semibold">One-Click Proposal Blueprints</CardTitle>
            </div>
            <CardDescription className="text-xs">Select a styled pre-configured sales template</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2.5 pt-0">
            {/* Silicon Audit SOW */}
            <div 
              onClick={() => setActiveBlueprint('silicon')}
              className={`p-3 border rounded-lg transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${
                activeBlueprint === 'silicon'
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                  : 'hover:bg-muted/50 border-border'
              }`}
            >
              <div className={`p-2 rounded-lg ${activeBlueprint === 'silicon' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Cpu className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">Silicon Security SOW</p>
                <p className="text-[10px] text-muted-foreground">Hardware auditing & EM SCA analyses</p>
              </div>
              {activeBlueprint === 'silicon' && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </div>

            {/* Datacenter AI Review */}
            <div 
              onClick={() => setActiveBlueprint('datacenter')}
              className={`p-3 border rounded-lg transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${
                activeBlueprint === 'datacenter'
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                  : 'hover:bg-muted/50 border-border'
              }`}
            >
              <div className={`p-2 rounded-lg ${activeBlueprint === 'datacenter' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Network className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">Datacenter AI Risk Review</p>
                <p className="text-[10px] text-muted-foreground">GPU clustering isolation & pipeline poison reviews</p>
              </div>
              {activeBlueprint === 'datacenter' && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </div>

            {/* ISO 26262 Review */}
            <div 
              onClick={() => setActiveBlueprint('iso26262')}
              className={`p-3 border rounded-lg transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${
                activeBlueprint === 'iso26262'
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                  : 'hover:bg-muted/50 border-border'
              }`}
            >
              <div className={`p-2 rounded-lg ${activeBlueprint === 'iso26262' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">ISO 26262 Compliance review</p>
                <p className="text-[10px] text-muted-foreground">ASIL-D diagnostics & semiconductor compliance SOWs</p>
              </div>
              {activeBlueprint === 'iso26262' && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </div>
          </CardContent>
        </Card>

        {/* SPEC SHEET PINNING BRIDGE */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-cyan-500" />
              <CardTitle className="text-base font-semibold">Product Catalog RAG Bridge</CardTitle>
            </div>
            <CardDescription className="text-xs">Pin hardware security specifications directly to SOW context</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0">
            {/* Catalog Spec 1 */}
            <div className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/30">
              <div className="flex items-center gap-2.5">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">Tetrel HS-50 Silicon Audit Spec</p>
                  <p className="text-[9px] text-muted-foreground">Active side-channel hardware metrics</p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant={pinnedSpecs['HS-50'] ? 'default' : 'outline'}
                className="h-7 text-[10px] active:scale-[0.98]"
                onClick={() => toggleSpecPin('HS-50')}
              >
                {pinnedSpecs['HS-50'] ? 'Pinned' : 'Pin Spec'}
              </Button>
            </div>

            {/* Catalog Spec 2 */}
            <div className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/30">
              <div className="flex items-center gap-2.5">
                <Network className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">Tetrel DT-200 Datacenter Guard</p>
                  <p className="text-[9px] text-muted-foreground">Cluster orchestration security blueprints</p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant={pinnedSpecs['DT-200'] ? 'default' : 'outline'}
                className="h-7 text-[10px] active:scale-[0.98]"
                onClick={() => toggleSpecPin('DT-200')}
              >
                {pinnedSpecs['DT-200'] ? 'Pinned' : 'Pin Spec'}
              </Button>
            </div>

            {/* Catalog Spec 3 */}
            <div className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/30">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">ISO-26262 Semiconductor safety spec</p>
                  <p className="text-[9px] text-muted-foreground">Automotive standard FMEDA audit manuals</p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant={pinnedSpecs['ISO-26262'] ? 'default' : 'outline'}
                className="h-7 text-[10px] active:scale-[0.98]"
                onClick={() => toggleSpecPin('ISO-26262')}
              >
                {pinnedSpecs['ISO-26262'] ? 'Pinned' : 'Pin Spec'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PARAMETERS AND SAFEGUARD CHECKLIST */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              SOW Parameter Validation
            </CardTitle>
            <CardDescription className="text-xs">Refine values & check to approve for corporate export</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Client Name Input */}
            <div className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Client Name</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="checkbox" 
                    checked={checklist.clientName} 
                    onChange={(e) => setChecklist(prev => ({ ...prev, clientName: e.target.checked }))}
                    className="rounded text-primary border-muted h-3.5 w-3.5 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-[10px] font-medium text-muted-foreground">Verify</span>
                </div>
              </div>
              <Input 
                value={params.clientName}
                onChange={(e) => setParams(prev => ({ ...prev, clientName: e.target.value }))}
                className="h-8 text-xs font-medium"
              />
            </div>

            {/* Target System Input */}
            <div className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Target Security System</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="checkbox" 
                    checked={checklist.systemTarget} 
                    onChange={(e) => setChecklist(prev => ({ ...prev, systemTarget: e.target.checked }))}
                    className="rounded text-primary border-muted h-3.5 w-3.5 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-[10px] font-medium text-muted-foreground">Verify</span>
                </div>
              </div>
              <Input 
                value={params.systemTarget}
                onChange={(e) => setParams(prev => ({ ...prev, systemTarget: e.target.value }))}
                className="h-8 text-xs font-medium"
              />
            </div>

            {/* Audit Price Input */}
            <div className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Estimated Price</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="checkbox" 
                    checked={checklist.auditPrice} 
                    onChange={(e) => setChecklist(prev => ({ ...prev, auditPrice: e.target.checked }))}
                    className="rounded text-primary border-muted h-3.5 w-3.5 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-[10px] font-medium text-muted-foreground">Verify</span>
                </div>
              </div>
              <Input 
                value={params.auditPrice}
                onChange={(e) => setParams(prev => ({ ...prev, auditPrice: e.target.value }))}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            {/* Estimated Duration & Schedule */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Duration</label>
                  <input 
                    type="checkbox" 
                    checked={checklist.duration} 
                    onChange={(e) => setChecklist(prev => ({ ...prev, duration: e.target.checked }))}
                    className="rounded text-primary border-muted h-3 w-3 focus:ring-0 focus:ring-offset-0"
                  />
                </div>
                <Input 
                  value={params.duration}
                  onChange={(e) => setParams(prev => ({ ...prev, duration: e.target.value }))}
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Start Date</label>
                  <input 
                    type="checkbox" 
                    checked={checklist.startDate} 
                    onChange={(e) => setChecklist(prev => ({ ...prev, startDate: e.target.checked }))}
                    className="rounded text-primary border-muted h-3 w-3 focus:ring-0 focus:ring-offset-0"
                  />
                </div>
                <Input 
                  value={params.startDate}
                  onChange={(e) => setParams(prev => ({ ...prev, startDate: e.target.value }))}
                  className="h-8 text-xs font-medium"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. RIGHT PANEL: Split-screen drafting canvas (7 columns) */}
      <div className="xl:col-span-7 flex flex-col h-full min-h-0 border rounded-lg bg-card shadow-sm overflow-hidden">
        
        {/* Editor controls and actions panel */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Interactive SOW Draftsman</h3>
            <Badge variant="secondary" className="text-[9px] uppercase tracking-wider tabular-nums font-mono font-semibold">
              Live Preview
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* WORD OFFICE (.docx) COMPILATION EXPORT BUTTON */}
            <Button
              size="sm"
              variant={isExportReady ? 'default' : 'secondary'}
              disabled={!isExportReady}
              onClick={handleExportDocx}
              className={`h-8 font-semibold text-xs active:scale-[0.98] ${
                isExportReady ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95 shadow-sm text-white' : ''
              }`}
            >
              <FileDown className="h-4.5 w-4.5 mr-2" />
              Export Word (.docx)
            </Button>

            {/* PRINT OPTION / PDF PRINT CONTAINER */}
            <Button
              size="sm"
              variant="outline"
              disabled={!isExportReady}
              onClick={handlePrintPdf}
              className="h-8 font-medium text-xs active:scale-[0.98]"
            >
              <Printer className="h-4.5 w-4.5 mr-2" />
              Print SOW (PDF)
            </Button>
          </div>
        </div>

        {/* Check ready status hint */}
        {!isExportReady && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 animate-bounce" />
            <span className="text-[11px] font-medium leading-none">
              Please check "Verify" on all parameters in the left panel to unlock professional DOCX export and PDF printing.
            </span>
          </div>
        )}

        {/* Full-featured Markdown Editor Container */}
        <div className="flex-1 overflow-y-auto p-4 [&_.w-md-editor]:!static [&_.w-md-editor]:!w-full [&_.w-md-editor]:!h-full [&_.w-md-editor-content]:overflow-y-auto">
          <MarkdownEditor
            value={documentContent}
            onChange={(val) => setDocumentContent(val || '')}
            height={720}
            preview="live"
            placeholder="Loading corporate SOW blueprint..."
            className="w-full h-full min-h-[500px]"
          />
        </div>
      </div>
    </div>
  )
}
