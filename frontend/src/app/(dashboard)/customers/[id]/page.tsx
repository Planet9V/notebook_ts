'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  RefreshCw, 
  Briefcase, 
  ShieldAlert, 
  ShieldCheck, 
  BookOpen, 
  Globe, 
  Mail, 
  Building,
  ExternalLink,
  ChevronLeft,
  FileText,
  AlertTriangle,
  Play,
  Check,
  X,
  Plus,
  Settings2,
  TrendingUp,
  BarChart2,
  Bookmark,
  Clock,
  ChevronRight,
  ClipboardCheck
} from 'lucide-react'
import apiClient from '@/lib/api/client'
import { CSETNetworkCanvas } from '../../notebooks/components/CSETNetworkCanvas'

interface Customer {
  id: string
  name: string
  website: string
  description: string
  industry: string
  primary_sector?: string
  sectors?: string[]
  assigned_frameworks?: string[]
  contacts: { name: string; title: string; email: string }[]
}

interface Notebook {
  id: string
  name: string
  description: string
  stage: string
  estimated_value: number
  customer_id: string
  updated: string
  note_count: number
  source_count: number
}

const CISA_SECTORS = [
  'Chemical',
  'Commercial Facilities',
  'Communications',
  'Critical Manufacturing',
  'Dams',
  'Defense Industrial Base',
  'Emergency Services',
  'Energy',
  'Financial Services',
  'Food and Agriculture',
  'Government Facilities',
  'Healthcare and Public Health',
  'Information Technology',
  'Nuclear Reactors, Materials, and Waste',
  'Transportation Systems',
  'Water and Wastewater Systems',
  'Cross-Sector'
]

const COMPLIANCE_FRAMEWORKS = [
  { id: 'IEC_62443_3_3', name: 'IEC 62443-3-3' },
  { id: 'IEC_62443_4_2', name: 'IEC 62443-4-2' },
  { id: 'NIST_800_82', name: 'NIST SP 800-82 r3' },
  { id: 'NIST_800_53', name: 'NIST SP 800-53 r5' },
  { id: 'NIST_CSF', name: 'NIST CSF v2.0' },
  { id: 'CISA_CPG', name: 'CISA Cross-Sector CPGs' },
  { id: 'CIS_CONTROLS', name: 'CIS Controls v8' },
  { id: 'NERC_CIP_002', name: 'NERC CIP-002' },
  { id: 'NERC_CIP_003', name: 'NERC CIP-003' },
  { id: 'NERC_CIP_004', name: 'NERC CIP-004' },
  { id: 'NERC_CIP_005', name: 'NERC CIP-005' },
  { id: 'NERC_CIP_006', name: 'NERC CIP-006' },
  { id: 'NERC_CIP_007', name: 'NERC CIP-007' },
  { id: 'NERC_CIP_008', name: 'NERC CIP-008' },
  { id: 'NERC_CIP_009', name: 'NERC CIP-009' },
  { id: 'NERC_CIP_010', name: 'NERC CIP-010' },
  { id: 'NERC_CIP_011', name: 'NERC CIP-011' },
  { id: 'NERC_CIP_013', name: 'NERC CIP-013' },
  { id: 'NERC_CIP_014', name: 'NERC CIP-014' },
  { id: 'ISO_27019', name: 'ISO 27019' },
  { id: 'NISTIR_7628', name: 'NISTIR 7628' },
  { id: 'INGAA_GUIDE', name: 'INGAA Guidelines' },
  { id: 'API_1164', name: 'API Standard 1164' },
  { id: 'IEEE_1686', name: 'IEEE 1686' },
  { id: 'NRC_RG_5_71', name: 'NRC Reg Guide 5.71' },
  { id: 'IAEA_NSS_17', name: 'IAEA NSS-17' },
  { id: 'AWWA_G430', name: 'AWWA G430' },
  { id: 'EPA_WATER', name: 'EPA Baseline' },
  { id: 'AWWA_M19', name: 'AWWA M19' },
  { id: 'NIST_800_171', name: 'NIST SP 800-171' },
  { id: 'NIST_800_172', name: 'NIST SP 800-172' },
  { id: 'CMMC_L1', name: 'CMMC Level 1' },
  { id: 'CMMC_L2', name: 'CMMC Level 2' },
  { id: 'CMMC_L3', name: 'CMMC Level 3' },
  { id: 'CNSSI_1253', name: 'CNSSI 1253' },
  { id: 'NNSA_NAP_24', name: 'NNSA NAP-24A' },
  { id: 'TSA_PIPELINE', name: 'TSA Pipeline' },
  { id: 'TSA_RAIL', name: 'TSA Rail' },
  { id: 'FAA_AIRPORT', name: 'FAA Airport' },
  { id: 'USCG_MARITIME', name: 'USCG Maritime' },
  { id: 'DO_326A', name: 'DO-326A' },
  { id: 'CFATS_RBPS', name: 'CFATS RBPS' },
  { id: 'ANSSI_BP_006', name: 'ANSSI BP-006' },
  { id: 'BSI_IT_GRUNDSCHUTZ', name: 'BSI IT-Grundschutz' },
  { id: 'DHS_CATALOG', name: 'DHS Catalog' },
  { id: 'ISA_99_LEGACY', name: 'ISA-99' },
  { id: 'ISO_27001', name: 'ISO 27001' },
  { id: 'COBIT_2019', name: 'COBIT 2019' },
  { id: 'HIPAA_SECURITY', name: 'HIPAA Security' },
  { id: 'SOC_2', name: 'SOC 2 Type II' },
  { id: 'PCI_DSS', name: 'PCI-DSS' },
  { id: 'CSA_CCM', name: 'CSA CCM' },
  { id: 'ACSC_ESSENTIAL_8', name: 'ACSC Essential 8' },
  { id: 'SWIFT_CSCF', name: 'SWIFT CSCF' },
  { id: 'CRI_PROFILE', name: 'CRI Profile' },
  { id: 'KATRI_SCADA', name: 'KATRI SCADA' },
  { id: 'NIST_800_37', name: 'NIST SP 800-37' },
  { id: 'NIST_800_161', name: 'NIST SP 800-161' },
  { id: 'ENISA_IOT', name: 'ENISA IoT Guidelines' },
  { id: 'NIS2', name: 'EU NIS2 Directive' },
  { id: 'CRA', name: 'EU Cyber Resilience Act' },
  { id: 'SOCI_ACT', name: 'Australian SOCI Act' }
]

