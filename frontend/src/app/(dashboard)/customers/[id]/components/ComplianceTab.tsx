'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  Plus,
  Settings2,
  TrendingUp,
  BarChart2,
  Bookmark,
  Clock,
  ClipboardCheck,
  Download,
  Printer,
  Loader2,
  GitCompare,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Customer, COMPLIANCE_FRAMEWORKS, SECTOR_FRAMEWORK_MAP, SECTOR_COLORS, SECTOR_GUIDELINES } from '../data'
import apiClient from '@/lib/api/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Location } from '@/lib/types/location'

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

interface ComplianceTabProps {
  customer: Customer
  wizardMode: boolean
  setWizardMode: (v: boolean) => void
  reportMode: boolean
  setReportMode: (v: boolean) => void
  assessments: any[]
  activeAssessment: any | null
  setActiveAssessment: (v: any | null) => void
  sessions: any[]
  activeSession: any | null
  sessionQuestions: any[]
  currentQuestionIndex: number
  setCurrentQuestionIndex: (v: number) => void
  savingAnswer: boolean
  reportData: any | null
  trends: any[]
  newSessionName: string
  setNewSessionName: (v: string) => void
  carryForward: boolean
  setCarryForward: (v: boolean) => void
  unifiedFrameworks: { frameworkId: string; frameworkName: string; assessment: any | null; source: 'assigned' | 'sector' | 'both' }[]
  setActiveTab: (tab: 'profile' | 'contacts' | 'projects' | 'threats' | 'compliance' | 'education') => void
  handleCreateAssessment: (frameworkId: string) => void
  handleCreateSession: () => void
  launchWizard: (session: { id: string; session_name?: string; status?: string }) => void
  launchReport: (session: { id: string; session_name?: string; status?: string }) => void
  handleSaveAnswer: (val: 'Y' | 'N' | 'NA' | 'ALT', comments?: string, evidence?: string) => void
  handleLockSession: () => void
  handleLaunchWizardDirectly: (frameworkId: string, frameworkName: string, assessmentId: string) => void
  handleInitializeAndLaunchWizard: (frameworkId: string, frameworkName: string) => void
  selectedLocationId: string
  setSelectedLocationId: (id: string) => void
  locations: Location[]
  rollupData?: any
}

