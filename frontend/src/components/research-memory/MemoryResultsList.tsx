'use client'

import { useTranslation } from '@/lib/hooks/use-translation'
import { MemoryResultCard } from './MemoryResultCard'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import type { ResearchMemoryDocument } from '@/lib/api/research-memory'

interface MemoryResultsListProps {
  documents: ResearchMemoryDocument[]
  isLoading: boolean
  totalCount?: number
  searchQuery?: string
}

export function MemoryResultsList({
  documents,
  isLoading,
  totalCount,
  searchQuery,
}: MemoryResultsListProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (documents.length === 0) {
    if (searchQuery) {
      return (
        <div className="tetrel-empty-state">
          <p className="text-sm text-muted-foreground">
            {t('researchMemory.search.noResults').replace('{query}', searchQuery)}
          </p>
        </div>
      )
    }
    return (
      <div className="tetrel-empty-state">
        <p className="text-sm text-muted-foreground">
          {t('researchMemory.stats.noDocuments')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {totalCount !== undefined && (
        <p className="text-sm font-medium text-muted-foreground">
          {t('researchMemory.search.resultsFound').replace('{count}', totalCount.toString())}
        </p>
      )}
      <div className="space-y-2">
        {documents.map((doc) => (
          <MemoryResultCard key={doc.id} document={doc} />
        ))}
      </div>
    </div>
  )
}
