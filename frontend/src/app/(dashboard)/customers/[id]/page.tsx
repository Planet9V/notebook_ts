'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase,
  Globe,
  Building,
  AlertTriangle,
  Play,
  ChevronLeft,
} from 'lucide-react'
import apiClient from '@/lib/api/client'
import { CSETNetworkCanvas } from '../../notebooks/components/CSETNetworkCanvas'
import { ContactsPanel } from '@/components/contacts/ContactsPanel'
import { LocationsPanel } from '@/components/locations/LocationsPanel'
import { DataPageSkeleton } from '@/components/common/DataPageSkeleton'
import { useBreadcrumbLabel } from '@/lib/hooks/use-breadcrumb-label'
import { useLocations } from '@/lib/hooks/use-locations'
import {
  Customer,
  Notebook,
  SectorGuideline,
  COMPLIANCE_FRAMEWORKS,
  SECTOR_FRAMEWORK_MAP,
  SECTOR_GUIDELINES,
} from './data'
import { ProfileTab, ComplianceTab, EducationTab, ActivityTab, NotesTab } from './components'

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

export default function CustomerDossierPage() {
  const params = useParams()
  const rawId = params.id as string
  const customerId = `customer:${rawId}`

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('none')
  const { data: locations = [] } = useLocations(customerId)
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'contacts' | 'locations' | 'projects' | 'threats' | 'compliance' | 'education' | 'activity' | 'notes'>('profile')
  const [highlightedContactId, setHighlightedContactId] = useState<string | null>(null)

  const handleNavigateToContacts = (contactId?: string) => {
    if (contactId) {
      setHighlightedContactId(contactId)
    }
    setActiveTab('contacts')
  }

  // Set human-readable breadcrumb label
  useBreadcrumbLabel(customer?.name)

  // Compliance Auditing Workspace State
  const [assessments, setAssessments] = useState<any[]>([])
  const [activeAssessment, setActiveAssessment] = useState<any | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any | null>(null)
  const [sessionQuestions, setSessionQuestions] = useState<any[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [wizardMode, setWizardMode] = useState<boolean>(false)
  const [savingAnswer, setSavingAnswer] = useState<boolean>(false)
  const [reportData, setReportData] = useState<any | null>(null)
  const [reportMode, setReportMode] = useState<boolean>(false)
  const [trends, setTrends] = useState<any[]>([])
  
  // Custom Profile Editor Settings State
  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false)
  const [editPrimarySector, setEditPrimarySector] = useState<string>('')
  const [editSectors, setEditSectors] = useState<string[]>([])
  const [editFrameworks, setEditFrameworks] = useState<string[]>([])
  const [newSessionName, setNewSessionName] = useState<string>('')
  const [carryForward, setCarryForward] = useState<boolean>(true)

  // ─── Data Fetching ──────────────────────────────────────────────

  const fetchDossierData = async () => {
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
      const assessResponse = await apiClient.get<any[]>(`/assessments?customer_id=${customerId}`)
      setAssessments(assessResponse.data || [])
    } catch (e) {
      console.error('Error fetching dossier data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const [rollupData, setRollupData] = useState<any | null>(null)

  const fetchRollupData = async () => {
    try {
      const response = await apiClient.get(`/customers/${customerId}/compliance-rollup`)
      setRollupData(response.data)
    } catch (e) {
      console.error('Error fetching compliance rollup data:', e)
    }
  }

  useEffect(() => {
    if (customerId) {
      fetchRollupData()
    }
  }, [customerId, assessments])

  useEffect(() => {
    fetchDossierData()
  }, [rawId])

  // Fetch sessions for active assessment
  const loadSessions = async (assessId: string) => {
    try {
      const response = await apiClient.get<any[]>(`/assessments/${assessId}/sessions`)
      setSessions(response.data || [])
      
      // Fetch trends as well
      const trendResponse = await apiClient.get<any[]>(`/assessments/${assessId}/trends`)
      setTrends(trendResponse.data || [])
    } catch (e) {
      console.error('Error loading sessions:', e)
    }
  }

  useEffect(() => {
    if (activeAssessment) {
      loadSessions(activeAssessment.id)
    } else {
      setSessions([])
      setTrends([])
    }
  }, [activeAssessment])

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

  // Save modified Customer profile settings
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
      
      // Create compliance links automatically for each new assigned framework
      for (const fw of editFrameworks) {
        const dbFwId = FRONTEND_TO_DB_MAP[fw] || fw
        await apiClient.post('/assessments', {
          customer_id: customerId,
          framework_id: dbFwId
        })
      }
      
      // Reload everything
      const assessResponse = await apiClient.get<any[]>(`/assessments?customer_id=${customerId}`)
      setAssessments(assessResponse.data || [])
    } catch (e) {
      console.error('Error saving profile settings:', e)
    } finally {
      setIsLoading(false)
    }
  }

  // Create new Auditing Session Milestone
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
      
      // Auto launch wizard for the new session
      launchWizard(response.data)
    } catch (e) {
      console.error('Error launching session:', e)
    } finally {
      setIsLoading(false)
    }
  }

  // Launch Question Audit Wizard
  const launchWizard = async (session: { id: string; session_name?: string; status?: string }) => {
    setActiveSession(session)
    setSavingAnswer(true)
    try {
      const response = await apiClient.get<any[]>(`/sessions/${session.id}/questions`)
      const qList = response.data || []
      setSessionQuestions(qList)
      
      // Find first unanswered question or default to 0
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

  // Save CSET Wizard Question Answer with Debounce / State Autosave
  const handleSaveAnswer = async (val: 'Y' | 'N' | 'NA' | 'ALT', comments: string = '', evidence: string = '') => {
    if (!activeSession || !sessionQuestions[currentQuestionIndex]) return
    setSavingAnswer(true)
    
    const activeQ = sessionQuestions[currentQuestionIndex]
    const cleanQId = activeQ.question_id.split(':').pop() || activeQ.question_id
    
    // Optimistic UI state update
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

  // Launch Session Report Card & Gap analysis
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

  // Lock audit session permanently
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

  // ─── Computed Values ────────────────────────────────────────────

  // Aggregate deal statistics
  const dossierStats = useMemo(() => {
    const totalDeals = notebooks.length
    const pipelineSum = notebooks.reduce((sum, n) => sum + (n.estimated_value || 0), 0)
    const activeDeals = notebooks.filter(n => n.stage !== 'won').length
    
    // Simulate active threat path counts
    const activeThreatCount = notebooks.length > 0 ? (rawId.charCodeAt(0) % 2 === 0 ? 2 : 0) : 0
    
    return { totalDeals, pipelineSum, activeDeals, activeThreatCount }
  }, [notebooks, rawId])

  // Get education guide text based on sector
  const educationGuides = useMemo(() => {
    const sectors = customer?.sectors || []
    const mapped: SectorGuideline[] = []

    for (const s of sectors) {
      if (SECTOR_GUIDELINES[s]) {
        mapped.push(SECTOR_GUIDELINES[s])
      }
    }

    // Fallback mapping
    if (mapped.length === 0) {
      const primary = customer?.primary_sector || customer?.industry || 'Energy'
      const fallbackSector = SECTOR_GUIDELINES[primary] || SECTOR_GUIDELINES['Energy']
      mapped.push(fallbackSector)
    }

    return mapped
  }, [customer])

  // Merge assigned_frameworks from profile + sector-derived frameworks with existing assessments
  const unifiedFrameworks = useMemo(() => {
    const assigned = customer?.assigned_frameworks || []
    const customerSectors = customer?.sectors || [customer?.primary_sector || customer?.industry || ''].filter(Boolean)
    
    // Collect all framework IDs: explicitly assigned + derived from sectors
    const allFrameworkIds = new Set<string>(assigned)
    for (const sector of customerSectors) {
      const sectorFws = SECTOR_FRAMEWORK_MAP[sector] || []
      for (const fwId of sectorFws) {
        allFrameworkIds.add(fwId)
      }
    }

    const frameworkMap = new Map<string, { frameworkId: string; frameworkName: string; assessment: Record<string, unknown> | null; source: 'assigned' | 'sector' | 'both' }>()

    // Add all framework IDs (assigned + sector-derived)
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

    // Overlay existing assessments
    for (const assess of assessments) {
      const isMatch = selectedLocationId === 'none'
        ? (!assess.location_id)
        : (assess.location_id === selectedLocationId)
      if (!isMatch) continue

      const rawId = assess.framework_id?.replace('regulation:', '') || ''
      const mappedFrontendId = DB_TO_FRONTEND_MAP[rawId] || rawId
      if (frameworkMap.has(mappedFrontendId)) {
        frameworkMap.get(mappedFrontendId)!.assessment = assess
      } else {
        // Assessment exists but not in assigned_frameworks or sectors (legacy or manual)
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

  // Create assessment for a single framework that doesn't have one yet
  const handleCreateAssessment = async (frameworkId: string) => {
    setIsLoading(true)
    try {
      const dbFwId = FRONTEND_TO_DB_MAP[frameworkId] || frameworkId
      const payload: any = {
        customer_id: customerId,
        framework_id: dbFwId,
      }
      if (selectedLocationId && selectedLocationId !== 'none') {
        payload.location_id = selectedLocationId
      }
      await apiClient.post('/assessments', payload)
      // Reload assessments
      const assessResponse = await apiClient.get<any[]>(`/assessments?customer_id=${customerId}`)
      setAssessments(assessResponse.data || [])
    } catch (e) {
      console.error('Error creating assessment:', e)
    } finally {
      setIsLoading(false)
    }
  }

  // Directly launches the wizard for an existing assessment (opens active session or auto-creates one)
  const handleLaunchWizardDirectly = async (frameworkId: string, frameworkName: string, assessmentId: string) => {
    setIsLoading(true)
    try {
      const response = await apiClient.get<any[]>(`/assessments/${assessmentId}/sessions`)
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

  // Initializes assessment and automatically starts/launches first wizard session in one click
  const handleInitializeAndLaunchWizard = async (frameworkId: string, frameworkName: string) => {
    setIsLoading(true)
    try {
      const dbFwId = FRONTEND_TO_DB_MAP[frameworkId] || frameworkId
      const payload: any = {
        customer_id: customerId,
        framework_id: dbFwId,
      }
      if (selectedLocationId && selectedLocationId !== 'none') {
        payload.location_id = selectedLocationId
      }
      const createAssessResp = await apiClient.post('/assessments', payload)
      const newAssess = createAssessResp.data
      
      const assessResponse = await apiClient.get<any[]>(`/assessments?customer_id=${customerId}`)
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
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          
          {/* Back Navigation & Mode Toggle */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <Link href="/customers" className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest font-mono select-none w-fit">
              <ChevronLeft className="h-4 w-4" />
              [ Return to Customer Ledger ]
            </Link>
            
            <Link href={`/customers/${rawId}/bento`}>
              <Button size="sm" variant="outline" className="border-cyan-500/20 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 font-bold text-[9px] uppercase tracking-wider py-1 px-3 h-8 select-none">
                🧪 Try Bento View
              </Button>
            </Link>
          </div>

          {/* Dossier Title Block */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Building className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold tracking-tight uppercase font-mono text-slate-100">
                  {customer.name}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[9px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-2 py-0.5 uppercase tracking-wider">
                  Primary Sector: {customer.primary_sector || customer.industry || 'Energy'}
                </Badge>
                {customer.sectors && customer.sectors.map(s => (
                  <Badge key={s} variant="outline" className="text-[8px] font-mono border-slate-700 bg-slate-800/40 text-slate-300 px-1.5 py-0.2">
                    {s}
                  </Badge>
                ))}
                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 ml-2">
                  <Globe className="h-3.5 w-3.5" />
                  {customer.website || 'No website registered'}
                </span>
              </div>
            </div>

            {/* Dossier Statistics Block */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 border border-white/5 rounded-lg bg-slate-900/40 text-center font-mono">
                <span className="text-[8px] text-muted-foreground uppercase tracking-widest block">Linked Deals</span>
                <span className="text-sm font-bold text-slate-200">{dossierStats.totalDeals} Active</span>
              </div>
              <div className="px-4 py-2 border border-white/5 rounded-lg bg-slate-900/40 text-center font-mono">
                <span className="text-[8px] text-muted-foreground uppercase tracking-widest block">Pipeline Value</span>
                <span className="text-sm font-bold text-slate-200">
                  ${dossierStats.pipelineSum.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="px-4 py-2 border border-white/5 rounded-lg bg-slate-900/40 text-center font-mono">
                <span className="text-[8px] text-muted-foreground uppercase tracking-widest block">Threat Warnings</span>
                <span className={`text-sm font-bold ${dossierStats.activeThreatCount > 0 ? 'text-orange-500 animate-pulse' : 'text-emerald-400'}`}>
                  {dossierStats.activeThreatCount > 0 ? `${dossierStats.activeThreatCount} Alerts` : 'None (Secure)'}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-white/5 font-mono text-xs overflow-x-auto select-none gap-2">
            {(['profile', 'contacts', 'locations', 'projects', 'threats', 'compliance', 'education', 'activity', 'notes'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                  setWizardMode(false)
                  setReportMode(false)
                }}
                className={`pb-2.5 px-3 border-b-2 font-medium transition-all ${
                  activeTab === tab && !wizardMode && !reportMode
                    ? 'border-cyan-500 text-cyan-400 font-bold'
                    : 'border-transparent text-muted-foreground hover:text-slate-300'
                }`}
              >
                {tab === 'profile' && 'PROFILE STAKEHOLDERS'}
                {tab === 'contacts' && 'CONTACTS'}
                {tab === 'locations' && 'LOCATIONS'}
                {tab === 'projects' && 'B2B DEAL PIPELINE'}
                {tab === 'threats' && 'THREAT CANVAS'}
                {tab === 'compliance' && 'COMPLIANCE WIZARD (CSET)'}
                {tab === 'education' && 'SECTOR REFERENCE'}
                {tab === 'activity' && 'ACTIVITY TIMELINE'}
                {tab === 'notes' && 'NOTES'}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Tab 1: Profile & Contacts */}
            {activeTab === 'profile' && (
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
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div className="font-mono text-xs">
                <ContactsPanel 
                  customerId={customerId} 
                  highlightedContactId={highlightedContactId}
                  onClearHighlight={() => setHighlightedContactId(null)}
                />
              </div>
            )}

            {/* Locations Tab */}
            {activeTab === 'locations' && (
              <div className="font-mono text-xs">
                <LocationsPanel 
                  customerId={customerId} 
                  onNavigateToContacts={handleNavigateToContacts}
                />
              </div>
            )}

            {/* Tab 2: Associated Notebooks */}
            {activeTab === 'projects' && (
              <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom duration-300">
                {notebooks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 font-mono text-xs">
                    <Briefcase className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground">No proposals linked</p>
                    <p className="text-[10px] text-muted-foreground/75 max-w-[240px] leading-relaxed">
                      This customer has no active notebooks. Link notebooks by editing a notebook's Customer Link.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-950/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                          <th className="p-4 w-1/3">Notebook Workspace</th>
                          <th className="p-4 w-1/6">Pipeline Stage</th>
                          <th className="p-4 w-1/6">Deal Value</th>
                          <th className="p-4 w-1/6">Draft Assets</th>
                          <th className="p-4 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {notebooks.map((nb, index) => (
                          <tr 
                            key={nb.id} 
                            className="hover:bg-slate-800/20 transition-all group animate-in fade-in slide-in-from-bottom duration-300"
                            style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
                          >
                            <td className="p-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-200 text-xs">{nb.name}</span>
                                <span className="text-[10px] text-muted-foreground line-clamp-1 truncate max-w-sm">{nb.description}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge className="text-[8px] font-mono border-white/10 uppercase tracking-widest py-0.5 font-bold">
                                {nb.stage}
                              </Badge>
                            </td>
                            <td className="p-4 font-bold text-slate-300">
                              ${(nb.estimated_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-muted-foreground">{nb.note_count} Notes • {nb.source_count} Sources</td>
                            <td className="p-4 text-right">
                              <Link href={`/notebooks?id=${nb.id.replace('notebook:', '')}`}>
                                <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[9px] uppercase tracking-wider py-1 px-2.5 h-7">
                                  <Play className="h-2.5 w-2.5 mr-1 bg-cyan-950 text-cyan-400 p-0.5 rounded-full" />
                                  Launch Workspace
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* Tab 3: Threat Canvas */}
            {activeTab === 'threats' && (
              <div className="h-[680px] w-full rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md overflow-hidden relative flex flex-col animate-in fade-in slide-in-from-bottom duration-300">
                <CSETNetworkCanvas />
              </div>
            )}

            {/* Tab 4: CSET Compliance Auditing & Wizard Workspace */}
            {activeTab === 'compliance' && (
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
                setActiveTab={setActiveTab}
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
            )}

            {/* Tab 5: Dynamic Sector Reference Guidelines */}
            {activeTab === 'education' && (
              <EducationTab
                customer={customer}
                educationGuides={educationGuides}
                setActiveTab={setActiveTab}
              />
            )}

            {/* Tab 6: Activity Timeline */}
            {activeTab === 'activity' && customer && (
              <ActivityTab customerId={customer.id} />
            )}

            {/* Tab 7: Notes */}
            {activeTab === 'notes' && (
              <NotesTab customerId={customerId} />
            )}

          </div>

        </div>
      </div>
    </AppShell>
  )
}
