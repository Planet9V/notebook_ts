'use client'

import { useState, useCallback } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { AppShell } from '@/components/layout/AppShell'
import { MemoryStatsCards } from '@/components/research-memory/MemoryStatsCards'
import { MemorySearchBar } from '@/components/research-memory/MemorySearchBar'
import { MemoryResultsList } from '@/components/research-memory/MemoryResultsList'
import { MemoryBrowseControls } from '@/components/research-memory/MemoryBrowseControls'
import {
  useResearchMemoryStats,
  useResearchMemoryBrowse,
  useResearchMemorySearch,
} from '@/lib/hooks/use-research-memory'
import type { ResearchMemoryDocument } from '@/lib/api/research-memory'

const PAGE_SIZE = 20

export default function ResearchMemoryPage() {
  const { t } = useTranslation()

  // Browse state
  const [page, setPage] = useState(1)
  const [sourceType, setSourceType] = useState<string | undefined>(undefined)

  // Search state
  const [searchResults, setSearchResults] = useState<ResearchMemoryDocument[] | null>(null)
  const [searchTotal, setSearchTotal] = useState(0)
  const [lastSearchQuery, setLastSearchQuery] = useState('')

  // Hooks
  const { data: stats, isLoading: statsLoading } = useResearchMemoryStats()
  const { data: browseData, isLoading: browseLoading } = useResearchMemoryBrowse({
    page,
    limit: PAGE_SIZE,
    sourceType,
  })
  const searchMutation = useResearchMemorySearch()

  const totalPages = browseData
    ? Math.ceil(browseData.total / PAGE_SIZE)
    : 1

  const handleSearch = useCallback(
    (query: string) => {
      setLastSearchQuery(query)
      searchMutation.mutate(
        { query, limit: 50, source_type: sourceType },
        {
          onSuccess: (data) => {
            setSearchResults(data.results)
            setSearchTotal(data.total)
          },
        }
      )
    },
    [searchMutation, sourceType]
  )

  const handleSourceTypeChange = (type: string | undefined) => {
    setSourceType(type)
    setPage(1)
    // Clear search results when filter changes
    setSearchResults(null)
    setLastSearchQuery('')
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    // Clear search results when paginating in browse mode
    setSearchResults(null)
    setLastSearchQuery('')
  }

  // Decide which results to show
  const isSearchMode = searchResults !== null
  const displayDocuments = isSearchMode
    ? searchResults
    : browseData?.results ?? []
  const displayLoading = isSearchMode
    ? searchMutation.isPending
    : browseLoading

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 pb-20 space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t('researchMemory.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('researchMemory.description')}
            </p>
          </div>

          {/* Stats cards */}
          <MemoryStatsCards stats={stats} isLoading={statsLoading} />

          {/* Search bar */}
          <MemorySearchBar
            onSearch={handleSearch}
            isSearching={searchMutation.isPending}
          />

          {/* Browse controls */}
          {!isSearchMode && (
            <MemoryBrowseControls
              page={page}
              totalPages={totalPages}
              sourceType={sourceType}
              stats={stats}
              onPageChange={handlePageChange}
              onSourceTypeChange={handleSourceTypeChange}
              isLoading={browseLoading}
            />
          )}

          {/* Results list */}
          <MemoryResultsList
            documents={displayDocuments}
            isLoading={displayLoading}
            totalCount={isSearchMode ? searchTotal : browseData?.total}
            searchQuery={isSearchMode ? lastSearchQuery : undefined}
          />

          {/* Pagination at bottom (browse mode only) */}
          {!isSearchMode && displayDocuments.length > 0 && (
            <MemoryBrowseControls
              page={page}
              totalPages={totalPages}
              sourceType={sourceType}
              stats={stats}
              onPageChange={handlePageChange}
              onSourceTypeChange={handleSourceTypeChange}
              isLoading={browseLoading}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}
