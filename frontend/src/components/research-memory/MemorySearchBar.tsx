'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Search } from 'lucide-react'

interface MemorySearchBarProps {
  onSearch: (query: string) => void
  isSearching: boolean
}

export function MemorySearchBar({ onSearch, isSearching }: MemorySearchBarProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const handleSubmit = () => {
    if (!query.trim()) return
    onSearch(query.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input
        placeholder={t('researchMemory.search.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSearching}
        className="flex-1"
        autoComplete="off"
      />
      <Button
        onClick={handleSubmit}
        disabled={isSearching || !query.trim()}
        className="w-full sm:w-auto"
      >
        {isSearching ? (
          <LoadingSpinner size="sm" />
        ) : (
          <Search className="h-4 w-4 mr-2" />
        )}
        {isSearching
          ? t('researchMemory.search.searching')
          : t('researchMemory.search.searchButton')}
      </Button>
    </div>
  )
}
