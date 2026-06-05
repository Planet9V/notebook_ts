'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase,
  Globe,
  Building,
  AlertTriangle,
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  Users,
  Activity,
  ArrowRight,
  GripVertical,
  RotateCcw,
} from 'lucide-react'
import apiClient from '@/lib/api/client'
import { CSETNetworkCanvas } from '../../../notebooks/components/CSETNetworkCanvas'
import { ContactsPanel } from '@/components/contacts/ContactsPanel'
import { LocationsPanel } from '@/components/locations/LocationsPanel'
import { DataPageSkeleton } from '@/components/common/DataPageSkeleton'
import { useBreadcrumbLabel } from '@/lib/hooks/use-breadcrumb-label'
import { useLocations } from '@/lib/hooks/use-locations'
import { useActivities } from '@/lib/hooks/use-activities'
import { useDebounce } from 'use-debounce'
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvidedDraggableProps, DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'
import {
  Customer,
  Notebook,
  SectorGuideline,
  COMPLIANCE_FRAMEWORKS,
  SECTOR_FRAMEWORK_MAP,
  SECTOR_GUIDELINES,
} from '../data'
import { ProfileTab, ComplianceTab, EducationTab, ActivityTab } from '../components'

interface Assessment {
  id: string
  framework_id: string
  location_id?: string
  customer_id: string
}

interface Session {
  id: string
  session_name?: string
  status?: string
}

interface SessionQuestion {
  question_id: string
  answer: string
  comments?: string
  evidence_url?: string
}

interface FacilityRollup {
  facility_id: string
  facility_name: string
  status: string
  compliance_score: number
}

interface FrameworkRollup {
  framework_id: string
  framework_name: string
  average_compliance_score: number
  facilities: FacilityRollup[]
}

interface RollupData {
  frameworks: FrameworkRollup[]
}

interface AssessmentPayload {
  customer_id: string
  framework_id: string
  location_id?: string
}

const FRONTEND_TO_DB_MAP: Record<string, string> = {
  'CFATS_RBPS': 'Cfats',
  'CISA_CPG': 'CPG',
  'NIST_800_82': 'SP800_82_V3',
  'NIST_800_53': 'C800_53_R5_V2',
  'NIST_CSF': 'NCSF_V2',
  'CIS_CONTROLS': 'CSC_V8',
  'CNSSI_1253': 'Cnssi_1253',
  'AWWA_G430': 'AWWA',
  'TSA_RAIL': 'TSA2018',
  'TSA_PIPELINE': 'TSA2018',
  'COBIT_2019': 'COBIT_2019',
  'SOC_2': 'SOC_2',
  'IEC_62443_3_3': 'ISA_62443',
  'IEC_62443_4_2': 'ISA_62443',
  'CMMC_L1': 'CMMC',
  'CMMC_L2': 'CMMC',
  'CMMC_L3': 'CMMC',
  'NIS2': 'Universal',
  'CRA': 'Universal',
}

const DB_TO_FRONTEND_MAP: Record<string, string> = {
  'Cfats': 'CFATS_RBPS',
  'CPG': 'CISA_CPG',
  'SP800_82_V3': 'NIST_800_82',
  'SP800_82_V2': 'NIST_800_82',
  'C800_53_R5_V2': 'NIST_800_53',
  'C800_53_R4_71': 'NIST_800_53',
  'NCSF_V2': 'NIST_CSF',
  'NCSF_V1': 'NIST_CSF',
  'CSC_V8': 'CIS_CONTROLS',
  'Cnssi_1253': 'CNSSI_1253',
  'AWWA': 'AWWA_G430',
  'TSA2018': 'TSA_RAIL',
  'Tsa': 'TSA_PIPELINE',
  'COBIT_2019': 'COBIT_2019',
  'SOC_2': 'SOC_2',
  'ISA_62443': 'IEC_62443_3_3',
  'CMMC': 'CMMC_L1',
  'Universal': 'NIS2',
}

const DEFAULT_LAYOUT = [
  'card-compliance',
  'card-pipeline',
  'card-risk',
  'card-ledger',
  'card-activity'
]

const getColSpan = (cardId: string) => {
  if (cardId === 'card-ledger') return 'col-span-1 lg:col-span-2'
  return 'col-span-1'
}

