'use client'

import { useTranslation } from '@/lib/hooks/use-translation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ResearchMemoryStats } from '@/lib/api/research-memory'

interface MemoryBrowseControlsProps {
  page: number
  totalPages: number
  sourceType: string | undefined
  stats: ResearchMemoryStats | undefined
  onPageChange: (page: number) => void
  onSourceTypeChange: (sourceType: string | undefined) => void
  isLoading: boolean
}

export function MemoryBrowseControls({
  page,
  totalPages,
  sourceType,
  stats,
  onPageChange,
  onSourceTypeChange,
  isLoading,
}: MemoryBrowseControlsProps) {
  const { t } = useTranslation()

  const sourceTypes = stats?.source_types ? Object.keys(stats.source_types) : []

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {/* Source type filter */}
      <div className="flex items-center gap-2">
        <Select
          value={sourceType || 'all'}
          onValueChange={(value) => onSourceTypeChange(value === 'all' ? undefined : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('researchMemory.browse.filterBySource')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('researchMemory.browse.allSources')}</SelectItem>
            {sourceTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type} ({stats?.source_types[type]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('researchMemory.browse.previous')}
        </Button>
        <span className="text-xs text-muted-foreground px-2">
          {t('researchMemory.browse.page')
            .replace('{current}', page.toString())
            .replace('{total}', Math.max(1, totalPages).toString())}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
        >
          {t('researchMemory.browse.next')}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