export default function CustomerDossierPage() {
  const params = useParams()
  const rawId = params.id as string
  const customerId = `customer:${rawId}`

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'projects' | 'threats' | 'compliance' | 'education'>('profile')

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
      const nbsResponse = await apiClient.get<Notebook[]>('/api/notebooks')
      const associatedNbs = (nbsResponse.data || []).filter(
        (nb) => nb.customer_id === customerId || nb.customer_id === rawId
      )
      setNotebooks(associatedNbs)

      // 3. Fetch active compliance assessments
      const assessResponse = await apiClient.get<any[]>(`/api/assessments?customer_id=${customerId}`)
      setAssessments(assessResponse.data || [])
    } catch (e) {
      console.error('Error fetching dossier data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDossierData()
  }, [rawId])

  // Fetch sessions for active assessment
  const loadSessions = async (assessId: string) => {
    try {
      const response = await apiClient.get<any[]>(`/api/assessments/${assessId}/sessions`)
      setSessions(response.data || [])
      
      // Fetch trends as well
      const trendResponse = await apiClient.get<any[]>(`/api/assessments/${assessId}/trends`)
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
        await apiClient.post('/api/assessments', {
          customer_id: customerId,
          framework_id: fw
        })
      }
      
      // Reload everything
      const assessResponse = await apiClient.get<any[]>(`/api/assessments?customer_id=${customerId}`)
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
      const response = await apiClient.post(`/api/assessments/${activeAssessment.id}/sessions`, {
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
  const launchWizard = async (session: any) => {
    setActiveSession(session)
    setSavingAnswer(true)
    try {
      const response = await apiClient.get<any[]>(`/api/sessions/${session.id}/questions`)
      const qList = response.data || []
      setSessionQuestions(qList)
      
      // Find first unanswered question or default to 0
      const firstUnanswered = qList.findIndex((q: any) => q.answer === 'U')
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
    const cleanQId = activeQ.question_id.split(':', 1)[-1]
    
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
      await apiClient.patch(`/api/sessions/${activeSession.id}/answers/${cleanQId}`, {
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
  const launchReport = async (session: any) => {
    setActiveSession(session)
    setIsLoading(true)
    try {
      const response = await apiClient.get(`/api/sessions/${session.id}/report`)
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
      await apiClient.post(`/api/sessions/${activeSession.id}/complete`)
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
  const educationGuide = useMemo(() => {
    const sector = customer?.industry || 'Energy'
    switch (sector) {
      case 'Water and Wastewater Systems':
      case 'Water':
        return {
          title: 'AWWA G430 & CISA Water Segment Cybersecurity Guidelines',
          description: 'CISA recommended cybersecurity baseline mitigations for water treatment and wastewater networks.',
          checks: [
            { code: 'AWWA Sec 4.1', title: 'Operational Technology Separation', text: 'Enforce absolute air-gapped isolation or secure hardware diode boundaries between industrial water processing PLCs and administrative billing LANs.' },
            { code: 'CISA Water 2.3', title: 'Remote Access Terminal Mediation', text: 'All third-party engineering support access terminals must terminate inside a secure Operations DMZ with multi-factor gating.' },
            { code: 'EPA Risk 5.9', title: 'Physical Field Port Lockdown', text: 'Unused Ethernet ports on field switches located at remote pumping stations must be disabled and physical enclosures locked.' }
          ]
        }
      case 'Energy':
      default:
        return {
          title: 'NERC CIP & CISA Bulk Power Grid Mitigation Standard',
          description: 'Mandatory critical infrastructure protection requirements for entities operating electric substation and power networks.',
          checks: [
            { code: 'CIP-005-7 R1', title: 'Electronic Security Perimeter (ESP)', text: 'Enforce firewall boundary isolation around all Cyber Assets that control grid frequency, load management, or switchgear operations.' },
            { code: 'CIP-007-6 R2', title: 'OT Port and Service Lockdown', text: 'Configure operational switches to strictly block unused interfaces and disable unsafe legacy remote control protocols.' },
            { code: 'CIP-009-6 R1', title: 'Substation Disaster Recovery Strategy', text: 'Verify system backups of critical RTU firmware configurations are stored offline in tamper-proof environments.' }
          ]
        }
    }
  }, [customer])

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mt-1">Retrieving dossier files...</p>
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
          
          {/* Back Navigation */}
          <Link href="/customers" className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest font-mono select-none w-fit">
            <ChevronLeft className="h-4 w-4" />
            [ Return to Customer Ledger ]
          </Link>

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
            {(['profile', 'projects', 'threats', 'compliance', 'education'] as const).map(tab => (
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
                {tab === 'projects' && 'B2B DEAL PIPELINE'}
                {tab === 'threats' && 'THREAT CANVAS'}
                {tab === 'compliance' && 'COMPLIANCE WIZARD (CSET)'}
                {tab === 'education' && 'SECTOR REFERENCE'}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Tab 1: Profile & Contacts */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
                <div className="lg:col-span-2 space-y-4">
                  <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md">
                    <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Corporate Profile</CardTitle>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingSettings(!isEditingSettings)} className="text-cyan-400 hover:text-cyan-300 font-bold font-mono h-7 text-[10px] uppercase">
                        <Settings2 className="h-3.5 w-3.5 mr-1" />
                        {isEditingSettings ? 'Cancel Edit' : 'Edit Sectors & Standards'}
                      </Button>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4 font-sans text-xs text-muted-foreground/90 leading-relaxed">
                      
                      {isEditingSettings ? (
                        <div className="space-y-4 font-mono text-xs">
                          {/* Sector Settings */}
                          <div className="space-y-2">
                            <label className="font-bold text-slate-200 block">Primary Sector</label>
                            <select 
                              value={editPrimarySector} 
                              onChange={(e) => setEditPrimarySector(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-200 font-mono text-xs"
                            >
                              {CISA_SECTORS.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>

                          {/* Multi Select Sectors */}
                          <div className="space-y-2">
                            <label className="font-bold text-slate-200 block">Mapped CISA Infrastructure Sectors (Multi-select)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-slate-950/50 border border-white/5 rounded-lg max-h-48 overflow-y-auto">
                              {CISA_SECTORS.map(s => {
                                const isChecked = editSectors.includes(s)
                                return (
                                  <label key={s} className="flex items-center gap-2 cursor-pointer hover:text-slate-100 transition-all py-1 select-none">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setEditSectors(editSectors.filter(sec => sec !== s))
                                        } else {
                                          setEditSectors([...editSectors, s])
                                        }
                                      }}
                                      className="rounded bg-slate-900 border-white/10 text-cyan-500 focus:ring-0 focus:ring-offset-0 animate-none"
                                    />
                                    <span>{s}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>

                          {/* Multi Select Compliance Frameworks */}
                          <div className="space-y-2">
                            <label className="font-bold text-slate-200 block">Assigned CSET Frameworks</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-slate-950/50 border border-white/5 rounded-lg max-h-48 overflow-y-auto">
                              {COMPLIANCE_FRAMEWORKS.map(fw => {
                                const isChecked = editFrameworks.includes(fw.id)
                                return (
                                  <label key={fw.id} className="flex items-center gap-2 cursor-pointer hover:text-slate-100 transition-all py-1 select-none">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setEditFrameworks(editFrameworks.filter(id => id !== fw.id))
                                        } else {
                                          setEditFrameworks([...editFrameworks, fw.id])
                                        }
                                      }}
                                      className="rounded bg-slate-900 border-white/10 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                                    />
                                    <span className="truncate">{fw.name}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>

                          <Button onClick={handleSaveSettings} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase w-full py-2">
                            Commit Settings & Setup Assessments
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3 font-sans">
                          <p>{customer.description || 'No corporate description file has been uploaded for this client yet.'}</p>
                          <Separator className="bg-white/5 my-4" />
                          <div className="font-mono text-[10.5px] space-y-2">
                            <span className="font-bold text-slate-300 block uppercase tracking-wider">Sector Coverage Profile</span>
                            <div className="flex flex-wrap gap-1.5">
                              {customer.sectors && customer.sectors.length > 0 ? (
                                customer.sectors.map(s => (
                                  <Badge key={s} variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-bold">
                                    {s.toUpperCase()}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">No sectors assigned.</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="font-mono text-[10.5px] space-y-2 mt-4">
                            <span className="font-bold text-slate-300 block uppercase tracking-wider">Active Standard Scopes</span>
                            <div className="flex flex-wrap gap-1.5">
                              {customer.assigned_frameworks && customer.assigned_frameworks.length > 0 ? (
                                customer.assigned_frameworks.map(fw => (
                                  <Badge key={fw} variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-bold">
                                    {fw}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">No standard frameworks assigned.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                <div className="lg:col-span-1 space-y-4">
                  <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md">
                    <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stakeholder Contacts</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {customer.contacts.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic">No stakeholders registered for this corporate client.</p>
                      ) : (
                        customer.contacts.map((contact, index) => (
                          <div key={index} className="p-3 border border-white/5 bg-slate-950/40 rounded-lg space-y-2 relative overflow-hidden">
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500/20" />
                            <div className="pl-1 space-y-1">
                              <p className="font-bold text-slate-200">{contact.name}</p>
                              <p className="text-[10px] text-muted-foreground">{contact.title}</p>
                              <Separator className="bg-white/5 my-2" />
                              <a href={`mailto:${contact.email}`} className="text-[9.5px] text-cyan-400 hover:underline flex items-center gap-1.5 font-mono select-all">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Tab 2: Associated Notebooks */}
            {activeTab === 'projects' && (
              <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden">
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
                        {notebooks.map(nb => (
                          <tr key={nb.id} className="hover:bg-slate-800/20 transition-all group">
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
            )}            {/* Tab 3: Threat Canvas */}
            {activeTab === 'threats' && (
              <div className="h-[680px] w-full rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md overflow-hidden relative flex flex-col">
                <CSETNetworkCanvas />
              </div>
            )}

            {/* Tab 4: CSET Compliance Auditing & Wizard Workspace */}
            {activeTab === 'compliance' && !wizardMode && !reportMode && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
                
                {/* Active Assessments ledger */}
                <div className="lg:col-span-2 space-y-4">
                  <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md">
                    <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Audited Regulatory Frameworks</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {assessments.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground italic">
                          No standards active. Toggle Edit above to assign compliance frameworks to this customer.
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {assessments.map(assess => {
                            const isSelected = activeAssessment?.id === assess.id
                            const rawFwId = assess.framework_id.replace('regulation:', '')
                            return (
                              <div key={assess.id} className={`p-4 hover:bg-slate-900/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isSelected ? 'bg-cyan-500/5 border-l-2 border-cyan-500' : ''}`}>
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-200 text-sm uppercase tracking-tight">{rawFwId}</p>
                                  <p className="text-[10px] text-muted-foreground font-sans">
                                    Authoritative CSET library mapped and hydrated inside database records.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm"
                                    onClick={() => {
                                      setActiveAssessment(assess)
                                      setNewSessionName(`${rawFwId} Audit Q${Math.floor(new Date().getMonth() / 3) + 1} 2026`)
                                    }}
                                    className="h-7 px-3 bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800 text-[10px]"
                                  >
                                    Manage Milestones
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Active Sessions Ledger for Selected Assessment */}
                  {activeAssessment && (
                    <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
                      <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Audit Milestones: {activeAssessment.framework_id.replace('regulation:', '')}
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[8px] font-mono">
                          {sessions.length} Milestones
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {/* Start New Session Form */}
                        <div className="p-3 border border-white/5 bg-slate-950/40 rounded-lg flex flex-col md:flex-row md:items-center gap-3 justify-between">
                          <div className="flex-1 space-y-2">
                            <span className="text-[9.5px] font-bold text-slate-300 block uppercase">Start Audit Milestone</span>
                            <input 
                              type="text" 
                              placeholder="Audit Milestone Name (e.g. Q2 2026 Assessment)"
                              value={newSessionName}
                              onChange={(e) => setNewSessionName(e.target.value)}
                              className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1.5 text-slate-200 text-xs font-mono"
                            />
                            <label className="flex items-center gap-2 cursor-pointer text-[9.5px] text-muted-foreground select-none">
                              <input 
                                type="checkbox" 
                                checked={carryForward}
                                onChange={() => setCarryForward(!carryForward)}
                                className="rounded bg-slate-950 border-white/10 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3 w-3"
                              />
                              <span>Carry forward answers from previous completed session (Recommended)</span>
                            </label>
                          </div>
                          <Button 
                            onClick={handleCreateSession}
                            disabled={!newSessionName.trim()}
                            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[10px] py-2.5 px-4 rounded h-10 w-full md:w-fit uppercase"
                          >
                            Launch Milestone
                          </Button>
                        </div>

                        {/* Sessions List */}
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {sessions.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground italic text-center py-4">No audit milestones started yet for this regulation.</p>
                          ) : (
                            sessions.map(sess => {
                              const isCompleted = sess.status === 'COMPLETED'
                              return (
                                <div key={sess.id} className="p-3 border border-white/5 bg-slate-950/60 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="space-y-1 pl-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-200 text-xs">{sess.session_name}</span>
                                      <Badge variant="outline" className={`text-[8px] font-mono font-bold ${
                                        isCompleted ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-amber-500/20 bg-amber-500/5 text-amber-400'
                                      }`}>
                                        {sess.status}
                                      </Badge>
                                    </div>
                                    <p className="text-[9.5px] text-muted-foreground flex items-center gap-1 font-mono">
                                      <Clock className="h-3 w-3" />
                                      Started: {new Date(sess.created_at).toLocaleDateString()} 
                                      {sess.completed_at && ` • Closed: ${new Date(sess.completed_at).toLocaleDateString()}`}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5">
                                    {!isCompleted && (
                                      <Button 
                                        size="sm"
                                        onClick={() => launchWizard(sess)}
                                        className="h-7 text-[9px] bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-mono font-bold uppercase"
                                      >
                                        Wizard Interface
                                      </Button>
                                    )}
                                    <Button 
                                      size="sm"
                                      onClick={() => launchReport(sess)}
                                      className="h-7 text-[9px] bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 font-mono font-bold uppercase"
                                    >
                                      Gap Report Card
                                    </Button>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Side Auditing Overview & Trends */}
                <div className="lg:col-span-1 space-y-4">
                  
                  {/* Trends Timeline */}
                  {activeAssessment && (
                    <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md animate-in slide-in-from-right duration-300">
                      <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <TrendingUp className="h-4 w-4 text-cyan-400" />
                          Compliance Trend & Deltas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {trends.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground italic text-center py-4">Close audit sessions to generate chronological trend tracking.</p>
                        ) : (
                          <div className="space-y-4">
                            {/* Simple inline visual chart representation */}
                            <div className="h-28 flex items-end justify-between px-2 pt-4 border-b border-white/10 relative">
                              {trends.map((t, idx) => {
                                const heightPercent = Math.max(10, Math.min(100, t.compliance_score))
                                return (
                                  <div key={t.session_id} className="flex flex-col items-center flex-1 group relative">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-1 bg-slate-950 border border-cyan-500/20 text-[9px] text-cyan-400 font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                                      {t.compliance_score.toFixed(1)}% ({t.delta >= 0 ? `+${t.delta.toFixed(1)}%` : `${t.delta.toFixed(1)}%`})
                                    </div>
                                    {/* Bar element */}
                                    <div 
                                      style={{ height: `${heightPercent}px` }} 
                                      className="w-4 bg-gradient-to-t from-cyan-600/30 to-cyan-400 rounded-t border-t border-cyan-300/30 group-hover:to-cyan-300 transition-all cursor-pointer relative"
                                    >
                                      {t.delta !== 0 && (
                                        <span className={`absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold ${
                                          t.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                          {t.delta >= 0 ? `+${Math.round(t.delta)}` : Math.round(t.delta)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[7.5px] text-muted-foreground mt-1 truncate max-w-[60px]">{t.session_name}</span>
                                  </div>
                                )
                              })}
                            </div>
                            
                            {/* Detailed milestones stats ledger */}
                            <div className="space-y-2">
                              <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest block">Audit History Logs</span>
                              {trends.map(t => (
                                <div key={t.session_id} className="flex items-center justify-between text-[10px] p-2 bg-slate-950/40 rounded border border-white/5">
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-200 block">{t.session_name}</span>
                                    <span className="text-[8.5px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-bold text-cyan-400 block">{t.compliance_score.toFixed(1)}%</span>
                                    <span className={`text-[8.5px] font-semibold ${t.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {t.delta === 0 ? 'Baseline' : (t.delta > 0 ? `+${t.delta.toFixed(1)}%` : `${t.delta.toFixed(1)}%`)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* General CSET Information panel */}
                  <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md">
                    <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Bookmark className="h-4 w-4 text-cyan-400" />
                        CSET Auditing Standards
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 font-sans text-[10.5px] leading-relaxed text-muted-foreground/80">
                      <p>
                        This assessment workspace links directly to the **CISA Cybersecurity Evaluation Tool (CSET)** logic repository, pulling question directives, target baselines, compensating waivers, and Purdue level controls.
                      </p>
                      <p className="font-semibold text-slate-300">
                        Answering YES (Y) or ALTERNATIVE (ALT) counts positively toward your compliance rating index. All unanswered questions are computed as failures to safeguard cybersecurity posture tracking.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* TAB: CSET-Style Question Auditing Wizard (WIZARD MODE) */}
            {activeTab === 'compliance' && wizardMode && activeSession && (
              <div className="font-mono text-xs space-y-4 animate-in fade-in duration-300">
                
                {/* Wizard Title Bar */}
                <div className="p-4 bg-slate-900 border border-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Active CSET Auditing Wizard</span>
                    <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      {activeSession.session_name}
                      <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[8.5px]">
                        QUESTION {currentQuestionIndex + 1} OF {sessionQuestions.length}
                      </Badge>
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {savingAnswer && (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-semibold mr-2 select-none">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        Autosaving response...
                      </span>
                    )}
                    <Button 
                      size="sm"
                      onClick={() => setWizardMode(false)}
                      className="bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-900 text-[9.5px] uppercase font-bold px-3 h-8"
                    >
                      Close Wizard
                    </Button>
                  </div>
                </div>

                {/* Wizard Main Grid */}
                {sessionQuestions.length > 0 && sessionQuestions[currentQuestionIndex] ? (
                  (() => {
                    const activeQ = sessionQuestions[currentQuestionIndex]
                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left/Middle: Question Card */}
                        <div className="lg:col-span-2 space-y-4">
                          <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden relative">
                            {/* Top glow border */}
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                            
                            <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/20">
                              <div className="flex items-center justify-between text-[9px]">
                                <span className="font-bold text-cyan-400 uppercase tracking-widest">FAMILY: {activeQ.category}</span>
                                <Badge variant="outline" className="text-[8px] font-mono border-slate-700 bg-slate-800/40 text-slate-300">
                                  PURDUE LEVEL {activeQ.purdue_level}
                                </Badge>
                              </div>
                              <CardTitle className="text-base font-bold text-slate-100 font-mono tracking-tight mt-2.5 select-all">
                                {activeQ.standard_code}
                              </CardTitle>
                            </CardHeader>
                            
                            <CardContent className="p-6 space-y-6">
                              {/* Actual Question Text */}
                              <div className="p-4 bg-slate-950/60 border border-white/5 rounded-xl text-sm text-slate-200 font-sans leading-relaxed select-text">
                                {activeQ.question_text}
                              </div>

                              {/* Wizard Choice Action Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                  { key: 'Y', label: 'YES', sub: 'Compliant', color: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/5', activeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold' },
                                  { key: 'N', label: 'NO', sub: 'Non-Compliant', color: 'border-red-500/20 hover:border-red-500/60 text-red-400 hover:bg-red-500/5', activeColor: 'border-red-500/40 bg-red-500/10 text-red-400 font-bold' },
                                  { key: 'NA', label: 'N/A', sub: 'Bypass Standard', color: 'border-slate-500/20 hover:border-slate-500/60 text-slate-400 hover:bg-slate-500/5', activeColor: 'border-slate-500/40 bg-slate-500/10 text-slate-200 font-bold' },
                                  { key: 'ALT', label: 'ALT', sub: 'Compensating Control', color: 'border-amber-500/20 hover:border-amber-500/60 text-amber-400 hover:bg-amber-500/5', activeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold' }
                                ].map(choice => {
                                  const isSelected = activeQ.answer === choice.key
                                  return (
                                    <button 
                                      key={choice.key}
                                      onClick={() => handleSaveAnswer(choice.key as any, activeQ.comments, activeQ.evidence_url)}
                                      className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5 select-none ${
                                        isSelected ? choice.activeColor : choice.color
                                      }`}
                                    >
                                      <span className="text-sm tracking-widest">{choice.label}</span>
                                      <span className="text-[8.5px] opacity-75 font-sans whitespace-nowrap">{choice.sub}</span>
                                    </button>
                                  )
                                })}
                              </div>

                              {/* Comments Input */}
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Observations / Auditor Notes</label>
                                <textarea 
                                  value={activeQ.comments}
                                  onChange={(e) => handleSaveAnswer(activeQ.answer as any, e.target.value, activeQ.evidence_url)}
                                  placeholder="Enter observations, gaps identified, or implementation details..."
                                  rows={3}
                                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200 font-mono text-xs select-text focus:border-cyan-500/50 focus:ring-0"
                                />
                              </div>

                              {/* Evidence Link Input */}
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Evidence Attachment / Document Reference Link</label>
                                <input 
                                  type="text" 
                                  value={activeQ.evidence_url}
                                  onChange={(e) => handleSaveAnswer(activeQ.answer as any, activeQ.comments, e.target.value)}
                                  placeholder="URL (e.g. S3 link, filepath, SharePoint node reference)"
                                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs select-all focus:border-cyan-500/50 focus:ring-0"
                                />
                              </div>
                            </CardContent>
                          </Card>

                          {/* Wizard Navigation Controls */}
                          <div className="flex items-center justify-between">
                            <Button 
                              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                              disabled={currentQuestionIndex === 0}
                              className="bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] uppercase font-bold py-2 px-4 h-9 font-mono"
                            >
                              Previous Question
                            </Button>
                            
                            {currentQuestionIndex < sessionQuestions.length - 1 ? (
                              <Button 
                                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-[10px] uppercase font-bold py-2 px-5 h-9 font-mono"
                              >
                                Save & Next
                              </Button>
                            ) : (
                              <Button 
                                onClick={handleLockSession}
                                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] uppercase font-bold py-2 px-5 h-9 font-mono"
                              >
                                Finalize & Lock Audit
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Right: Explanatory Guidance / Details Panel */}
                        <div className="lg:col-span-1">
                          <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md h-full overflow-hidden">
                            <CardHeader className="pb-2 border-b border-white/5 bg-slate-955/20 flex flex-row items-center gap-2">
                              <BookOpen className="h-4 w-4 text-cyan-400" />
                              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Explanatory Guidance</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                              <div className="space-y-1">
                                <span className="text-[8.5px] font-bold text-muted-foreground uppercase block">Guidance Description</span>
                                <p className="text-[10.5px] text-slate-300 font-sans leading-relaxed select-text">
                                  {activeQ.description || 'No specific technical guidance descriptions are currently cataloged for this requirement standard.'}
                                </p>
                              </div>
                              
                              <Separator className="bg-white/5" />
                              
                              <div className="space-y-2">
                                <span className="text-[8.5px] font-bold text-muted-foreground uppercase block">Purdue Level Security Controls</span>
                                <div className="p-3 border border-white/5 bg-slate-955/30 rounded-lg font-sans text-[10px] text-muted-foreground leading-relaxed">
                                  {activeQ.purdue_level === 1 || activeQ.purdue_level === 2 ? (
                                    <span className="text-orange-400 font-bold block mb-1">LEVEL 1 & 2: KINETIC FIELD CONTROL BOUNDARY</span>
                                  ) : activeQ.purdue_level === 3 ? (
                                    <span className="text-cyan-400 font-bold block mb-1">LEVEL 3: INDUSTRIAL SUPERVISORY CONTROL ENCLAVE</span>
                                  ) : (
                                    <span className="text-slate-300 font-bold block mb-1">LEVEL 4: ENTERPRISE BUSINESS NETWORK BOUNDARY</span>
                                  )}
                                  Controls at this level specify concrete field isolation requirements to secure physical actuators, telemetry links, and PLC enclaves.
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div className="p-8 text-center text-muted-foreground italic bg-slate-900/40 rounded-lg">
                    Loading question list...
                  </div>
                )}
              </div>
            )}

            {/* TAB: CSET-Style Report Card & Gap Analysis (REPORT MODE) */}
            {activeTab === 'compliance' && reportMode && reportData && activeSession && (
              <div className="font-mono text-xs space-y-6 animate-in fade-in duration-300">
                
                {/* Report Header Bar */}
                <div className="p-4 bg-slate-900 border border-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">authoritative assessment report card</span>
                    <h2 className="text-sm font-bold text-slate-100">
                      {reportData.session_name} Gap Analysis
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm"
                      onClick={() => setReportMode(false)}
                      className="bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-900 text-[9.5px] uppercase font-bold px-3 h-8"
                    >
                      Return to Ledger
                    </Button>
                    {activeSession.status === 'IN_PROGRESS' && (
                      <Button 
                        size="sm"
                        onClick={handleLockSession}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[9.5px] uppercase font-bold px-3.5 h-8"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        Finalize & Lock Milestone
                      </Button>
                    )}
                  </div>
                </div>

                {/* Score Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: 'Compliance Rating Index', val: `${reportData.stats.compliance_score.toFixed(1)}%`, desc: 'YES + ALT compliance ratio', color: 'text-cyan-400' },
                    { title: 'Milestone Progress', val: `${reportData.stats.completion_percentage.toFixed(1)}%`, desc: 'Questions answered', color: 'text-slate-300' },
                    { title: 'Yes / ALT Compliances', val: `${reportData.stats.yes_count} / ${reportData.stats.alt_count}`, desc: 'Total positive ratings', color: 'text-emerald-400' },
                    { title: 'Identified Security Gaps', val: `${reportData.stats.no_count}`, desc: 'YES count compared to baseline', color: 'text-red-400' }
                  ].map((stat, idx) => (
                    <Card key={idx} className="shadow-lg border-white/5 bg-slate-900/40 p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-cyan-500/20" />
                      <span className="text-[8.5px] text-muted-foreground uppercase tracking-widest block font-bold">{stat.title}</span>
                      <p className={`text-xl font-bold font-mono tracking-tight mt-1 ${stat.color}`}>{stat.val}</p>
                      <span className="text-[9px] text-muted-foreground/80 font-sans mt-0.5 block">{stat.desc}</span>
                    </Card>
                  ))}
                </div>

                {/* Radar Grid and Category Bars */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Radar Gap Graphic */}
                  <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md p-4 flex flex-col justify-between">
                    <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Compliance Radar Spider Grid</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 flex items-center justify-center">
                      {/* Beautiful responsive custom SVG Radar visualization */}
                      <div className="w-full max-w-[280px] py-4 relative group">
                        <svg viewBox="0 0 400 400" className="w-full h-auto">
                          {/* Inner grid lines */}
                          <polygon points="200,20 380,110 380,290 200,380 20,290 20,110" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
                          <polygon points="200,80 320,140 320,260 200,320 80,260 80,140" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                          <polygon points="200,140 260,170 260,230 200,260 140,230 140,170" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                          
                          {/* Axes */}
                          <line x1="200" y1="20" x2="200" y2="380" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                          <line x1="20" y1="110" x2="380" y2="290" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                          <line x1="380" y1="110" x2="20" y2="290" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                          
                          {/* Dynamic points based on compliance score mapping */}
                          {(() => {
                            const score = reportData.stats.compliance_score
                            // Map score (0-100) to web radius coordinates
                            const radFactor = score / 100
                            const p1 = `${200},${200 - 180 * radFactor * 0.9}`
                            const p2 = `${200 + 180 * radFactor * 0.8},${200 - 90 * radFactor * 0.8}`
                            const p3 = `${200 + 180 * radFactor * 0.9},${200 + 90 * radFactor * 0.9}`
                            const p4 = `${200},${200 + 180 * radFactor * 0.8}`
                            const p5 = `${200 - 180 * radFactor * 0.75},${200 + 90 * radFactor * 0.75}`
                            const p6 = `${200 - 180 * radFactor * 0.85},${200 - 90 * radFactor * 0.85}`
                            
                            return (
                              <polygon 
                                points={`${p1} ${p2} ${p3} ${p4} ${p5} ${p6}`}
                                fill="rgba(6,182,212,0.15)"
                                stroke="rgb(6,182,212)"
                                strokeWidth="2.5"
                                className="transition-all duration-1000 animate-pulse"
                              />
                            )
                          })()}
                        </svg>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Coverage Bars */}
                  <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md p-4 lg:col-span-2">
                    <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Compliance Coverage Index by Category</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
                      {reportData.category_coverage.map((cat: any) => (
                        <div key={cat.category} className="space-y-1.5 font-mono text-[10.5px]">
                          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                            <span className="font-bold text-slate-300 truncate max-w-[70%]">{cat.category.toUpperCase()}</span>
                            <span>{cat.yes_count} / {cat.total} COMPLIANT ({cat.score.toFixed(0)}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-950 rounded overflow-hidden border border-white/5 relative">
                            <div 
                              style={{ width: `${cat.score}%` }} 
                              className={`h-full rounded-l transition-all duration-1000 ${
                                cat.score >= 80 ? 'bg-emerald-500' : (cat.score >= 50 ? 'bg-cyan-500' : 'bg-red-500')
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Prioritized Recommendations */}
                <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden animate-in slide-in-from-bottom duration-300">
                  <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ClipboardCheck className="h-4 w-4 text-cyan-400" />
                      Prioritized Remediation Roadmap (Gap Fixes)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {reportData.prioritized_recommendations.length === 0 ? (
                      <div className="p-8 text-center text-emerald-400 font-bold italic">
                        🏆 outstanding! All standards are 100% compliant. 0 Gaps identified.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-white/5 bg-slate-950/40 text-muted-foreground uppercase text-[9px] tracking-wider font-semibold">
                              <th className="p-3 w-16">Priority</th>
                              <th className="p-3 w-28">Standard Code</th>
                              <th className="p-3 w-1/3">Requirement Directive Description</th>
                              <th className="p-3 w-1/4">Category Family</th>
                              <th className="p-3 w-16 text-center">Purdue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-300">
                            {reportData.prioritized_recommendations.map((rec: any) => {
                              const isCritical = rec.priority === 'Critical'
                              const isHigh = rec.priority === 'High'
                              return (
                                <tr key={rec.question_id} className="hover:bg-slate-800/10 transition-all">
                                  <td className="p-3 font-bold select-none">
                                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                                      isCritical ? 'bg-red-500/10 text-red-400 border border-red-500/20' : (isHigh ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-slate-800 text-slate-400')
                                    }`}>
                                      {rec.priority.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="p-3 font-bold font-mono text-[10.5px] select-all">{rec.standard_code}</td>
                                  <td className="p-3 font-sans text-muted-foreground/90 leading-relaxed select-text">
                                    <p className="font-semibold text-slate-200">{rec.question_text}</p>
                                    <p className="text-[10px] text-muted-foreground/70 mt-1 select-none font-mono">Guidance: {rec.description}</p>
                                  </td>
                                  <td className="p-3 text-[10px] font-semibold">{rec.category}</td>
                                  <td className="p-3 text-center text-slate-400 font-bold select-none">{rec.purdue_level}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab 5: Educational Resources */}
            {activeTab === 'education' && (
              <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden">
                <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/20">
                  <Badge variant="outline" className="w-fit text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-2 py-0.5 uppercase tracking-wider">
                    {(customer.industry || 'Energy').toUpperCase()} SECTOR RESOURCE LIST
                  </Badge>
                  <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider text-slate-100 mt-2">
                    {educationGuide.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {educationGuide.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-3 font-mono text-xs">
                    {educationGuide.checks.map((check, index) => (
                      <div key={index} className="p-3 border border-white/5 bg-slate-950/30 rounded-lg space-y-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500/40" />
                        <div className="flex items-center justify-between text-[9px] pl-1.5">
                          <span className="font-bold text-cyan-400 uppercase tracking-widest">{check.code}</span>
                          <span className="text-muted-foreground uppercase font-semibold">CSET Core Directive</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-200 pl-1.5">{check.title}</p>
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed font-sans pl-1.5 mt-1">
                          {check.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

        </div>
      </div>
    </AppShell>
  )
}
