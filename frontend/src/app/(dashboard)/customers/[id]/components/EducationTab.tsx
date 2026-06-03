'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { Customer, SectorGuideline, COMPLIANCE_FRAMEWORKS, SECTOR_FRAMEWORK_MAP, SECTOR_COLORS } from '../data'

interface EducationTabProps {
  customer: Customer
  educationGuides: SectorGuideline[]
  setActiveTab: (tab: 'profile' | 'contacts' | 'projects' | 'threats' | 'compliance' | 'education') => void
}

export function EducationTab({ customer, educationGuides, setActiveTab }: EducationTabProps) {
  return (
    <div className="space-y-6">
      {/* Active Sectors Summary Banner */}
      <div className="p-4 border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-muted-foreground">Active Sector Coverage</h3>
            <p className="text-[10px] text-muted-foreground/70 font-sans">Reference guidelines are dynamically generated from your mapped CISA infrastructure sectors.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(customer.sectors && customer.sectors.length > 0 ? customer.sectors : [customer.primary_sector || customer.industry || 'Energy']).map(s => {
              const colors = SECTOR_COLORS[s] || SECTOR_COLORS['Cross-Sector']
              return (
                <Badge key={s} variant="outline" className={`text-[8px] font-mono font-bold ${colors.border} ${colors.bg} ${colors.text} px-2 py-0.5`}>
                  {s.toUpperCase()}
                </Badge>
              )
            })}
          </div>
        </div>
        {educationGuides.length === 0 && (
          <div className="mt-4 p-4 text-center border border-amber-500/20 bg-amber-500/5 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-400 mx-auto mb-2" />
            <p className="text-[10px] text-amber-400 font-mono font-bold uppercase">No sector guidelines mapped</p>
            <p className="text-[9px] text-muted-foreground mt-1">Edit your sectors in <span className="text-cyan-400 font-bold cursor-pointer" role="button" tabIndex={0} onClick={() => setActiveTab('profile')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('profile'); } }}>Profile Stakeholders</span> to generate reference content.</p>
          </div>
        )}
      </div>

      {/* Dynamic Sector Cards */}
      {educationGuides.map((guide, guideIndex) => {
        const colors = SECTOR_COLORS[guide.sector] || SECTOR_COLORS['Cross-Sector']
        const sectorFws = SECTOR_FRAMEWORK_MAP[guide.sector] || []
        return (
          <Card key={guide.sector} className={`shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden relative group animate-in fade-in slide-in-from-bottom duration-300`} style={{ animationDelay: `${guideIndex * 100}ms` }}>
            {/* Animated gradient top border */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.glow} via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity`} />

            <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/20">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`w-fit text-[8px] font-mono font-bold ${colors.border} ${colors.bg} ${colors.text} px-2 py-0.5 uppercase tracking-wider`}>
                  {guide.sector.toUpperCase()} SECTOR
                </Badge>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono text-muted-foreground/60 uppercase">{guide.checks.length} Directives</span>
                  {sectorFws.length > 0 && (
                    <span className="text-[8px] font-mono text-muted-foreground/60">•</span>
                  )}
                  <span className="text-[8px] font-mono text-muted-foreground/60 uppercase">{sectorFws.length} Frameworks</span>
                </div>
              </div>
              <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider text-slate-100 mt-2">
                {guide.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {guide.description}
              </CardDescription>

              {/* Linked Frameworks Pills */}
              {sectorFws.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {sectorFws.map(fwId => {
                    const fwDef = COMPLIANCE_FRAMEWORKS.find(f => f.id === fwId)
                    const isAssigned = customer.assigned_frameworks?.includes(fwId)
                    return (
                      <span key={fwId} className={`text-[7.5px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        isAssigned
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-950/60 border border-white/5 text-muted-foreground/60'
                      }`}>
                        {isAssigned ? '✓ ' : ''}{fwDef?.name || fwId}
                      </span>
                    )
                  })}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3 font-mono text-xs">
                {guide.checks.map((check, index) => (
                  <div key={index} className={`p-3.5 border ${colors.border} bg-slate-950/30 rounded-lg space-y-2 relative overflow-hidden group/check hover:bg-slate-950/50 transition-all`}>
                    <div className={`absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b ${colors.glow} to-transparent`} />
                    <div className="flex items-center justify-between text-[9px] pl-2">
                      <span className={`font-bold ${colors.text} uppercase tracking-widest`}>{check.code}</span>
                      <Badge variant="outline" className="text-[7px] border-white/10 bg-slate-900/40 text-muted-foreground/60 font-mono">
                        CSET Directive
                      </Badge>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200 pl-2">{check.title}</p>
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed font-sans pl-2 mt-1">
                      {check.text}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
