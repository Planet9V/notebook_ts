'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShieldCheck, Info, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'

export interface ComplianceCheck {
  id: string
  title: string
  description: string
  badge: string
  specSource: string
  referenceText: string
  checked: boolean
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

  return (
    <Card className="shadow-sm border-border bg-card/60 backdrop-blur-md flex flex-col h-full min-h-0 overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-cyan-500" />
            <CardTitle className="text-base font-semibold">AI SOW Safety Auditing</CardTitle>
          </div>
          <Badge 
            variant={checkedCount === totalCount ? 'default' : 'secondary'} 
            className="text-[10px] uppercase font-mono font-bold tracking-wider"
          >
            {checkedCount}/{totalCount} Verified
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Cross-examine draft against pinned specifications catalog
        </CardDescription>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[9px] text-muted-foreground font-mono font-medium">
              <span>PROPOSAL COMPLIANCE</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted dark:bg-muted/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300 rounded-full" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-xs font-semibold text-muted-foreground">No spec sheets pinned</p>
            <p className="text-[10px] text-muted-foreground/80 max-w-[200px]">
              Pin products from the RAG bridge in the left panel to populate compliance targets.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {checks.map((check) => {
              const isSelected = selectedCheck?.id === check.id
              return (
                <div 
                  key={check.id}
                  onClick={() => onSelectCheck(check)}
                  className={`p-3 border rounded-lg transition-all cursor-pointer flex flex-col gap-2 relative overflow-hidden ${
                    isSelected 
                      ? 'border-cyan-500 bg-cyan-500/5 dark:bg-cyan-500/10 shadow-sm' 
                      : 'hover:bg-muted/30 border-border bg-card/40'
                  }`}
                >
                  {/* Left accent color bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${
                    check.checked 
                      ? 'bg-emerald-500' 
                      : isSelected ? 'bg-cyan-500' : 'bg-transparent'
                  }`} />

                  <div className="flex items-start gap-2.5 pl-1.5">
                    {/* Interative Checkbox */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleCheck(check.id)
                      }}
                      className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition-all mt-0.5 ${
                        check.checked 
                          ? 'bg-emerald-500 border-emerald-600 text-white' 
                          : 'border-muted-foreground/40 hover:border-cyan-500 bg-background/50'
                      }`}
                    >
                      {check.checked && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${check.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {check.title}
                        </p>
                        <Badge 
                          variant="outline" 
                          className="h-4.5 text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-700 dark:text-cyan-400 capitalize px-1"
                        >
                          {check.badge}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                        {check.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Selected Check Inspection Panel */}
        {selectedCheck && (
          <div className="mt-4 p-3.5 border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-lg space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                RAG Compliance Grounding
              </span>
              <span className="text-[9px] font-semibold text-muted-foreground font-mono">
                {selectedCheck.specSource}
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-foreground">{selectedCheck.title}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{selectedCheck.description}</p>
            </div>

            <div className="p-2.5 border border-dashed border-cyan-500/20 bg-background/65 dark:bg-background/40 rounded text-[9.5px] italic text-muted-foreground leading-relaxed relative">
              <span className="absolute -top-2 right-2 px-1 bg-card border border-border text-[8px] font-mono text-muted-foreground uppercase">
                Source Document Passage
              </span>
              "{selectedCheck.referenceText}"
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] border-muted-foreground/30 bg-muted/40 font-mono flex items-center gap-1 py-0.5">
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