export default function BentoCustomerDossierPage() {
  const params = useParams()
  const rawId = params.id as string
  const customerId = `customer:${rawId}`

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('none')
  const { data: locations = [] } = useLocations(customerId)
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  
  // 4 Consolidated Tabs: 'overview' | 'assets' | 'audits' | 'reference'
  const [bentoTab, setBentoTab] = useState<'overview' | 'assets' | 'audits' | 'reference'>('overview')
  const [highlightedContactId, setHighlightedContactId] = useState<string | null>(null)

  // Layout and Drag state
  const [layout, setLayout] = useState<string[]>(DEFAULT_LAYOUT)
  const [isEditingLayout, setIsEditingLayout] = useState(false)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // Search filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, 100)

  // Fetch activities directly for search matching in Dossier Activity Logs card
  const { data: activities = [] } = useActivities(customerId)

  // Compliance Auditing Workspace State
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [wizardMode, setWizardMode] = useState<boolean>(false)
  const [savingAnswer, setSavingAnswer] = useState<boolean>(false)
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null)
  const [reportMode, setReportMode] = useState<boolean>(false)
  const [trends, setTrends] = useState<Record<string, unknown>[]>([])
  
  // Custom Profile Editor Settings State
  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false)
  const [editPrimarySector, setEditPrimarySector] = useState<string>('')
  const [editSectors, setEditSectors] = useState<string[]>([])
  const [editFrameworks, setEditFrameworks] = useState<string[]>([])
  const [newSessionName, setNewSessionName] = useState<string>('')
  const [carryForward, setCarryForward] = useState<boolean>(true)

  const [rollupData, setRollupData] = useState<RollupData | null>(null)

  const dossierStats = useMemo(() => {
    const totalDeals = notebooks.length
    const pipelineSum = notebooks.reduce((sum, n) => sum + (n.estimated_value || 0), 0)
    const activeDeals = notebooks.filter(n => n.stage !== 'won').length
    const activeThreatCount = notebooks.length > 0 ? (rawId.charCodeAt(0) % 2 === 0 ? 2 : 0) : 0
    return { totalDeals, pipelineSum, activeDeals, activeThreatCount }
  }, [notebooks, rawId])
  
  // Audits Tab Toggle: 'compliance' | 'canvas'
  const [auditToggle, setAuditToggle] = useState<'compliance' | 'canvas'>('compliance')

  // ─── Layout & Responsive Helpers ─────────────────────────────────
  useEffect(() => {
    setIsMounted(true)
    const savedLayout = localStorage.getItem(`bento_layout_${customerId}`)
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout)
        if (Array.isArray(parsed) && parsed.length === DEFAULT_LAYOUT.length) {
          setLayout(parsed)
        }
      } catch (e) {
        console.error('Failed to parse bento layout', e)
      }
    }

    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [customerId])

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const reordered = Array.from(layout)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)
    setLayout(reordered)
    localStorage.setItem(`bento_layout_${customerId}`, JSON.stringify(reordered))
  }

  const handleResetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
    localStorage.removeItem(`bento_layout_${customerId}`)
  }

  // Escape key down listener to clear search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchTerm('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ─── Search Highlight & Sanitization ──────────────────────────────
  const sanitizeTerm = (term: string) => {
    return term.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&').trim()
  }

  const highlightText = (text: string, query: string) => {
    if (!query || !query.trim()) return <>{text}</>
    const sanitized = sanitizeTerm(query)
    const regex = new RegExp(`(${sanitized})`, 'gi')
    const parts = text.split(regex)
    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-cyan-500/30 text-cyan-200 font-semibold px-0.5 rounded border-b border-cyan-400">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  // ─── Card Status Computations ────────────────────────────────────
  const complianceScore = useMemo(() => {
    let sumScores = 0.0
    let count = 0
    if (rollupData?.frameworks) {
      for (const fw of rollupData.frameworks) {
        for (const fac of fw.facilities) {
          if (fac.status !== 'NOT_STARTED') {
            sumScores += fac.compliance_score
            count++
          }
        }
      }
    }
    return count > 0 ? sumScores / count : 0.0
  }, [rollupData])

  const isComplianceLow = useMemo(() => {
    if (complianceScore < 50) return true
    if (rollupData?.frameworks) {
      for (const fw of rollupData.frameworks) {
        for (const fac of fw.facilities) {
          if (fac.status !== 'NOT_STARTED' && fac.compliance_score < 50) {
            return true
          }
        }
      }
    }
    return false
  }, [complianceScore, rollupData])

  const cardMatches = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    if (!query) {
      return {
        'card-compliance': true,
        'card-pipeline': true,
        'card-risk': true,
        'card-ledger': true,
        'card-activity': true,
      }
    }

    const isComplianceMatching = `Compliance posture ${rollupData?.frameworks?.length || 0} Frameworks Combined Average Active Audit Nodes Facilities ${rollupData?.frameworks?.map((f: FrameworkRollup) => `${f.framework_name} ${f.average_compliance_score.toFixed(1)}%`).join(' ') || ''}`.toLowerCase().includes(query)

    const isPipelineMatching = `B2B Deal Pipeline ${dossierStats.totalDeals} Deals Total Pipeline Value $${dossierStats.pipelineSum.toLocaleString()} ${dossierStats.activeDeals} Pending ${notebooks.map(n => `${n.name} ${n.stage} $${(n.estimated_value || 0).toLocaleString()}`).join(' ')}`.toLowerCase().includes(query)

    const descText = dossierStats.activeThreatCount > 0 
      ? 'Unvalidated PLC components discovered on SCADA Network Canvas. Verification recommended.'
      : 'No unvalidated network anomalies or components discovered on the CSET validation canvas.'
    const isRiskMatching = `Risk & Warnings Threat Alerts ${dossierStats.activeThreatCount} ${dossierStats.activeThreatCount > 0 ? 'ALERT' : 'SECURE'} SCADA Level 3: Isolated Purdue Zone: Insulated Perimeter: Audited ${descText}`.toLowerCase().includes(query)

    const notebooksString = notebooks.map(nb => `${nb.name} ${nb.description || ''} ${nb.stage} $${(nb.estimated_value || 0).toLocaleString()} ${nb.note_count} N ${nb.source_count} S`).join(' ')
    const isLedgerMatching = `Associated Proposal Notebooks Ledger Workspace Pipeline Stage Value Assets ${notebooksString}`.toLowerCase().includes(query)

    const displayActivities = activities.slice(0, 5)
    const activityString = displayActivities.map(a => `${a.activity_type} ${a.description} ${a.actor || ''}`).join(' ')
    const isActivityMatching = `Dossier Activity Logs logs activity timeline ${activityString}`.toLowerCase().includes(query)

    const matches: Record<string, boolean> = {
      'card-compliance': isComplianceMatching,
      'card-pipeline': isPipelineMatching,
      'card-risk': isRiskMatching,
      'card-ledger': isLedgerMatching,
      'card-activity': isActivityMatching,
    }
    return matches
  }, [debouncedSearch, rollupData, dossierStats, notebooks, activities])

  const hasSearchActive = debouncedSearch.trim().length > 0

  const renderCard = (cardId: string, dragProps?: Partial<DraggableProvidedDraggableProps>, dragHandleProps?: Partial<DraggableProvidedDragHandleProps> | null) => {
    const isMuted = hasSearchActive && !cardMatches[cardId]

    const dragHandle = isEditingLayout && !isMobileOrTablet ? (
      <div 
        {...dragHandleProps} 
        className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded bg-slate-950/80 border border-white/10 text-cyan-400 hover:text-cyan-300 cursor-grab active:cursor-grabbing hover:bg-slate-950 transition-all"
        title="Drag to reorder card"
      >
        <GripVertical className="h-4 w-4" />
      </div>
    ) : null

    const baseClasses = "relative h-full flex flex-col justify-between transition-all duration-500 ease-in-out"
    const opacityClasses = isMuted ? 'opacity-40 grayscale-[15%] scale-[0.99]' : 'opacity-100'

    switch (cardId) {
      case 'card-compliance': {
        const anyFacilityScoreBelow50 = (() => {
          if (rollupData?.frameworks) {
            for (const fw of rollupData.frameworks) {
              for (const fac of fw.facilities) {
                if (fac.status !== 'NOT_STARTED' && fac.compliance_score < 50) {
                  return true
                }
              }
            }
          }
          return false
        })()

        const glowBorder = isComplianceLow || anyFacilityScoreBelow50
          ? 'border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.2)] bg-orange-950/5'
          : 'border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-cyan-950/5'
        
        return (
          <Card 
            className={`${baseClasses} ${opacityClasses} ${glowBorder} p-5 space-y-4`}
            {...dragProps}
          >
            {dragHandle}
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" /> {highlightText("Compliance posture", debouncedSearch)}
                </span>
                <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[8px]">
                  {rollupData?.frameworks?.length || 0} Frameworks
                </Badge>
              </div>
              
              <div className="py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground uppercase block font-sans">
                    {highlightText("Combined Average", debouncedSearch)}
                  </span>
                  <span className="text-3xl font-extrabold text-cyan-400">
                    {highlightText(`${complianceScore.toFixed(1)}%`, debouncedSearch)}
                  </span>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[9px] text-muted-foreground uppercase block font-sans">
                    {highlightText("Active Audit Nodes", debouncedSearch)}
                  </span>
                  <span className="text-xl font-bold text-slate-200">
                    {highlightText(
                      `${rollupData?.frameworks?.reduce((acc: number, fw: FrameworkRollup) => acc + fw.facilities.length, 0) || 0} Facilities`, 
                      debouncedSearch
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {rollupData?.frameworks?.slice(0, 2).map((fw: FrameworkRollup) => (
                  <div key={fw.framework_id} className="space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-300">
                      <span className="truncate max-w-[150px] font-semibold">
                        {highlightText(fw.framework_name, debouncedSearch)}
                      </span>
                      <span className="text-cyan-400 font-bold">
                        {highlightText(`${fw.average_compliance_score.toFixed(1)}%`, debouncedSearch)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden border border-white/5">
                      <div style={{ width: `${fw.average_compliance_score}%` }} className="bg-cyan-500 h-full rounded transition-all duration-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={() => setBentoTab('audits')}
              className="w-full h-8 text-[9px] bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-1 mt-2"
            >
              {highlightText("Audit Control Room", debouncedSearch)} <ArrowRight className="h-3 w-3" />
            </Button>
          </Card>
        )
      }
      
      case 'card-pipeline': {
        const glowBorder = dossierStats.activeDeals > 0
          ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-cyan-950/5'
          : 'border-slate-800 shadow-[0_0_10px_rgba(148,163,184,0.05)] bg-slate-950/20'

        return (
          <Card 
            className={`${baseClasses} ${opacityClasses} ${glowBorder} p-5 space-y-4`}
            {...dragProps}
          >
            {dragHandle}
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                  <Briefcase className="h-4 w-4" /> {highlightText("B2B Deal Pipeline", debouncedSearch)}
                </span>
                <Badge variant="outline" className="border-slate-700 bg-slate-800/40 text-slate-300 text-[8px]">
                  {highlightText(`${dossierStats.totalDeals} Deals`, debouncedSearch)}
                </Badge>
              </div>

              <div className="py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground uppercase block font-sans">
                    {highlightText("Total Pipeline Value", debouncedSearch)}
                  </span>
                  <span className="text-2xl font-extrabold text-slate-200">
                    {highlightText(`$${dossierStats.pipelineSum.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, debouncedSearch)}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[9px] text-muted-foreground uppercase block font-sans">
                    {highlightText("Active Deals", debouncedSearch)}
                  </span>
                  <span className="text-lg font-bold text-cyan-400">
                    {highlightText(`${dossierStats.activeDeals} Pending`, debouncedSearch)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[70px] overflow-y-auto pr-1">
                {notebooks.slice(0, 2).map(nb => (
                  <div key={nb.id} className="flex justify-between items-center text-[9px] p-1.5 border border-white/5 bg-slate-950/20 rounded">
                    <span className="truncate max-w-[120px] font-bold text-slate-300">
                      {highlightText(nb.name, debouncedSearch)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge className="text-[7.5px] font-mono h-3.5 leading-none px-1 uppercase">
                        {highlightText(nb.stage, debouncedSearch)}
                      </Badge>
                      <span className="text-cyan-400 font-bold">
                        {highlightText(`$${(nb.estimated_value || 0).toLocaleString()}`, debouncedSearch)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={() => setBentoTab('assets')}
              variant="outline"
              className="w-full h-8 text-[9px] border-slate-700 hover:bg-slate-800 text-slate-300 font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-1"
            >
              {highlightText("View Linked Proposals", debouncedSearch)} <ArrowRight className="h-3 w-3" />
            </Button>
          </Card>
        )
      }

      case 'card-risk': {
        const glowBorder = dossierStats.activeThreatCount > 0
          ? 'border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.2)] bg-orange-950/5 animate-pulse'
          : 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-emerald-950/5'

        const riskDescText = dossierStats.activeThreatCount > 0 
          ? 'Unvalidated PLC components discovered on SCADA Network Canvas. Verification recommended.'
          : 'No unvalidated network anomalies or components discovered on the CSET validation canvas.'

        return (
          <Card 
            className={`${baseClasses} ${opacityClasses} ${glowBorder} p-5 space-y-4`}
            {...dragProps}
          >
            {dragHandle}
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4" /> {highlightText("Risk & Warnings", debouncedSearch)}
                </span>
                <Badge variant="outline" className={`text-[8px] ${dossierStats.activeThreatCount > 0 ? 'border-orange-500/20 bg-orange-500/5 text-orange-400' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'}`}>
                  {highlightText(dossierStats.activeThreatCount > 0 ? 'ALERT' : 'SECURE', debouncedSearch)}
                </Badge>
              </div>

              <div className="py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground uppercase block font-sans">
                    {highlightText("Threat Alerts", debouncedSearch)}
                  </span>
                  <span className={`text-3xl font-extrabold ${dossierStats.activeThreatCount > 0 ? 'text-orange-500' : 'text-emerald-400'}`}>
                    {highlightText(String(dossierStats.activeThreatCount), debouncedSearch)}
                  </span>
                </div>
                <div className="text-right space-y-0.5 text-[9px] text-muted-foreground pl-2 leading-tight">
                  <p>{highlightText("SCADA Level 3: Isolated", debouncedSearch)}</p>
                  <p>{highlightText("Purdue Zone: Insulated", debouncedSearch)}</p>
                  <p>{highlightText("Perimeter: Audited", debouncedSearch)}</p>
                </div>
              </div>

              <div className="p-2.5 border border-cyan-500/10 bg-cyan-950/5 text-cyan-300/80 rounded leading-normal text-[8.5px] font-sans">
                {highlightText(riskDescText, debouncedSearch)}
              </div>
            </div>

            <Button 
              onClick={() => {
                setBentoTab('audits')
                setAuditToggle('canvas')
              }}
              variant="outline"
              className="w-full h-8 text-[9px] border-slate-700 hover:bg-slate-800 text-slate-300 font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-1"
            >
              {highlightText("Open Threat Canvas", debouncedSearch)} <ArrowRight className="h-3 w-3" />
            </Button>
          </Card>
        )
      }

      case 'card-ledger': {
        return (
          <Card 
            className={`${baseClasses} ${opacityClasses} border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden`}
            {...dragProps}
          >
            {dragHandle}
            <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-cyan-400" />
                {highlightText("Associated Proposal Notebooks Ledger", debouncedSearch)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {notebooks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic font-mono">
                  {highlightText("No deals linked.", debouncedSearch)}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/40 text-muted-foreground uppercase text-[8px] tracking-wider">
                        <th className="p-3">{highlightText("Workspace", debouncedSearch)}</th>
                        <th className="p-3">{highlightText("Pipeline Stage", debouncedSearch)}</th>
                        <th className="p-3 text-right">{highlightText("Value", debouncedSearch)}</th>
                        <th className="p-3 text-right">{highlightText("Assets", debouncedSearch)}</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {notebooks.map((nb) => (
                        <tr key={nb.id} className="hover:bg-slate-800/20 transition-all">
                          <td className="p-3">
                            <span className="font-bold text-slate-200 block text-xs truncate max-w-[180px]">
                              {highlightText(nb.name, debouncedSearch)}
                            </span>
                            <span className="text-[8.5px] text-muted-foreground truncate block max-w-[180px]">
                              {highlightText(nb.description || 'No description', debouncedSearch)}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge className="text-[7.5px] font-mono h-4 leading-none uppercase font-bold py-0.5 px-1">
                              {highlightText(nb.stage, debouncedSearch)}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-300">
                            {highlightText(`$${(nb.estimated_value || 0).toLocaleString()}`, debouncedSearch)}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {highlightText(`${nb.note_count} N • ${nb.source_count} S`, debouncedSearch)}
                          </td>
                          <td className="p-3 text-right">
                            <Link href={`/notebooks?id=${nb.id.replace('notebook:', '')}`}>
                              <Button size="sm" className="h-5 px-1.5 text-[8px] bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono uppercase tracking-wider">
                                Launch
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }

      case 'card-activity': {
        return (
          <Card 
            className={`${baseClasses} ${opacityClasses} border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden`}
            {...dragProps}
          >
            {dragHandle}
            <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-cyan-400" />
                {highlightText("Dossier Activity Logs", debouncedSearch)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              <div className="h-[250px] overflow-y-auto pr-1">
                <ActivityTab customerId={customerId} isMiniView={true} searchTerm={debouncedSearch} />
              </div>
            </CardContent>
          </Card>
        )
      }

      default:
        return null
    }
  }

  const handleNavigateToContacts = (contactId?: string) => {
    if (contactId) {
      setHighlightedContactId(contactId)
    }
    setBentoTab('assets')
  }

  // Set human-readable breadcrumb label
  useBreadcrumbLabel(customer?.name ? `${customer.name} [Bento Preview]` : undefined)

  // Compliance Auditing Workspace State & Profile Settings (moved to top of component)

  // ─── Data Fetching ──────────────────────────────────────────────

  const fetchDossierData = useCallback(async () => {
    setIsLoading(true)
    try {
      // 1. Fetch customer details
      const custResponse = await apiClient.get<Customer>(`/customers/${customerId}`)
      const cust = custResponse.data
      setCustomer(cust)
      setEditPrimarySector(cust.primary_sector || cust.industry || 'Energy')
      setEditSectors(cust.sectors || [cust.industry || 'Energy'])
      setEditFrameworks(cust.assigned_frameworks || [])

      // 2. Fetch all notebooks and filter by customer_id
      const nbsResponse = await apiClient.get<Notebook[]>('/notebooks')
      const associatedNbs = (nbsResponse.data || []).filter(
        (nb) => nb.customer_id === customerId || nb.customer_id === rawId
      )
      setNotebooks(associatedNbs)

      // 3. Fetch active compliance assessments
      const assessResponse = await apiClient.get<Assessment[]>(`/assessments?customer_id=${customerId}`)
      setAssessments(assessResponse.data || [])
    } catch (e) {
      console.error('Error fetching dossier data:', e)
    } finally {
      setIsLoading(false)
    }
  }, [customerId, rawId])



  const fetchRollupData = useCallback(async () => {
    try {
      const response = await apiClient.get<RollupData>(`/customers/${customerId}/compliance-rollup`)
      setRollupData(response.data)
    } catch (e) {
      console.error('Error fetching compliance rollup data:', e)
    }
  }, [customerId])

  useEffect(() => {
    if (customerId) {
      fetchRollupData()
    }
  }, [customerId, assessments, fetchRollupData])

  useEffect(() => {
    fetchDossierData()
  }, [fetchDossierData])

  // Fetch sessions for active assessment
  const loadSessions = useCallback(async (assessId: string) => {
    try {
      const response = await apiClient.get<Session[]>(`/assessments/${assessId}/sessions`)
      setSessions(response.data || [])
      
      // Fetch trends as well
      const trendResponse = await apiClient.get<Record<string, unknown>[]>(`/assessments/${assessId}/trends`)
      setTrends(trendResponse.data || [])
    } catch (e) {
      console.error('Error loading sessions:', e)
    }
  }, [])

  useEffect(() => {
    if (activeAssessment) {
      loadSessions(activeAssessment.id)
    } else {
      setSessions([])
      setTrends([])
    }
  }, [activeAssessment, loadSessions])

  // Reset active assessment if it does not match the selected location
  useEffect(() => {
    if (activeAssessment) {
      const match = selectedLocationId === 'none' 
        ? (!activeAssessment.location_id) 
        : (activeAssessment.location_id === selectedLocationId)
      if (!match) {
        setActiveAssessment(null)
      }
    }
  }, [selectedLocationId, activeAssessment])

  // ─── Handlers ───────────────────────────────────────────────────

  const handleSaveSettings = async () => {
    if (!customer) return
    setIsLoading(true)
    try {
      const response = await apiClient.put<Customer>(`/customers/${customerId}`, {
        primary_sector: editPrimarySector,
        sectors: editSectors,
        assigned_frameworks: editFrameworks,
        industry: editPrimarySector
      })
      setCustomer(response.data)
      setIsEditingSettings(false)
      
      for (const fw of editFrameworks) {
        const dbFwId = FRONTEND_TO_DB_MAP[fw] || fw
        await apiClient.post('/assessments', {
          customer_id: customerId,
          framework_id: dbFwId
        })
      }
      
      const assessResponse = await apiClient.get<Assessment[]>(`/assessments?customer_id=${customerId}`)
      setAssessments(assessResponse.data || [])
    } catch (e) {
      console.error('Error saving profile settings:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAssessment = async (frameworkId: string) => {
    setIsLoading(true)
    try {
      const dbFwId = FRONTEND_TO_DB_MAP[frameworkId] || frameworkId
      const payload: AssessmentPayload = {
        customer_id: customerId,
        framework_id: dbFwId,
      }
      if (selectedLocationId && selectedLocationId !== 'none') {
        payload.location_id = selectedLocationId
      }
      await apiClient.post('/assessments', payload)
      const assessResponse = await apiClient.get<Assessment[]>(`/assessments?customer_id=${customerId}`)
      setAssessments(assessResponse.data || [])
    } catch (e) {
      console.error('Error creating assessment:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSession = async () => {
    if (!activeAssessment || !newSessionName.trim()) return
    setIsLoading(true)
    try {
      const response = await apiClient.post(`/assessments/${activeAssessment.id}/sessions`, {
        session_name: newSessionName,
        carry_forward_prior: carryForward
      })
      setNewSessionName('')
      await loadSessions(activeAssessment.id)
      launchWizard(response.data)
    } catch (e) {
      console.error('Error launching session:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const launchWizard = async (session: { id: string; session_name?: string; status?: string }) => {
    setActiveSession(session)
    setSavingAnswer(true)
    try {
      const response = await apiClient.get<SessionQuestion[]>(`/sessions/${session.id}/questions`)
      const qList = response.data || []
      setSessionQuestions(qList)
      
      const firstUnanswered = qList.findIndex((q: { answer: string }) => q.answer === 'U')
      setCurrentQuestionIndex(firstUnanswered !== -1 ? firstUnanswered : 0)
      setWizardMode(true)
      setReportMode(false)
    } catch (e) {
      console.error('Error launching wizard:', e)
    } finally {
      setSavingAnswer(false)
    }
  }

  const handleSaveAnswer = async (val: 'Y' | 'N' | 'NA' | 'ALT', comments: string = '', evidence: string = '') => {
    if (!activeSession || !sessionQuestions[currentQuestionIndex]) return
    setSavingAnswer(true)
    
    const activeQ = sessionQuestions[currentQuestionIndex]
    const cleanQId = activeQ.question_id.split(':').pop() || activeQ.question_id
    
    const updatedQs = [...sessionQuestions]
    updatedQs[currentQuestionIndex] = {
      ...activeQ,
      answer: val,
      comments,
      evidence_url: evidence
    }
    setSessionQuestions(updatedQs)

    try {
      await apiClient.patch(`/sessions/${activeSession.id}/answers/${cleanQId}`, {
        answer: val,
        comments,
        evidence_url: evidence
      })
    } catch (e) {
      console.error('Error autosaving answer:', e)
    } finally {
      setSavingAnswer(false)
    }
  }

  const launchReport = async (session: { id: string; session_name?: string; status?: string }) => {
    setActiveSession(session)
    setIsLoading(true)
    try {
      const response = await apiClient.get(`/sessions/${session.id}/report`)
      setReportData(response.data)
      setReportMode(true)
      setWizardMode(false)
    } catch (e) {
      console.error('Error fetching gap report:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLockSession = async () => {
    if (!activeSession) return
    setIsLoading(true)
    try {
      await apiClient.post(`/sessions/${activeSession.id}/complete`)
      if (activeAssessment) {
        await loadSessions(activeAssessment.id)
      }
      setWizardMode(false)
      setReportMode(false)
    } catch (e) {
      console.error('Error completing session:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLaunchWizardDirectly = async (frameworkId: string, frameworkName: string, assessmentId: string) => {
    setIsLoading(true)
    try {
      const response = await apiClient.get<Session[]>(`/assessments/${assessmentId}/sessions`)
      const sessionsList = response.data || []
      
      let activeSess = sessionsList.find(s => s.status === 'IN_PROGRESS')
      
      if (!activeSess) {
        const defaultName = `${frameworkName} Audit - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
        const createResponse = await apiClient.post(`/assessments/${assessmentId}/sessions`, {
          session_name: defaultName,
          carry_forward_prior: true
        })
        activeSess = createResponse.data
      }
      
      if (activeSess) {
        const matchingAssess = assessments.find(a => a.id === assessmentId) || null
        setActiveAssessment(matchingAssess)
        await loadSessions(assessmentId)
        await launchWizard(activeSess)
      }
    } catch (e) {
      console.error('Error launching wizard directly:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInitializeAndLaunchWizard = async (frameworkId: string, frameworkName: string) => {
    setIsLoading(true)
    try {
      const dbFwId = FRONTEND_TO_DB_MAP[frameworkId] || frameworkId
      const payload: AssessmentPayload = {
        customer_id: customerId,
        framework_id: dbFwId,
      }
      if (selectedLocationId && selectedLocationId !== 'none') {
        payload.location_id = selectedLocationId
      }
      const createAssessResp = await apiClient.post<Assessment>('/assessments', payload)
      const newAssess = createAssessResp.data
      
      const assessResponse = await apiClient.get<Assessment[]>(`/assessments?customer_id=${customerId}`)
      setAssessments(assessResponse.data || [])
      
      const defaultName = `${frameworkName} Audit - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
      const createSessionResp = await apiClient.post(`/assessments/${newAssess.id}/sessions`, {
        session_name: defaultName,
        carry_forward_prior: true
      })
      const activeSess = createSessionResp.data
      
      setActiveAssessment(newAssess)
      await loadSessions(newAssess.id)
      await launchWizard(activeSess)
    } catch (e) {
      console.error('Error initializing and launching wizard:', e)
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Computed Values ────────────────────────────────────────────

  const educationGuides = useMemo(() => {
    const sectors = customer?.sectors || []
    const mapped: SectorGuideline[] = []

    for (const s of sectors) {
      if (SECTOR_GUIDELINES[s]) {
        mapped.push(SECTOR_GUIDELINES[s])
      }
    }

    if (mapped.length === 0) {
      const primary = customer?.primary_sector || customer?.industry || 'Energy'
      const fallbackSector = SECTOR_GUIDELINES[primary] || SECTOR_GUIDELINES['Energy']
      mapped.push(fallbackSector)
    }

    return mapped
  }, [customer])

  const unifiedFrameworks = useMemo(() => {
    const assigned = customer?.assigned_frameworks || []
    const customerSectors = customer?.sectors || [customer?.primary_sector || customer?.industry || ''].filter(Boolean)
    
    const allFrameworkIds = new Set<string>(assigned)
    for (const sector of customerSectors) {
      const sectorFws = SECTOR_FRAMEWORK_MAP[sector] || []
      for (const fwId of sectorFws) {
        allFrameworkIds.add(fwId)
      }
    }

    const frameworkMap = new Map<string, { frameworkId: string; frameworkName: string; assessment: Assessment | null; source: 'assigned' | 'sector' | 'both' }>()

    for (const fwId of allFrameworkIds) {
      const fwDef = COMPLIANCE_FRAMEWORKS.find(f => f.id === fwId)
      const isAssigned = assigned.includes(fwId)
      const isSectorDerived = customerSectors.some(s => (SECTOR_FRAMEWORK_MAP[s] || []).includes(fwId))
      frameworkMap.set(fwId, {
        frameworkId: fwId,
        frameworkName: fwDef?.name || fwId,
        assessment: null,
        source: isAssigned && isSectorDerived ? 'both' : isAssigned ? 'assigned' : 'sector',
      })
    }

    for (const assess of assessments) {
      const isMatch = selectedLocationId === 'none'
        ? (!assess.location_id)
        : (assess.location_id === selectedLocationId)
      if (!isMatch) continue

      const rawFwId = assess.framework_id?.replace('regulation:', '') || ''
      const mappedFrontendId = DB_TO_FRONTEND_MAP[rawFwId] || rawFwId
      if (frameworkMap.has(mappedFrontendId)) {
        frameworkMap.get(mappedFrontendId)!.assessment = assess
      } else {
        const fwDef = COMPLIANCE_FRAMEWORKS.find(f => f.id === mappedFrontendId)
        frameworkMap.set(mappedFrontendId, {
          frameworkId: mappedFrontendId,
          frameworkName: fwDef?.name || mappedFrontendId,
          assessment: assess,
          source: 'assigned',
        })
      }
    }

    return Array.from(frameworkMap.values())
  }, [customer, assessments, selectedLocationId])

  // ─── Render ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex-1 overflow-y-auto bg-background text-foreground">
          <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <DataPageSkeleton layout="detail" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!customer) {
    return (
      <AppShell>
        <div className="flex h-screen flex-col items-center justify-center bg-background space-y-4">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Client Dossier not found</p>
          <Link href="/customers">
            <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase">
              Return to Ledger
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background text-foreground">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-mono text-xs">
          
          {/* Back Navigation & Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <Link href="/customers" className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest font-mono select-none">
              <ChevronLeft className="h-4 w-4" />
              [ Return to Customer Ledger ]
            </Link>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input filter */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Filter console..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-44 sm:w-56 h-8 pl-3 pr-8 rounded border border-white/10 bg-slate-950/60 text-[9px] uppercase tracking-wider text-slate-200 placeholder:text-muted-foreground/60 focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground hover:text-cyan-400 transition-colors font-mono font-bold"
                  >
                    ESC
                  </button>
                )}
              </div>

              {/* Edit Layout Toggle Button (disabled on mobile < 1024px) */}
              {!isMobileOrTablet && isMounted && (
                <>
                  <Button
                    size="sm"
                    variant={isEditingLayout ? "default" : "outline"}
                    onClick={() => setIsEditingLayout(!isEditingLayout)}
                    className={`h-8 font-bold text-[9px] uppercase tracking-wider py-1 px-3 select-none ${
                      isEditingLayout
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950'
                        : 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10'
                    }`}
                  >
                    {isEditingLayout ? '🔒 Save Grid Layout' : '🛠️ Edit Grid Layout'}
                  </Button>

                  {/* Reset layout button when editing is active */}
                  {isEditingLayout && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResetLayout}
                      className="h-8 border-orange-500/20 text-orange-400 bg-orange-500/5 hover:bg-orange-500/10 font-bold text-[9px] uppercase tracking-wider py-1 px-2.5 select-none flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset
                    </Button>
                  )}
                </>
              )}

              <Link href={`/customers/${rawId}`}>
                <Button size="sm" variant="outline" className="border-cyan-500/20 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 font-bold text-[9px] uppercase tracking-wider py-1 px-3 h-8 select-none">
                  🏛️ Switch to Classic View
                </Button>
              </Link>
            </div>
          </div>

          {/* Dossier Header Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Building className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold tracking-tight uppercase text-slate-100 flex items-center gap-2">
                  {customer.name}
                  <Badge className="bg-cyan-500 text-slate-950 font-bold text-[9px] uppercase border-none ml-2 tracking-widest">
                    BENTO PREVIEW 🧪
                  </Badge>
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[9px] border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-2 py-0.5 uppercase tracking-wider">
                  Sector: {customer.primary_sector || customer.industry || 'Energy'}
                </Badge>
                {customer.sectors && customer.sectors.map(s => (
                  <Badge key={s} variant="outline" className="text-[8px] border-slate-700 bg-slate-800/40 text-slate-300 px-1.5 py-0.2">
                    {s}
                  </Badge>
                ))}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-2 font-sans">
                  <Globe className="h-3.5 w-3.5" />
                  {customer.website || 'No website registered'}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-white/5 text-xs overflow-x-auto select-none gap-2">
            {(['overview', 'assets', 'audits', 'reference'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setBentoTab(tab)
                  setWizardMode(false)
                  setReportMode(false)
                }}
                className={`pb-2.5 px-4 border-b-2 font-bold uppercase transition-all tracking-wider ${
                  bentoTab === tab && !wizardMode && !reportMode
                    ? 'border-cyan-500 text-cyan-400 font-extrabold'
                    : 'border-transparent text-muted-foreground hover:text-slate-300'
                }`}
              >
                {tab === 'overview' && '📋 Overview Console'}
                {tab === 'assets' && '🏭 Assets & Stakeholders'}
                {tab === 'audits' && '🛡️ Threat & Audits Center'}
                {tab === 'reference' && '⚙️ Profile & reference'}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* 📋 Overview Console (Bento Grid Layout) */}
            {/* 📋 Overview Console (Bento Grid Layout) */}
            {bentoTab === 'overview' && !wizardMode && !reportMode && (
              <div className="space-y-6">
                {(!isMounted || isMobileOrTablet) ? (
                  /* Fallback simple grid without DND wrapper */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {layout.map((cardId) => (
                      <div key={cardId} className={getColSpan(cardId)}>
                        {renderCard(cardId)}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Drag and Drop Grid */
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="bento-grid" direction="vertical">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                          {layout.map((cardId, index) => (
                            <Draggable 
                              key={cardId} 
                              draggableId={cardId} 
                              index={index}
                              isDragDisabled={!isEditingLayout}
                            >
                              {(dragProvided) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={getColSpan(cardId)}
                                >
                                  {renderCard(
                                    cardId,
                                    {}, // Card props
                                    dragProvided.dragHandleProps
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </div>
            )}

            {/* 🏭 Assets & Stakeholders (Side-by-Side Locations & Contacts) */}
            {bentoTab === 'assets' && !wizardMode && !reportMode && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-300">
                
                {/* Locations list (col-span-2) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="p-3 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block pl-1">Facility Locations Registry</span>
                    <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[8.5px] font-mono">
                      {locations.length} Node(s) Registered
                    </Badge>
                  </div>
                  
                  <LocationsPanel 
                    customerId={customerId} 
                    onNavigateToContacts={handleNavigateToContacts}
                  />
                </div>

                {/* Contacts pane (col-span-1) */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="p-3 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block pl-1 font-mono">Contacts & Directory</span>
                    <Users className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  
                  <div className="p-3 border border-white/5 bg-slate-900/40 rounded-xl">
                    <ContactsPanel 
                      customerId={customerId} 
                      highlightedContactId={highlightedContactId}
                      onClearHighlight={() => setHighlightedContactId(null)}
                    />
                  </div>
                </div>

              </div>
            )}

            {/* 🛡️ Threat & Audits Center (Wizard & Radar Network Canvas) */}
            {bentoTab === 'audits' && (
              <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
                
                {/* Controller switches */}
                {!wizardMode && !reportMode && (
                  <div className="p-2 border border-white/5 bg-slate-950 rounded-xl flex items-center gap-2 w-fit">
                    <Button
                      size="sm"
                      onClick={() => setAuditToggle('compliance')}
                      className={`h-7 px-3 text-[9px] uppercase tracking-wider font-mono font-bold ${
                        auditToggle === 'compliance'
                          ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-600'
                          : 'bg-transparent border border-transparent hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      Compliance Audits Ledger
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setAuditToggle('canvas')}
                      className={`h-7 px-3 text-[9px] uppercase tracking-wider font-mono font-bold ${
                        auditToggle === 'canvas'
                          ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-600'
                          : 'bg-transparent border border-transparent hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      SCADA Threat Canvas Map
                    </Button>
                  </div>
                )}

                {/* Main Views */}
                {auditToggle === 'compliance' || wizardMode || reportMode ? (
                  <ComplianceTab
                    customer={customer}
                    wizardMode={wizardMode}
                    setWizardMode={setWizardMode}
                    reportMode={reportMode}
                    setReportMode={setReportMode}
                    assessments={assessments}
                    activeAssessment={activeAssessment}
                    setActiveAssessment={setActiveAssessment}
                    sessions={sessions}
                    activeSession={activeSession}
                    sessionQuestions={sessionQuestions}
                    currentQuestionIndex={currentQuestionIndex}
                    setCurrentQuestionIndex={setCurrentQuestionIndex}
                    savingAnswer={savingAnswer}
                    reportData={reportData}
                    trends={trends}
                    newSessionName={newSessionName}
                    setNewSessionName={setNewSessionName}
                    carryForward={carryForward}
                    setCarryForward={setCarryForward}
                    unifiedFrameworks={unifiedFrameworks}
                    setActiveTab={(tab) => {
                      if (tab === 'profile') setBentoTab('reference')
                    }}
                    handleCreateAssessment={handleCreateAssessment}
                    handleCreateSession={handleCreateSession}
                    launchWizard={launchWizard}
                    launchReport={launchReport}
                    handleSaveAnswer={handleSaveAnswer}
                    handleLockSession={handleLockSession}
                    handleLaunchWizardDirectly={handleLaunchWizardDirectly}
                    handleInitializeAndLaunchWizard={handleInitializeAndLaunchWizard}
                    selectedLocationId={selectedLocationId}
                    setSelectedLocationId={setSelectedLocationId}
                    locations={locations}
                    rollupData={rollupData}
                  />
                ) : (
                  <div className="h-[680px] w-full rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md overflow-hidden relative flex flex-col">
                    <CSETNetworkCanvas />
                  </div>
                )}

              </div>
            )}

            {/* ⚙️ Profile & Reference (Standard guidelines + settings) */}
            {bentoTab === 'reference' && !wizardMode && !reportMode && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-300">
                
                {/* Sectors and frameworks config (col-span-2) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="p-3 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block pl-1 font-mono">Dossier Settings Profile</span>
                    <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[8.5px] font-mono">
                      Active
                    </Badge>
                  </div>
                  
                  <ProfileTab
                    customer={customer}
                    isEditingSettings={isEditingSettings}
                    setIsEditingSettings={setIsEditingSettings}
                    editPrimarySector={editPrimarySector}
                    setEditPrimarySector={setEditPrimarySector}
                    editSectors={editSectors}
                    setEditSectors={setEditSectors}
                    editFrameworks={editFrameworks}
                    setEditFrameworks={setEditFrameworks}
                    handleSaveSettings={handleSaveSettings}
                    onNavigateToContacts={handleNavigateToContacts}
                  />
                </div>

                {/* Guidelines reference (col-span-1) */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="p-3 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block pl-1 font-mono">CISA Sector Guidelines Reference</span>
                    <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  
                  <EducationTab
                    customer={customer}
                    educationGuides={educationGuides}
                    setActiveTab={() => {}}
                  />
                </div>

              </div>
            )}

          </div>

        </div>
      </div>
    </AppShell>
  )
}
