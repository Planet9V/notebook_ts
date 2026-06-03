'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Info,
  ChevronDown,
  ChevronUp,
  X,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Layers,
  Filter
} from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { CSETFramework, CSETQuestion, ManualData, getFrameworkManual } from '../data'

export interface MaturityWizardProps {
  selectedFramework: CSETFramework
  setSelectedFramework: (fw: CSETFramework | null) => void
  stats: { total: number; answeredY: number; answeredALT: number; answeredNA: number; progress: number }
  detailTab: 'manual' | 'evaluation'
  setDetailTab: (tab: 'manual' | 'evaluation') => void
  groupedAllQuestions: Record<string, CSETQuestion[]>
  manualExpandedCategories: Record<string, boolean>
  setManualExpandedCategories: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  jumpToQuestion: (q: CSETQuestion) => void
  questionSearchQuery: string
  setQuestionSearchQuery: (query: string) => void
  loadingQuestions: boolean
  filteredQuestions: CSETQuestion[]
  groupedPaginatedQuestions: Record<string, CSETQuestion[]>
  expandedCategories: Record<string, boolean>
  toggleCategory: (cat: string) => void
  answers: Record<string, 'Y' | 'N' | 'NA' | 'ALT'>
  setAnswer: (qId: string, val: 'Y' | 'N' | 'NA' | 'ALT') => void
  rationales: Record<string, string>
  setRationales: React.Dispatch<React.SetStateAction<Record<string, string>>>
  drawerQuestion: CSETQuestion | null
  setDrawerQuestion: (q: CSETQuestion | null) => void
  totalPages: number
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
}

