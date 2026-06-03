'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'
import apiClient from '@/lib/api/client'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ShieldCheck, 
  Layers, 
  HelpCircle,
} from 'lucide-react'
import { ViewMode } from '@/components/ui/view-toggle'
import {
  CSETFramework,
  CSETQuestion,
  enrichQuestion,
  getFrameworkQuestions,
  CSET_FRAMEWORKS,
} from './data'
import { FrameworkGrid } from './components/FrameworkGrid'
import { ComparisonMatrix } from './components/ComparisonMatrix'
import { MaturityWizard } from './components/MaturityWizard'

// =============================================================================
// Main Page
// =============================================================================

export default function CompliancePage() {
  const { t } = useTranslation()
  const [frameworks, setFrameworks] = useState<CSETFramework[]>(CSET_FRAMEWORKS)
  const [activeQuestions, setActiveQuestions] = useState<CSETQuestion[]>([])
  const [loadingFrameworks, setLoadingFrameworks] = useState<boolean>(false)
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false)

  useEffect(() => {
    document.title = `${t('navigation.collect')} | Tetrel`
  }, [t])

  const [selectedSector, setSelectedSector] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedFramework, setSelectedFramework] = useState<CSETFramework | null>(null)
  const [matrixCompare, setMatrixCompare] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [answers, setAnswers] = useState<Record<string, 'Y' | 'N' | 'NA' | 'ALT'>>({
    'Q1': 'Y',
    'Q2': 'ALT',
    'Q3': 'N',
    'Q4': 'NA',
    'N82_Q1': 'Y',
    'N82_Q2': 'N',
    'CIP_Q1': 'Y',
    'CIP_Q2': 'ALT',
    'AWWA_Q1': 'Y'
  })
  const [rationales, setRationales] = useState<Record<string, string>>({
    'Q2': 'Direct routing is physically air-gapped using absolute hardware diode blocks.',
    'Q3': 'Scheduled implementation during next plant shutdown phase.',
    'CIP_Q2': 'Failsafe boundary isolation is mediated using specialized read-only optical couplers.'
  })

  // Scales UX and search state variables
  const [questionSearchQuery, setQuestionSearchQuery] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [manualExpandedCategories, setManualExpandedCategories] = useState<Record<string, boolean>>({})
  const [drawerQuestion, setDrawerQuestion] = useState<CSETQuestion | null>(null)
  const [detailTab, setDetailTab] = useState<'manual' | 'evaluation'>('manual')
  const QUESTIONS_PER_PAGE = 350

  // Load active checklist questions when selected framework changes
  useEffect(() => {
    setQuestionSearchQuery('')
    setCurrentPage(1)
    setDrawerQuestion(null)
    setDetailTab('manual')
    setManualExpandedCategories({})
  }, [selectedFramework])

  // Filter active questions based on query
  const filteredQuestions = useMemo(() => {
    if (!activeQuestions) return []
    return activeQuestions.filter(q => 
      q.standardCode.toLowerCase().includes(questionSearchQuery.toLowerCase()) ||
      q.text.toLowerCase().includes(questionSearchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(questionSearchQuery.toLowerCase())
    )
  }, [activeQuestions, questionSearchQuery])

  // Get total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE) || 1
  }, [filteredQuestions])

  // Paginated subset of active questions
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE
    return filteredQuestions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE)
  }, [filteredQuestions, currentPage])

  // Group paginated questions by category
  const groupedPaginatedQuestions = useMemo(() => {
    const groups: Record<string, CSETQuestion[]> = {}
    paginatedQuestions.forEach(q => {
      const cat = q.category || 'General Controls'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(q)
    })
    return groups
  }, [paginatedQuestions])

  // Set visible categories to expanded by default on page or filter change
  useEffect(() => {
    const newExpanded: Record<string, boolean> = {}
    paginatedQuestions.forEach(q => {
      const cat = q.category || 'General Controls'
      newExpanded[cat] = true
    })
    setExpandedCategories(newExpanded)
  }, [paginatedQuestions])

  // Toggle category visibility
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }))
  }

  // Load all CSET frameworks on mount
  useEffect(() => {
    const fetchFrameworks = async () => {
      setLoadingFrameworks(true)
      try {
        const response = await apiClient.get<any[]>('/regulations')
        if (response.data && response.data.length > 0) {
          const mappedFws = response.data.map((fw: { id: string; name: string; fullName?: string; full_name?: string; description?: string; category?: string; sector?: string; sectors?: string[]; questionCount?: number; question_count?: number; maturityLevels?: string[]; maturity_levels?: string[] }) => ({
            id: fw.id.replace('regulation:', ''),
            name: fw.name,
            fullName: fw.fullName || fw.full_name || fw.name,
            description: fw.description || '',
            category: fw.category || 'General IT/OT',
            sector: fw.sector || 'Cross-Sector',
            sectors: fw.sectors || [fw.sector || 'Cross-Sector'],
            questionCount: fw.questionCount || fw.question_count || 10,
            maturityLevels: fw.maturityLevels || fw.maturity_levels || ['Standard']
          }))
          setFrameworks(mappedFws)
        }
      } catch (err) {
        console.error('Error fetching CSET frameworks from API:', err)
      } finally {
        setLoadingFrameworks(false)
      }
    }
    fetchFrameworks()
  }, [])

  // Load active checklist questions when selected framework changes
  useEffect(() => {
    if (!selectedFramework) {
      setActiveQuestions([])
      return
    }

    const fetchQuestions = async () => {
      setLoadingQuestions(true)
      try {
        const rawId = selectedFramework.id.replace('regulation:', '')
        const response = await apiClient.get<any[]>(`/regulations/${rawId}/questions`)
        if (response.data && response.data.length > 0) {
          const mappedQs = response.data.map((q: { id: string; standard_code?: string; standardCode?: string; question_text?: string; text?: string; description?: string; purdue_level?: number; purdueLevel?: number; category?: string }) => ({
            id: q.id,
            standardCode: q.standard_code || q.standardCode || '',
            text: q.question_text || q.text || '',
            description: q.description || '',
            purdueLevel: q.purdue_level !== undefined ? q.purdue_level : (q.purdueLevel || 0),
            category: q.category || 'Control'
          }))
          setActiveQuestions(mappedQs.map(q => enrichQuestion(q, selectedFramework.id)))
        } else {
          setActiveQuestions(getFrameworkQuestions(selectedFramework.id).map(q => enrichQuestion(q, selectedFramework.id)))
        }
      } catch (err) {
        console.error(`Error fetching questions for framework ${selectedFramework.id}:`, err)
        setActiveQuestions(getFrameworkQuestions(selectedFramework.id).map(q => enrichQuestion(q, selectedFramework.id)))
      } finally {
        setLoadingQuestions(false)
      }
    }

    fetchQuestions()
  }, [selectedFramework])

  // Group all active questions by category for the reference catalog
  const groupedAllQuestions = useMemo(() => {
    const groups: Record<string, CSETQuestion[]> = {}
    activeQuestions.forEach(q => {
      const cat = q.category || 'General Controls'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(q)
    })
    return groups
  }, [activeQuestions])

  // Jump to specific question in interactive evaluation tab
  const jumpToQuestion = (q: CSETQuestion) => {
    setQuestionSearchQuery('')
    const index = activeQuestions.findIndex(item => item.id === q.id)
    if (index !== -1) {
      const page = Math.floor(index / QUESTIONS_PER_PAGE) + 1
      setCurrentPage(page)
      setExpandedCategories(prev => ({
        ...prev,
        [q.category]: true
      }))
      setDetailTab('evaluation')
      setTimeout(() => {
        const element = document.getElementById(`question-card-${q.id}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }

  // Filter frameworks dynamically based on sectors & search query
  const filteredFrameworks = useMemo(() => {
    return frameworks.filter(fw => {
      const matchesSector = selectedSector === 'ALL' || 
                            fw.sector === selectedSector || 
                            (fw.sectors && fw.sectors.includes(selectedSector))
      const matchesSearch = fw.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            fw.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            fw.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSector && matchesSearch
    })
  }, [frameworks, selectedSector, searchQuery])

  // Complete list of sectors matching database categories
  const sectors = [
    'ALL',
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

  // Handle Toggle of Answers
  const setAnswer = (qId: string, val: 'Y' | 'N' | 'NA' | 'ALT') => {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  // Calculate compliance statistics dynamically
  const stats = useMemo(() => {
    if (!selectedFramework || activeQuestions.length === 0) {
      return { total: 0, answeredY: 0, answeredALT: 0, answeredNA: 0, progress: 0 }
    }
    const total = activeQuestions.length
    
    let answeredY = 0
    let answeredALT = 0
    let answeredNA = 0
    
    activeQuestions.forEach(q => {
      const ans = answers[q.id]
      if (ans === 'Y') answeredY++
      if (ans === 'ALT') answeredALT++
      if (ans === 'NA') answeredNA++
    })
    
    const progress = Math.round(((answeredY + answeredALT + answeredNA) / total) * 100)
    return { total, answeredY, answeredALT, answeredNA, progress }
  }, [answers, selectedFramework, activeQuestions])

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background text-foreground">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold tracking-tight uppercase font-mono">
                  {t('compliance.title')}
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                {t('compliance.subtitle')}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant={matrixCompare ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => {
                  setMatrixCompare(!matrixCompare)
                  setSelectedFramework(null)
                }}
                className={matrixCompare 
                  ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase' 
                  : 'border-white/10 hover:bg-sidebar-accent font-mono text-xs uppercase text-muted-foreground'
                }
              >
                <Layers className="h-4 w-4 mr-2" />
                {t('compliance.matrixTitle').split(' ')[0]} {t('compliance.matrixTitle').split(' ')[1]}
              </Button>
              <Badge variant="outline" className="text-[10px] font-mono border-white/10 bg-cyan-500/5 text-cyan-400 px-2 py-1.5 uppercase tracking-wider">
                <HelpCircle className="h-3 w-3 mr-1" />
                {frameworks.length} {t('compliance.activeStandards')}
              </Badge>
            </div>
          </div>

          {/* Matrix Comparison View */}
          {matrixCompare && (
            <ComparisonMatrix setMatrixCompare={setMatrixCompare} />
          )}

          {/* Framework Grid (no framework selected, not in matrix mode) */}
          {!selectedFramework && !matrixCompare && (
            <FrameworkGrid
              sectors={sectors}
              selectedSector={selectedSector}
              setSelectedSector={setSelectedSector}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              viewMode={viewMode}
              setViewMode={setViewMode}
              filteredFrameworks={filteredFrameworks}
              setSelectedFramework={setSelectedFramework}
            />
          )}

          {/* Maturity Wizard (framework selected) */}
          {selectedFramework && !matrixCompare && (
            <MaturityWizard
              selectedFramework={selectedFramework}
              setSelectedFramework={setSelectedFramework}
              stats={stats}
              detailTab={detailTab}
              setDetailTab={setDetailTab}
              groupedAllQuestions={groupedAllQuestions}
              manualExpandedCategories={manualExpandedCategories}
              setManualExpandedCategories={setManualExpandedCategories}
              jumpToQuestion={jumpToQuestion}
              questionSearchQuery={questionSearchQuery}
              setQuestionSearchQuery={setQuestionSearchQuery}
              loadingQuestions={loadingQuestions}
              filteredQuestions={filteredQuestions}
              groupedPaginatedQuestions={groupedPaginatedQuestions}
              expandedCategories={expandedCategories}
              toggleCategory={toggleCategory}
              answers={answers}
              setAnswer={setAnswer}
              rationales={rationales}
              setRationales={setRationales}
              drawerQuestion={drawerQuestion}
              setDrawerQuestion={setDrawerQuestion}
              totalPages={totalPages}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}