export function ComplianceTab({
  customer,
  wizardMode,
  setWizardMode,
  reportMode,
  setReportMode,
  assessments,
  activeAssessment,
  setActiveAssessment,
  sessions,
  activeSession,
  sessionQuestions,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  savingAnswer,
  reportData,
  trends,
  newSessionName,
  setNewSessionName,
  carryForward,
  setCarryForward,
  unifiedFrameworks,
  setActiveTab,
  handleCreateAssessment,
  handleCreateSession,
  launchWizard,
  launchReport,
  handleSaveAnswer,
  handleLockSession,
  handleLaunchWizardDirectly,
  handleInitializeAndLaunchWizard,
  selectedLocationId,
  setSelectedLocationId,
  locations,
  rollupData,
}: ComplianceTabProps) {
  const activeLocation = activeAssessment?.location_id
    ? locations.find((l) => l.id === activeAssessment.location_id)
    : null

  const [compareSessionId, setCompareSessionId] = React.useState<string>('')
  const [diffLoading, setDiffLoading] = React.useState<boolean>(false)
  const [diffData, setDiffData] = React.useState<any | null>(null)
  const [showChangesOnly, setShowChangesOnly] = React.useState<boolean>(true)
  const [expandedDiffQuestionId, setExpandedDiffQuestionId] = React.useState<string | null>(null)
  const [exportingFormat, setExportingFormat] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!compareSessionId || !activeSession) {
      setDiffData(null)
      return
    }
    const fetchDiff = async () => {
      setDiffLoading(true)
      try {
        const response = await apiClient.get(`/sessions/${activeSession.id}/diff/${compareSessionId}`)
        setDiffData(response.data)
      } catch (e) {
        console.error("Error fetching session diff:", e)
      } finally {
        setDiffLoading(false)
      }
    }
    fetchDiff()
  }, [compareSessionId, activeSession])

  const handleExportReport = async (format: 'xlsx' | 'csv') => {
    if (!activeSession) return
    setExportingFormat(format)
    try {
      const response = await apiClient.get(`/sessions/${activeSession.id}/export`, {
        params: { format },
        responseType: 'blob'
      })
      const blob = new Blob([response.data], {
        type: format === 'xlsx' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'text/csv'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = new Date().toISOString().slice(0, 10)
      const cleanName = activeSession.session_name ? activeSession.session_name.replace(/\s+/g, '_') : 'audit'
      a.download = `compliance_report_${cleanName}_${timestamp}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("Error exporting report:", e)
    } finally {
      setExportingFormat(null)
    }
  }

  return (
    <>
      {/* Assessment List View */}
      {!wizardMode && !reportMode && (
        <div className="space-y-4 font-mono text-xs animate-in fade-in slide-in-from-bottom duration-300">
          {/* Location / Facility Selector */}
          <div className="p-4 rounded-xl border border-white/5 bg-slate-900/40 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">Select Assessment Scope</span>
              <p className="text-xs text-muted-foreground font-sans">
                Choose a specific facility or organization-wide level to run compliance audits.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-mono">Location:</span>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="w-[260px] bg-slate-950 border-white/10 text-slate-300 font-mono">
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-300 font-mono">
                  <SelectItem value="none">Organization-Wide (Customer Level)</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.facility_name} {loc.facility_type ? `(${loc.facility_type})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Assessments ledger */}
          <div className="lg:col-span-2 space-y-4">
            {/* Facility Compliance Rollup (Corporate View) */}
            {selectedLocationId === 'none' && !activeAssessment && rollupData && rollupData.frameworks && rollupData.frameworks.length > 0 && (
              <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
                <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <BarChart2 className="h-4 w-4 text-cyan-400" />
                    Facility Compliance Rollup (Corporate View)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {rollupData.frameworks.map((fw: any) => (
                    <div key={fw.framework_id} className="space-y-3 p-3 border border-white/5 bg-slate-950/40 rounded-lg">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div>
                          <span className="font-bold text-slate-200 uppercase text-xs font-mono">{fw.framework_name}</span>
                          <span className="text-[9px] text-muted-foreground block font-mono">
                            {fw.total_facilities_assessed} facility node(s) assessed
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-cyan-400 font-mono block">
                            Avg Score: {fw.average_compliance_score.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            Completion Rate: {fw.average_completion_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Nested Facility Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-[10px]">
                          <thead>
                            <tr className="border-b border-white/5 text-muted-foreground uppercase text-[8px] tracking-wider">
                              <th className="py-2">Facility / Node</th>
                              <th className="py-2">Milestone / Session</th>
                              <th className="py-2">Status</th>
                              <th className="py-2 text-right">Completion</th>
                              <th className="py-2 text-right">Compliance Score</th>
                              <th className="py-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {fw.facilities.map((fac: any) => {
                              const isCompleted = fac.status === 'COMPLETED'
                              const isNotStarted = fac.status === 'NOT_STARTED'
                              return (
                                <tr key={fac.location_id || 'org'} className="hover:bg-white/5 transition-colors group">
                                  <td className="py-2 font-bold text-slate-300">
                                    {fac.facility_name}
                                  </td>
                                  <td className="py-2 text-muted-foreground truncate max-w-[120px]" title={fac.session_name || 'N/A'}>
                                    {fac.session_name || '—'}
                                  </td>
                                  <td className="py-2">
                                    <Badge variant="outline" className={`text-[7px] font-mono font-bold ${
                                      isCompleted ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' :
                                      isNotStarted ? 'border-slate-700 bg-slate-800/40 text-slate-400' :
                                      'border-amber-500/20 bg-amber-500/5 text-amber-400'
                                    }`}>
                                      {fac.status}
                                    </Badge>
                                  </td>
                                  <td className="py-2 text-right text-muted-foreground">
                                    {fac.completion_percentage.toFixed(0)}%
                                  </td>
                                  <td className="py-2 text-right font-bold text-cyan-400">
                                    {fac.compliance_score.toFixed(1)}%
                                  </td>
                                  <td className="py-2 text-right">
                                    {!isNotStarted && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setSelectedLocationId(fac.location_id || 'none')
                                          const assessRecord = assessments.find((a: any) => {
                                            const rawId = a.framework_id?.replace('regulation:', '') || ''
                                            const mappedId = DB_TO_FRONTEND_MAP[rawId] || rawId
                                            const locMatches = !a.location_id ? (!fac.location_id) : (a.location_id === fac.location_id)
                                            return mappedId === fw.framework_id && locMatches
                                          })
                                          if (assessRecord) {
                                            setActiveAssessment(assessRecord)
                                          }
                                        }}
                                        className="h-5 px-1.5 text-[8px] text-cyan-400 hover:text-cyan-300 font-mono"
                                      >
                                        Go to Audit →
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md">
              <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Audited Regulatory Frameworks</CardTitle>
                <div className="flex items-center gap-2">
                  {unifiedFrameworks.filter(f => f.source === 'sector').length > 0 && (
                    <Badge variant="outline" className="border-violet-500/20 bg-violet-500/5 text-violet-400 text-[8px] font-mono">
                      {unifiedFrameworks.filter(f => f.source === 'sector').length} Sector-Linked
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[8px] font-mono">
                    {unifiedFrameworks.length} Total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {unifiedFrameworks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground italic space-y-2">
                    <ShieldAlert className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                    <p>No compliance frameworks assigned.</p>
                    <p className="text-[9px]">Go to <span className="text-cyan-400 font-bold cursor-pointer" role="button" tabIndex={0} onClick={() => setActiveTab('profile')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('profile'); } }}>PROFILE STAKEHOLDERS</span> → Edit Sectors &amp; Standards to assign frameworks.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {unifiedFrameworks.map((uf, index) => {
                      const hasAssessment = uf.assessment !== null
                      const isSelected = hasAssessment && activeAssessment?.id === uf.assessment?.id
                      return (
                        <div 
                          key={uf.frameworkId} 
                          className={`tetrel-border-beam p-4 hover:bg-slate-900/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom duration-300 ${isSelected ? 'tetrel-border-beam-active bg-cyan-500/5 border-l-2 border-cyan-500' : ''}`}
                          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-200 text-sm uppercase tracking-tight">{uf.frameworkName}</p>
                              {hasAssessment ? (
                                <Badge variant="outline" className="text-[7.5px] font-mono border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
                                  ACTIVE
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[7.5px] font-mono border-amber-500/20 bg-amber-500/5 text-amber-400">
                                  PENDING
                                </Badge>
                              )}
                              {uf.source === 'sector' && (
                                <Badge variant="outline" className="text-[7px] font-mono border-violet-500/20 bg-violet-500/5 text-violet-400">
                                  SECTOR-LINKED
                                </Badge>
                              )}
                              {uf.source === 'both' && (
                                <Badge variant="outline" className="text-[7px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-300">
                                  ASSIGNED + SECTOR
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-sans">
                              {hasAssessment
                                ? 'Authoritative CSET library mapped and hydrated inside database records.'
                                : uf.source === 'sector'
                                  ? 'Derived from mapped CISA sector. Initialize to begin auditing against this standard.'
                                  : 'Assigned from profile. Initialize to begin auditing against this standard.'
                              }
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasAssessment ? (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => handleLaunchWizardDirectly(uf.frameworkId, uf.frameworkName, uf.assessment.id)}
                                  className="h-7 px-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-[10px] gap-1"
                                >
                                  Compliance Wizard
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    setActiveAssessment(uf.assessment)
                                    setNewSessionName(`${uf.frameworkName} Audit Q${Math.floor(new Date().getMonth() / 3) + 1} 2026`)
                                  }}
                                  className="h-7 px-3 bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800 text-[10px]"
                                >
                                  Milestones Ledger
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm"
                                onClick={() => handleInitializeAndLaunchWizard(uf.frameworkId, uf.frameworkName)}
                                className="h-7 px-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-[10px] gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Initialize Assessment
                              </Button>
                            )}
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

            {/* Corporate Overview Summary */}
            {selectedLocationId === 'none' && !activeAssessment && rollupData && (
              <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md animate-in slide-in-from-right duration-300">
                <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" />
                    Corporate Rollup Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 font-mono text-[11px]">
                  {(() => {
                    // Aggregate stats across all frameworks and facilities
                    let totalAAssessments = 0
                    let totalCompleted = 0
                    let totalInProgress = 0
                    let sumScores = 0.0
                    let scoresCount = 0

                    if (rollupData.frameworks) {
                      for (const fw of rollupData.frameworks) {
                        for (const fac of fw.facilities) {
                          totalAAssessments++
                          if (fac.status === 'COMPLETED') totalCompleted++
                          else if (fac.status === 'IN_PROGRESS') totalInProgress++
                          
                          if (fac.status !== 'NOT_STARTED') {
                            sumScores += fac.compliance_score
                            scoresCount++
                          }
                        }
                      }
                    }

                    const averageCompliance = scoresCount > 0 ? sumScores / scoresCount : 0.0

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 border border-white/5 bg-slate-950/40 rounded-lg text-center space-y-1">
                            <span className="text-[8px] text-muted-foreground uppercase block font-sans">Avg Compliance</span>
                            <span className="text-lg font-bold text-cyan-400">{averageCompliance.toFixed(1)}%</span>
                          </div>
                          <div className="p-3 border border-white/5 bg-slate-950/40 rounded-lg text-center space-y-1">
                            <span className="text-[8px] text-muted-foreground uppercase block font-sans">Audited Nodes</span>
                            <span className="text-lg font-bold text-slate-200">{totalAAssessments}</span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground font-sans">Milestones Closed:</span>
                            <span className="text-emerald-400 font-bold">{totalCompleted}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground font-sans">Milestones In-Progress:</span>
                            <span className="text-amber-400 font-bold">{totalInProgress}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground font-sans">Pending Audits:</span>
                            <span className="text-slate-400 font-bold">{totalAAssessments - totalCompleted - totalInProgress}</span>
                          </div>
                        </div>
                        
                        <div className="p-3 border border-cyan-500/10 bg-cyan-950/5 rounded-lg text-[10px] text-cyan-300/80 leading-relaxed font-sans">
                          All facility nodes inherit their primary regulatory frameworks from organization profile settings. Individual audits must be conducted per facility node to track isolated compliance postures.
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Sector & Frameworks Context */}
            <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md">
              <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  Profile Compliance Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest block">Primary Sector</span>
                  <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-bold text-[9px]">
                    {customer.primary_sector || customer.industry || 'Energy'}
                  </Badge>
                </div>
                {customer.sectors && customer.sectors.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest block">Additional Sectors</span>
                    <div className="flex flex-wrap gap-1">
                      {customer.sectors.filter(s => s !== (customer.primary_sector || customer.industry)).map(s => (
                        <Badge key={s} variant="outline" className="border-slate-700 bg-slate-800/40 text-slate-300 text-[8px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Separator className="bg-white/5" />
                <div className="space-y-2">
                  <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest block">Assigned Frameworks ({(customer.assigned_frameworks || []).length})</span>
                  <div className="flex flex-wrap gap-1">
                    {(customer.assigned_frameworks || []).length > 0 ? (
                      customer.assigned_frameworks!.map(fw => {
                        const fwDef = COMPLIANCE_FRAMEWORKS.find(f => f.id === fw)
                        const hasAssess = assessments.some(a => a.framework_id?.replace('regulation:', '') === fw)
                        return (
                          <Badge key={fw} variant="outline" className={`text-[8px] font-mono ${
                            hasAssess 
                              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                              : 'border-amber-500/20 bg-amber-500/5 text-amber-400'
                          }`}>
                            {fwDef?.name || fw}
                          </Badge>
                        )
                      })
                    ) : (
                      <p className="text-[9px] text-muted-foreground italic">None assigned — edit Profile Stakeholders to add.</p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setActiveTab('profile')}
                  className="w-full text-[9px] text-cyan-400 hover:text-cyan-300 font-mono uppercase mt-1 h-7"
                >
                  <Settings2 className="h-3 w-3 mr-1" />
                  Edit in Profile Stakeholders
                </Button>
              </CardContent>
            </Card>

            {/* Dynamic Sector-Aware CSET Standards Panel */}
            <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden">
              <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Bookmark className="h-4 w-4 text-cyan-400" />
                  CSET Sector Standards
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {/* Dynamic sector badges with context */}
                {(customer.sectors && customer.sectors.length > 0 ? customer.sectors : [customer.primary_sector || customer.industry || 'Energy']).map(sector => {
                  const colors = SECTOR_COLORS[sector] || SECTOR_COLORS['Cross-Sector']
                  const guideline = SECTOR_GUIDELINES[sector]
                  const sectorFws = SECTOR_FRAMEWORK_MAP[sector] || []
                  return (
                    <div key={sector} className={`p-2.5 rounded-lg border ${colors.border} ${colors.bg} space-y-2 relative overflow-hidden`}>
                      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.glow} via-transparent to-transparent`} />
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`h-3.5 w-3.5 ${colors.text} shrink-0`} />
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${colors.text}`}>{sector}</span>
                      </div>
                      {guideline && (
                        <p className="text-[9px] text-muted-foreground/80 font-sans leading-relaxed pl-5">
                          {guideline.title}
                        </p>
                      )}
                      {sectorFws.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-5">
                          {sectorFws.slice(0, 4).map(fwId => {
                            const fwDef = COMPLIANCE_FRAMEWORKS.find(f => f.id === fwId)
                            return (
                              <span key={fwId} className="text-[7.5px] px-1.5 py-0.5 rounded bg-slate-950/60 border border-white/5 text-muted-foreground font-mono">
                                {fwDef?.name || fwId}
                              </span>
                            )
                          })}
                          {sectorFws.length > 4 && (
                            <span className="text-[7.5px] px-1.5 py-0.5 text-muted-foreground/60 font-mono">+{sectorFws.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                <Separator className="bg-white/5" />

                <div className="font-sans text-[9.5px] leading-relaxed text-muted-foreground/70 space-y-1.5">
                  <p>
                    Standards linked from CISA CSET logic repository. Answering <span className="font-bold text-emerald-400">YES</span> or <span className="font-bold text-amber-400">ALT</span> counts positively.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      )}

      {/* TAB: CSET-Style Question Auditing Wizard (WIZARD MODE) */}
      {wizardMode && activeSession && (
        <div className="font-mono text-xs space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
          
          {/* Wizard Title Bar */}
          <div className="p-4 bg-slate-900 border border-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Active CSET Auditing Wizard</span>
                {activeLocation ? (
                  <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-[8px] font-mono font-bold px-1.5 py-0 uppercase">
                    Facility: {activeLocation.facility_name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-slate-700 bg-slate-800/40 text-slate-400 text-[8px] font-mono font-bold px-1.5 py-0 uppercase">
                    Organization-Wide
                  </Badge>
                )}
              </div>
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
                          Save &amp; Next
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleLockSession}
                          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] uppercase font-bold py-2 px-5 h-9 font-mono"
                        >
                          Finalize &amp; Lock Audit
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
                              <span className="text-orange-400 font-bold block mb-1">LEVEL 1 &amp; 2: KINETIC FIELD CONTROL BOUNDARY</span>
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
      {reportMode && reportData && activeSession && (
        <div className="font-mono text-xs space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
          
          {/* Report Header Bar */}
          <div className="p-4 bg-slate-900 border border-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">authoritative assessment report card</span>
                {activeLocation ? (
                  <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-[8px] font-mono font-bold px-1.5 py-0 uppercase">
                    Facility: {activeLocation.facility_name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-slate-700 bg-slate-800/40 text-slate-400 text-[8px] font-mono font-bold px-1.5 py-0 uppercase">
                    Organization-Wide
                  </Badge>
                )}
              </div>
              <h2 className="text-sm font-bold text-slate-100">
                {reportData.session_name} Gap Analysis
              </h2>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <Button 
                size="sm"
                variant="outline"
                disabled={exportingFormat !== null}
                onClick={() => handleExportReport('xlsx')}
                className="border-white/10 hover:bg-sidebar-accent font-mono text-[9.5px] uppercase h-8"
              >
                {exportingFormat === 'xlsx' ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                Excel
              </Button>
              <Button 
                size="sm"
                variant="outline"
                disabled={exportingFormat !== null}
                onClick={() => handleExportReport('csv')}
                className="border-white/10 hover:bg-sidebar-accent font-mono text-[9.5px] uppercase h-8"
              >
                {exportingFormat === 'csv' ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                CSV
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="border-white/10 hover:bg-sidebar-accent font-mono text-[9.5px] uppercase h-8"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print PDF
              </Button>
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
                  Finalize &amp; Lock Milestone
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
                {reportData.category_coverage.map((cat: { category: string; yes_count: number; total: number; score: number }) => (
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

          {/* Milestone Comparison (Diff) Card */}
          <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden animate-in slide-in-from-bottom duration-300 print:hidden">
            <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <GitCompare className="h-4 w-4 text-cyan-400" />
                Milestone Answer &amp; Notes Comparison (Diff)
              </CardTitle>
              
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground font-sans">Compare with:</span>
                <Select value={compareSessionId} onValueChange={setCompareSessionId}>
                  <SelectTrigger className="w-[200px] h-7 bg-slate-950 border-white/10 text-slate-300 font-mono text-[10px]">
                    <SelectValue placeholder="Select milestone..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-slate-300 font-mono text-[10px]">
                    {sessions
                      .filter(s => s.id !== activeSession.id)
                      .map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.session_name} ({s.status})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                {diffData && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-muted-foreground select-none">
                    <input 
                      type="checkbox" 
                      checked={showChangesOnly}
                      onChange={() => setShowChangesOnly(!showChangesOnly)}
                      className="rounded bg-slate-950 border-white/10 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5"
                    />
                    <span>Show changes only</span>
                  </label>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {diffLoading ? (
                <div className="p-8 text-center text-muted-foreground space-y-2 flex flex-col items-center justify-center">
                  <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
                  <p className="font-sans">Analyzing answer history and comparing enclaves...</p>
                </div>
              ) : diffData ? (
                (() => {
                  const filteredDiffs = showChangesOnly 
                    ? diffData.differences.filter((d: any) => d.has_changed) 
                    : diffData.differences

                  return (
                    <div className="space-y-4">
                      {/* Compare KPI Rollup */}
                      <div className="grid grid-cols-2 border-b border-white/5 bg-slate-950/20 p-3 text-center">
                        <div className="border-r border-white/5 space-y-1">
                          <span className="text-[9px] text-muted-foreground uppercase block font-sans">
                            Base: {diffData.base_session_name}
                          </span>
                          <span className="text-sm font-bold text-slate-200">
                            {reportData.stats.compliance_score.toFixed(1)}% Rating
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] text-muted-foreground uppercase block font-sans">
                            Compare: {diffData.compare_session_name}
                          </span>
                          <span className="text-sm font-bold text-cyan-400">
                            {(() => {
                              const yes = diffData.differences.filter((d: any) => d.compare_answer === 'Y').length
                              const alt = diffData.differences.filter((d: any) => d.compare_answer === 'ALT').length
                              const na = diffData.differences.filter((d: any) => d.compare_answer === 'NA').length
                              const total = diffData.differences.length
                              const denom = total - na
                              const score = denom > 0 ? (yes + alt) / denom * 100 : 0
                              return `${score.toFixed(1)}% Rating`
                            })()}
                          </span>
                        </div>
                      </div>

                      {filteredDiffs.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground font-sans italic">
                          {showChangesOnly 
                            ? "No differences detected. Both milestones have identical ratings and comments."
                            : "No questions to display."}
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-white/5 bg-slate-950/40 text-muted-foreground uppercase text-[9px] tracking-wider font-semibold font-mono">
                                <th className="p-2.5 w-24">Code</th>
                                <th className="p-2.5 w-1/2">Standard Directive</th>
                                <th className="p-2.5 text-center w-24">{diffData.base_session_name}</th>
                                <th className="p-2.5 text-center w-24">{diffData.compare_session_name}</th>
                                <th className="p-2.5 w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                              {filteredDiffs.map((diff: any) => {
                                const isExp = expandedDiffQuestionId === diff.question_id
                                const ratingColors: Record<string, string> = {
                                  'Y': 'text-emerald-400 font-bold',
                                  'N': 'text-red-400 font-bold',
                                  'NA': 'text-slate-400',
                                  'ALT': 'text-amber-400 font-bold',
                                  'U': 'text-slate-500 italic'
                                }
                                return (
                                  <React.Fragment key={diff.question_id}>
                                    <tr 
                                      className={`hover:bg-slate-800/20 transition-all cursor-pointer ${
                                        diff.has_changed ? 'bg-cyan-500/[0.03] border-l border-cyan-500/20' : ''
                                      }`}
                                      onClick={() => setExpandedDiffQuestionId(isExp ? null : diff.question_id)}
                                    >
                                      <td className="p-2.5 font-bold font-mono">{diff.standard_code}</td>
                                      <td className="p-2.5 font-sans leading-relaxed text-slate-200">
                                        {diff.question_text}
                                      </td>
                                      <td className={`p-2.5 text-center ${ratingColors[diff.base_answer]}`}>
                                        {diff.base_answer}
                                      </td>
                                      <td className={`p-2.5 text-center ${ratingColors[diff.compare_answer]}`}>
                                        {diff.compare_answer}
                                      </td>
                                      <td className="p-2.5 text-center text-slate-500">
                                        {isExp ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </td>
                                    </tr>

                                    {/* Expandable details panel */}
                                    {isExp && (
                                      <tr className="bg-slate-950/40 text-[10px] leading-relaxed">
                                        <td colSpan={5} className="p-3 border-t border-b border-white/5">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Base Notes */}
                                            <div className="space-y-1.5 p-2 bg-slate-900/40 rounded border border-white/5">
                                              <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest block font-sans">
                                                {diffData.base_session_name} Observations &amp; Evidence
                                              </span>
                                              <p className="text-slate-300 font-sans select-text">
                                                <span className="font-semibold font-mono text-[9px] block">Notes:</span>
                                                {diff.base_comments || <span className="italic text-muted-foreground">No notes cataloged.</span>}
                                              </p>
                                              {diff.base_evidence && (
                                                <p className="text-cyan-400 hover:underline text-[9px] truncate">
                                                  <span className="font-semibold font-mono text-[9px] text-slate-300">Link: </span>
                                                  <a href={diff.base_evidence} target="_blank" rel="noreferrer" className="underline">{diff.base_evidence}</a>
                                                </p>
                                              )}
                                            </div>

                                            {/* Compare Notes */}
                                            <div className="space-y-1.5 p-2 bg-slate-900/40 rounded border border-white/5">
                                              <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest block font-sans">
                                                {diffData.compare_session_name} Observations &amp; Evidence
                                              </span>
                                              <p className="text-slate-300 font-sans select-text">
                                                <span className="font-semibold font-mono text-[9px] block">Notes:</span>
                                                {diff.compare_comments || <span className="italic text-muted-foreground">No notes cataloged.</span>}
                                              </p>
                                              {diff.compare_evidence && (
                                                <p className="text-cyan-400 hover:underline text-[9px] truncate">
                                                  <span className="font-semibold font-mono text-[9px] text-slate-300">Link: </span>
                                                  <a href={diff.compare_evidence} target="_blank" rel="noreferrer" className="underline">{diff.compare_evidence}</a>
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })()
              ) : (
                <div className="p-8 text-center text-muted-foreground font-sans italic flex flex-col items-center justify-center gap-1.5">
                  <GitCompare className="h-6 w-6 text-muted-foreground/40" />
                  <p>Select another milestone session above to view rating, note, and evidence diffs.</p>
                </div>
              )}
            </CardContent>
          </Card>

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
                      {reportData.prioritized_recommendations.map((rec: { question_id: string; priority: string; standard_code?: string; question_text?: string; text?: string; description?: string; category?: string; purdue_level?: number }) => {
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
    </>
  )
}