export function MaturityWizard({
  selectedFramework,
  setSelectedFramework,
  stats,
  detailTab,
  setDetailTab,
  groupedAllQuestions,
  manualExpandedCategories,
  setManualExpandedCategories,
  jumpToQuestion,
  questionSearchQuery,
  setQuestionSearchQuery,
  loadingQuestions,
  filteredQuestions,
  groupedPaginatedQuestions,
  expandedCategories,
  toggleCategory,
  answers,
  setAnswer,
  rationales,
  setRationales,
  drawerQuestion,
  setDrawerQuestion,
  totalPages,
  currentPage,
  setCurrentPage,
}: MaturityWizardProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
        {/* Standard Details Card */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="shadow-xl border-white/5 bg-slate-900/80 backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/20">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedFramework(null)}
                className="font-mono text-[10px] text-cyan-400 hover:text-cyan-300 p-0 mb-3 h-auto"
              >
                {t('compliance.wizard.backToGrid')}
              </Button>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className="w-fit text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-1.5 py-0.5 uppercase">
                  {t('compliance.wizard.standardLabel').replace('{sector}', selectedFramework.sector)}
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold font-mono tracking-tight text-slate-100 mt-2 leading-tight">
                {selectedFramework.name}
              </CardTitle>
              <CardDescription className="text-xs font-mono">
                {selectedFramework.fullName}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('compliance.wizard.standardOverview')}</span>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed font-sans">{selectedFramework.description}</p>
              </div>

              <Separator className="bg-white/5" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('compliance.wizard.metadataType')}</span>
                  <p className="text-slate-200 text-[11px]">{selectedFramework.category}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('compliance.wizard.totalChecks')}</span>
                  <p className="text-slate-200 text-[11px] font-bold">
                    {t('compliance.wizard.directivesCount').replace('{count}', selectedFramework.questionCount.toString())}
                  </p>
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('compliance.wizard.maturityMatrix')}</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedFramework.maturityLevels.map(level => (
                    <Badge key={level} variant="outline" className="text-[9px] border-white/10 bg-slate-950/60 font-mono text-slate-300 py-0.5">
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Radar Progress representation */}
          <Card className="shadow-xl border-white/5 bg-slate-900/80 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                {t('compliance.wizard.radarTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-4 font-mono text-xs space-y-4">
              {/* Monospaced SVG Radar Chart simulation */}
              <div className="relative w-44 h-44 flex items-center justify-center bg-slate-950/40 border border-white/5 rounded-full">
                {/* Grid concentric rings */}
                <div className="absolute w-36 h-36 border border-white/5 rounded-full border-dashed" />
                <div className="absolute w-24 h-24 border border-white/5 rounded-full border-dashed" />
                <div className="absolute w-12 h-12 border border-white/5 rounded-full border-dashed" />
                
                {/* Grid crossaxes */}
                <div className="absolute w-full h-[1px] bg-white/5" />
                <div className="absolute w-[1px] h-full bg-white/5" />
                
                {/* SVG path polygon for mock radar values */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 select-none pointer-events-none">
                  <polygon
                    points="88,32 132,70 120,120 70,128 44,88 64,54"
                    fill="rgba(6,182,212,0.15)"
                    stroke="rgba(6,182,212,0.7)"
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
                </svg>
                
                {/* Dynamic middle percentage */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold font-mono tracking-tight text-cyan-400">{stats.progress}%</span>
                  <span className="text-[8px] text-muted-foreground tracking-widest uppercase">{t('compliance.wizard.verified')}</span>
                </div>
              </div>
              
              <div className="w-full space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{t('compliance.wizard.maturityStatus')}</span>
                  <span className="text-cyan-400 font-bold">
                    {t('compliance.wizard.statusSummary')
                      .replace('{yCount}', stats.answeredY.toString())
                      .replace('{altCount}', stats.answeredALT.toString())}
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-cyan-500 rounded-full transition-all duration-300" style={{ width: `${stats.progress}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step-by-Step CSET Maturity Wizard */}
        <div className="lg:col-span-2">
          <Card className="shadow-2xl border-white/5 bg-slate-900/80 backdrop-blur-md flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-white/5">
                  <button
                    onClick={() => setDetailTab('manual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-bold transition-all rounded ${
                      detailTab === 'manual'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-muted-foreground hover:text-slate-200'
                    }`}
                  >
                    <BookOpen className="h-3 w-3" />
                    {t('compliance.wizard.refManual')}
                  </button>
                  <button
                    onClick={() => setDetailTab('evaluation')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-bold transition-all rounded ${
                      detailTab === 'evaluation'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-muted-foreground hover:text-slate-200'
                    }`}
                  >
                    <Layers className="h-3 w-3" />
                    {t('compliance.wizard.interactiveEvaluation')}
                  </button>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono border-white/10 bg-slate-950/60 text-slate-300 py-0.5">
                  {t('compliance.wizard.percentComplete').replace('{progress}', stats.progress.toString())}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[700px]">
              {detailTab === 'manual' ? (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {/* Introduction & Specifications Section */}
                  {(() => {
                    const manualData = getFrameworkManual(selectedFramework);
                    return (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* Introduction & Regulatory Scope */}
                        <div className="border border-white/5 bg-slate-950/40 p-4 rounded-lg space-y-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">
                            {t('compliance.wizard.introScope')}
                          </span>
                          <p className="text-[11px] leading-relaxed text-muted-foreground/90 font-sans">
                            {manualData.introduction}
                          </p>
                        </div>
                        
                        {/* Maturity Specifications */}
                        <div className="border border-white/5 bg-slate-950/40 p-4 rounded-lg space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">
                              {t('compliance.wizard.maturitySpecs')}
                            </span>
                            <div className="grid grid-cols-1 gap-2 mt-1.5">
                              {manualData.specifications.map((spec, i) => (
                                <div key={i} className="border border-white/5 p-2.5 rounded bg-slate-900/60 font-mono text-[10px] space-y-1">
                                  <div className="flex justify-between items-center font-bold text-slate-200">
                                    <span>{spec.level}</span>
                                    <Badge variant="outline" className="text-[8px] border-cyan-500/20 bg-cyan-500/5 text-cyan-400 uppercase py-0 px-1 rounded-sm">
                                      {spec.focus}
                                    </Badge>
                                  </div>
                                  <p className="text-[9.5px] text-muted-foreground/80 font-sans leading-relaxed">
                                    {spec.requirement}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Requirements Catalog */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">
                      {t('compliance.wizard.reqsCatalog')}
                    </span>
                    {Object.keys(groupedAllQuestions).length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground font-mono">
                        {t('compliance.wizard.loadingControls')}
                      </div>
                    ) : (
                      Object.entries(groupedAllQuestions).map(([category, questions]) => {
                        const isExpanded = !!manualExpandedCategories[category];
                        return (
                          <div key={category} className="border border-white/5 bg-slate-950/20 rounded-lg overflow-hidden transition-all duration-300">
                            {/* Category Accordion Header */}
                            <button
                              onClick={() => setManualExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                              className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 border-b border-white/5 text-left transition-all hover:bg-slate-950/80 group"
                            >
                              <div className="flex items-center gap-2 font-mono">
                                <BookOpen className="h-3.5 w-3.5 text-cyan-500/60 group-hover:text-cyan-400 transition-colors" />
                                <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                                  {category}
                                </span>
                                <Badge variant="outline" className="text-[9px] font-mono border-white/10 bg-slate-900/60 text-slate-400 px-1.5 py-0">
                                  {t('compliance.wizard.reqsCount').replace('{count}', questions.length.toString())}
                                </Badge>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                              )}
                            </button>

                            {/* Category Content */}
                            {isExpanded && (
                              <div className="p-4 space-y-4 divide-y divide-white/5 bg-slate-950/10 animate-in fade-in duration-200">
                                {questions.map((q, idx) => {
                                  return (
                                    <div key={q.id} className={`${idx > 0 ? 'pt-4' : ''} space-y-3`}>
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1.5 flex-1">
                                          <div className="flex flex-wrap items-center gap-2 font-mono">
                                            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest border border-cyan-500/20 bg-cyan-500/5 px-1.5 py-0.5 rounded">
                                              {q.standardCode}
                                            </span>
                                            <Badge variant="outline" className="text-[8px] border-white/10 bg-slate-900/40 text-slate-400 py-0.5">
                                              {t('compliance.wizard.purdueLevelLabel').replace('{level}', q.purdueLevel.toString())}
                                            </Badge>
                                            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                                              {q.purdueLevel === 0 ? t('compliance.wizard.purdueLevels.level0') :
                                               q.purdueLevel === 1 ? t('compliance.wizard.purdueLevels.level1') :
                                               q.purdueLevel === 2 ? t('compliance.wizard.purdueLevels.level2') :
                                               q.purdueLevel === 3 ? t('compliance.wizard.purdueLevels.level3') :
                                               t('compliance.wizard.purdueLevels.level4')}
                                            </span>
                                          </div>
                                          <h4 className="text-[11px] font-bold text-slate-200 mt-1 leading-snug">{q.text}</h4>
                                        </div>
                                        
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => jumpToQuestion(q)}
                                          className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-mono text-[9px] h-7 uppercase tracking-wider font-bold shrink-0 shadow-sm"
                                        >
                                          {t('compliance.wizard.answerChecklist')}
                                        </Button>
                                      </div>
                                      
                                      <div className="bg-slate-950/60 border border-white/5 rounded-lg p-3 font-sans text-[10.5px] text-muted-foreground/90 leading-relaxed whitespace-pre-line border-l-2 border-l-cyan-500/30">
                                        {q.description || t('compliance.wizard.noGuidance')}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-mono text-xs">
                  
                  {/* Local Question Search Bar */}
                  <div className="relative w-full mb-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                    <input
                      type="text"
                      placeholder={t('compliance.wizard.searchControlsPlaceholder')}
                      value={questionSearchQuery}
                      onChange={(e) => setQuestionSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 font-mono focus:outline-none focus:border-cyan-500/35"
                    />
                  </div>

                  {loadingQuestions ? (
                    <div className="text-center py-8 text-muted-foreground font-mono">
                      {t('compliance.wizard.loadingControls')}
                    </div>
                  ) : filteredQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground font-mono">
                      {t('compliance.wizard.noControlsFound')}
                    </div>
                  ) : (
                    Object.entries(groupedPaginatedQuestions).map(([category, questions]) => {
                      const isExpanded = !!expandedCategories[category]
                      return (
                        <div key={category} className="border border-white/5 bg-slate-950/20 rounded-lg overflow-hidden transition-all duration-300">
                          {/* Category Accordion Header */}
                          <button
                            onClick={() => toggleCategory(category)}
                            className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 border-b border-white/5 text-left transition-all hover:bg-slate-950/80 group"
                          >
                            <div className="flex items-center gap-2">
                              <Filter className="h-3.5 w-3.5 text-cyan-500/60 group-hover:text-cyan-400 transition-colors" />
                              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                                {category}
                              </span>
                              <Badge variant="outline" className="text-[9px] font-mono border-white/10 bg-slate-900/60 text-slate-400 px-1.5 py-0">
                                {t('compliance.wizard.checksCount').replace('{count}', questions.length.toString())}
                              </Badge>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                            )}
                          </button>

                          {/* Category Content */}
                          {isExpanded && (
                            <div className="p-3.5 space-y-4 divide-y divide-white/5 animate-in fade-in duration-200">
                              {questions.map((q, idx) => {
                                const currentAnswer = answers[q.id] || 'N'
                                return (
                                  <div key={q.id} id={`question-card-${q.id}`} className={`${idx > 0 ? 'pt-4' : ''} space-y-3`}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="space-y-1.5 max-w-[70%]">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest border border-cyan-500/20 bg-cyan-500/5 px-1.5 py-0.5 rounded">
                                            {q.standardCode}
                                          </span>
                                          <Badge variant="outline" className="text-[8px] font-mono border-white/10 bg-slate-900/40 text-slate-400 py-0.5">
                                            {t('compliance.wizard.purdueLevelLabel').replace('{level}', q.purdueLevel.toString())}
                                          </Badge>
                                          <button
                                            onClick={() => setDrawerQuestion(q)}
                                            className="flex items-center gap-1 text-[9px] text-cyan-400 hover:text-cyan-300 font-bold transition-all px-1.5 py-0.5 border border-cyan-500/10 hover:border-cyan-500/30 rounded bg-cyan-500/5 font-mono"
                                          >
                                            <Info className="h-2.5 w-2.5" />
                                            {t('compliance.wizard.education')}
                                          </button>
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-200 mt-1">{q.text}</p>
                                        <p className="text-[10px] text-muted-foreground/80 font-sans leading-relaxed">
                                          {q.description && q.description.length > 180 ? q.description.slice(0, 180) + '...' : q.description}
                                        </p>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 border border-white/5 p-1 rounded bg-slate-950 shadow-inner">
                                        {(['Y', 'N', 'NA', 'ALT'] as const).map(opt => (
                                          <button
                                            key={opt}
                                            onClick={() => setAnswer(q.id, opt)}
                                            className={`h-6 w-8 text-[9px] font-bold font-mono rounded transition-all ${
                                              currentAnswer === opt
                                                ? opt === 'Y' ? 'bg-cyan-500 text-slate-950' : opt === 'N' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-200'
                                                : 'text-muted-foreground hover:bg-slate-800'
                                            }`}
                                          >
                                            {opt === 'Y' ? t('compliance.wizard.yes') : opt === 'N' ? t('compliance.wizard.no') : opt === 'NA' ? t('compliance.wizard.na') : t('compliance.wizard.alt')}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {currentAnswer === 'ALT' && (
                                      <div className="space-y-2 border-t border-white/5 pt-3 animate-in fade-in duration-200">
                                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">{t('compliance.wizard.signedWaiver')}</span>
                                        <textarea
                                          value={rationales[q.id] || ''}
                                          onChange={(e) => setRationales(prev => ({ ...prev, [q.id]: e.target.value }))}
                                          placeholder={t('compliance.wizard.describeWaiver')}
                                          className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-[10px] text-slate-300 placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35 leading-relaxed font-mono"
                                          rows={2}
                                        />
                                      </div>
                                    )}

                                    {currentAnswer === 'N' && (
                                      <div className="space-y-2 border-t border-white/5 pt-3 animate-in fade-in duration-200">
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-red-400 uppercase tracking-widest">
                                          <Info className="h-3 w-3" />
                                          {t('compliance.wizard.auditorRationaleRequired')}
                                        </div>
                                        <textarea
                                          value={rationales[q.id] || ''}
                                          onChange={(e) => setRationales(prev => ({ ...prev, [q.id]: e.target.value }))}
                                          placeholder={t('compliance.wizard.describeMitigation')}
                                          className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-[10px] text-slate-300 placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35 leading-relaxed font-mono"
                                          rows={2}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4 font-mono text-[10px]">
                      <span className="text-muted-foreground">
                        {t('compliance.wizard.pageStatus')
                          .replace('{current}', currentPage.toString())
                          .replace('{total}', totalPages.toString())
                          .replace('{count}', filteredQuestions.length.toString())}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className="h-7 border-white/10 hover:bg-slate-800 text-[10px] text-slate-300 font-bold uppercase disabled:opacity-50"
                        >
                          <ArrowLeft className="h-3 w-3 mr-1" />
                          {t('compliance.wizard.prev')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className="h-7 border-white/10 hover:bg-slate-800 text-[10px] text-slate-300 font-bold uppercase disabled:opacity-50"
                        >
                          {t('compliance.wizard.next')}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Educational Information Drawer */}
      {drawerQuestion && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setDrawerQuestion(null)}
          />
          
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[650px] bg-slate-900 border-l border-white/10 shadow-2xl p-6 flex flex-col justify-between font-mono animate-in slide-in-from-right duration-300">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-cyan-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                    {t('compliance.wizard.guidanceEducation')}
                  </h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDrawerQuestion(null)}
                  className="hover:bg-slate-800 p-1 text-muted-foreground hover:text-foreground rounded-lg h-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Drawer Body */}
              <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-200px)] text-xs leading-relaxed">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('compliance.wizard.controlDirective')}</span>
                  <div className="bg-slate-950 p-3 border border-white/5 rounded-lg">
                    <Badge variant="outline" className="text-[8px] font-mono border-cyan-500/25 bg-cyan-500/5 text-cyan-400 mb-2 px-1.5 py-0.5 rounded">
                      {(selectedFramework?.name || 'Framework')}: {drawerQuestion.standardCode}
                    </Badge>
                    <h3 className="text-xs font-bold text-slate-200">{drawerQuestion.text}</h3>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('compliance.wizard.purdueZoneLevel')}</span>
                  <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-white/5 rounded-lg text-slate-300">
                    <span className="text-cyan-400 font-bold">{t('compliance.wizard.purdueLevelLabel').replace('{level}', drawerQuestion.purdueLevel.toString())}</span>
                    <span className="text-muted-foreground text-[10px]">— {
                      drawerQuestion.purdueLevel === 0 ? t('compliance.wizard.purdueLevels.level0_desc') :
                      drawerQuestion.purdueLevel === 1 ? t('compliance.wizard.purdueLevels.level1_desc') :
                      drawerQuestion.purdueLevel === 2 ? t('compliance.wizard.purdueLevels.level2_desc') :
                      drawerQuestion.purdueLevel === 3 ? t('compliance.wizard.purdueLevels.level3_desc') :
                      t('compliance.wizard.purdueLevels.level4_desc')
                    }</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('compliance.wizard.csetGuidelines')}</span>
                  <div className="bg-slate-950 p-4 border border-white/5 rounded-lg text-muted-foreground font-sans leading-relaxed text-[11px] whitespace-pre-line">
                    {drawerQuestion.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-white/5 pt-4 mt-auto">
              <Button 
                variant="outline" 
                onClick={() => setDrawerQuestion(null)}
                className="w-full border-white/10 hover:bg-slate-800 text-xs uppercase text-slate-300 font-bold"
              >
                {t('compliance.wizard.closeDrawer')}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
