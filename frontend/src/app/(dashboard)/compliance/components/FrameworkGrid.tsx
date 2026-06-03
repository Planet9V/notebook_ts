'use client'

import React from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  ChevronRight
} from 'lucide-react'
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { DataTable } from '@/components/data-table'
import { complianceColumns, ComplianceFramework } from '@/components/columns/compliance-columns'
import { CSETFramework } from '../data'

export interface FrameworkGridProps {
  sectors: string[]
  selectedSector: string
  setSelectedSector: (sector: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  filteredFrameworks: CSETFramework[]
  setSelectedFramework: (fw: CSETFramework) => void
}

export function FrameworkGrid({
  sectors,
  selectedSector,
  setSelectedSector,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  filteredFrameworks,
  setSelectedFramework,
}: FrameworkGridProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Filter controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between bg-slate-900/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {sectors.map(sector => (
            <Button
              key={sector}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSector(sector)}
              className={`font-mono text-xs py-1.5 px-3 rounded-lg border transition-all ${
                selectedSector === sector
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-bold'
                  : 'border-transparent text-muted-foreground hover:bg-slate-800'
              }`}
            >
              {sector === 'ALL' ? t('compliance.allSectors').toUpperCase() : sector.toUpperCase()}
            </Button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder={t('compliance.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 font-mono focus:outline-none focus:border-cyan-500/30"
          />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Grid of CSET Framework Cards */}
      {viewMode === 'cards' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFrameworks.map(fw => (
          <Card 
            key={fw.id} 
            className="shadow-lg border-white/5 bg-slate-900/60 hover:border-cyan-500/20 hover:bg-slate-900/80 transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden"
            onClick={() => setSelectedFramework(fw)}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1 max-w-[70%]">
                  {fw.sectors ? fw.sectors.slice(0, 2).map(s => (
                    <Badge key={s} variant="outline" className="text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-1.5 py-0.5 whitespace-nowrap">
                      {s.toUpperCase()}
                    </Badge>
                  )) : (
                    <Badge variant="outline" className="text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-1.5 py-0.5 animate-pulse">
                      {fw.sector.toUpperCase()}
                    </Badge>
                  )}
                  {fw.sectors && fw.sectors.length > 2 && (
                    <Badge variant="outline" className="text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-1 px-0.5 whitespace-nowrap">
                      +{fw.sectors.length - 2} {t('compliance.more')}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{t('compliance.questionsCount', { count: fw.questionCount })}</span>
              </div>
              <CardTitle className="text-base font-bold font-mono tracking-tight text-slate-100 mt-2">
                {fw.name}
              </CardTitle>
              <CardDescription className="text-[11px] leading-relaxed text-muted-foreground font-mono mt-1 select-none">
                {fw.fullName}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-4">
              <p className="text-[10.5px] text-muted-foreground/80 leading-relaxed font-sans mt-1">
                {fw.description}
              </p>
              <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                <span>{t('compliance.levelsLabel', { levels: fw.maturityLevels.join(' • ') })}</span>
                <ChevronRight className="h-4 w-4 text-cyan-500/40 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {viewMode === 'table' && (
        <DataTable
          columns={complianceColumns}
          data={filteredFrameworks.map(fw => ({
            id: fw.id,
            name: fw.name,
            category: fw.category,
            sector: fw.sector,
            description: fw.fullName,
            question_count: fw.questionCount,
          } as ComplianceFramework))}
          searchPlaceholder={t('compliance.searchPlaceholder')}
          emptyMessage={t('compliance.noFrameworks')}
        />
      )}
    </>
  )
}
