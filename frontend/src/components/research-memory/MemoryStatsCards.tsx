'use client'

import { useTranslation } from '@/lib/hooks/use-translation'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Database, Layers, Calendar, HardDrive } from 'lucide-react'
import type { ResearchMemoryStats } from '@/lib/api/research-memory'

interface MemoryStatsCardsProps {
  stats: ResearchMemoryStats | undefined
  isLoading: boolean
}

export function MemoryStatsCards({ stats, isLoading }: MemoryStatsCardsProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="tetrel-card">
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const sourceTypeCount = stats.source_types ? Object.keys(stats.source_types).length : 0

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return '—'
    }
  }

  const cards = [
    {
      icon: Database,
      label: t('researchMemory.stats.totalDocuments'),
      value: stats.total_documents.toLocaleString(),
      iconColor: 'text-primary',
    },
    {
      icon: Layers,
      label: t('researchMemory.stats.sourceTypes'),
      value: sourceTypeCount.toString(),
      iconColor: 'text-violet-500',
    },
    {
      icon: Calendar,
      label: t('researchMemory.stats.dateRange'),
      value: stats.oldest
        ? `${formatDate(stats.oldest)} – ${formatDate(stats.newest)}`
        : t('researchMemory.stats.noDocuments'),
      iconColor: 'text-amber-500',
    },
    {
      icon: HardDrive,
      label: t('researchMemory.stats.storageSize'),
      value: stats.table_size || '—',
      iconColor: 'text-emerald-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="tetrel-card card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {card.label}
              </span>
            </div>
            <p className="text-lg font-semibold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
