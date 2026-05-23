'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  ShieldCheck, 
  Info, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export interface ComplianceCheck {
  id: string
  title: string
  description: string
  badge: string
  specSource: string
  referenceText: string
  checked: boolean
  category: string
}

interface B2BComplianceChecklistProps {
  checks: ComplianceCheck[]
  onToggleCheck: (id: string) => void
  selectedCheck: ComplianceCheck | null
  onSelectCheck: (check: ComplianceCheck) => void
}

export function B2BComplianceChecklist({
  checks,
  onToggleCheck,
  selectedCheck,
  onSelectCheck
}: B2BComplianceChecklistProps) {
  const checkedCount = checks.filter(c => c.checked).length
  const totalCount = checks.length
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  // Group checks by category
  const groupedChecks = useMemo(() => {
    const groups: Record<string, ComplianceCheck[]> = {}
    checks.forEach(c => {
      const cat = c.category || 'General Specifications'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(c)
    })
    return groups
  }, [checks])

  // Automatically expand all categories by default on mount or check list changes
  useEffect(() => {
    const next: Record<string, boolean> = {}
    checks.forEach(c => {
      const cat = c.category || 'General Specifications'
      next[cat] = true
    })
    setExpandedCategories(prev => ({ ...next, ...prev }))
  }, [checks])

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }))
  }

  return (
    <Card className="shadow-2xl border-white/10 bg-slate-900/80 backdrop-blur-md flex flex-col h-full min-h-0 overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-cyan-400" />
            <CardTitle className="text-sm font-bold font-mono tracking-wider uppercase text-foreground">AI SOW Safety Auditing</CardTitle>
          </div>
          <Badge 
            variant={checkedCount === totalCount ? 'default' : 'secondary'} 
            className="text-[9px] uppercase font-mono font-bold tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
          >
            {checkedCount}/{totalCount} Verified
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Cross-examine SOW draft against pinned specifications catalog
        </CardDescription>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[9px] text-muted-foreground font-mono font-medium">
              <span>PROPOSAL COMPLIANCE</span>
              <span className="text-cyan-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500 rounded-full" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs font-bold font-mono tracking-wider uppercase text-muted-foreground">No spec sheets pinned</p>
            <p className="text-[10px] text-muted-foreground/80 max-w-[200px] leading-relaxed">
              Pin products from the RAG bridge in the left panel to populate compliance targets.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedChecks).map(([category, catChecks]) => {
              const isExpanded = !!expandedCategories[category]
              return (
                <div 
                  key={category} 
                  className="border border-white/5 bg-slate-950/20 rounded-lg overflow-hidden transition-all duration-300"
                >
                  {/* Category Accordion Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-2.5 bg-slate-950/60 border-b border-white/5 text-left transition-all hover:bg-slate-950/80 group"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-cyan-500/60 group-hover:text-cyan-400 transition-colors" />
                      <span className="text-[10px] font-bold text-slate-300 tracking-wide uppercase font-mono">
                        {category}
                      </span>
                      <Badge variant="outline" className="text-[8px] font-mono border-white/10 bg-slate-900/60 text-slate-400 px-1.5 py-0">
                        {catChecks.length} Checks
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                    )}
                  </button>

                  {/* Category Content */}
                  {isExpanded && (
                    <div className="p-2.5 space-y-2 animate-in fade-in duration-200">
                      {catChecks.map((check) => {
                        const isSelected = selectedCheck?.id === check.id
                        return (
                          <div 
                            key={check.id}
                            onClick={() => onSelectCheck(check)}
                            className={`p-2.5 border rounded-lg transition-all cursor-pointer flex flex-col gap-1.5 relative overflow-hidden ${
                              isSelected 
                                ? 'border-cyan-500 bg-cyan-500/5 shadow-md shadow-cyan-500/5' 
                                : 'hover:bg-slate-800/40 border-white/5 bg-slate-950/20'
                            }`}
                          >
                            {/* Left accent color bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${
                              check.checked 
                                ? 'bg-cyan-500' 
                                : isSelected ? 'bg-cyan-600/40' : 'bg-transparent'
                            }`} />

                            <div className="flex items-start gap-2.5 pl-1">
                              {/* Interactive Checkbox */}
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleCheck(check.id)
                                }}
                                className={`h-4 w-4 rounded flex items-center justify-center border transition-all duration-200 mt-0.5 cursor-pointer ${
                                  check.checked 
                                    ? 'bg-cyan-500 border-cyan-400 text-slate-950' 
                                    : 'border-white/10 hover:border-cyan-500/50 bg-slate-900'
                                }`}
                              >
                                {check.checked && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-[11px] font-bold font-mono tracking-wide truncate ${check.checked ? 'text-muted-foreground line-through' : 'text-slate-200'}`}>
                                    {check.title}
                                  </p>
                                  <Badge 
                                    variant="outline" 
                                    className="h-4 text-[7px] font-bold font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 capitalize px-1"
                                  >
                                    {check.badge}
                                  </Badge>
                                </div>
                                <p className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-normal">
                                  {check.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Selected Check Inspection Panel */}
        {selectedCheck && (
          <div className="mt-4 p-4 border border-cyan-500/20 bg-cyan-500/5 rounded-lg space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-cyan-400" />
                RAG Grounding Diagnostics
              </span>
              <span className="text-[9px] font-semibold text-muted-foreground font-mono">
                {selectedCheck.specSource}
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold font-mono text-slate-200">{selectedCheck.title}</p>
              <p className="text-[10.5px] text-muted-foreground leading-relaxed">{selectedCheck.description}</p>
            </div>

            <div className="p-3 border border-dashed border-cyan-500/10 bg-slate-950/60 rounded text-[9.5px] italic text-slate-300 font-mono leading-relaxed relative">
              <span className="absolute -top-2 right-2 px-1.5 bg-slate-900 border border-white/5 text-[8px] font-mono text-muted-foreground uppercase">
                Source Document Passage
              </span>
              "{selectedCheck.referenceText}"
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] border-white/10 bg-slate-950/40 font-mono flex items-center gap-1.5 py-0.5">
                <ExternalLink className="h-2.5 w-2.5" />
                Linked to Deliverables Table
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
