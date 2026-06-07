'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ExternalLink, FileText, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ResearchMemoryDocument } from '@/lib/api/research-memory'

interface MemoryResultCardProps {
  document: ResearchMemoryDocument
}

export function MemoryResultCard({ document: doc }: MemoryResultCardProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  return (
    <Card className="tetrel-card card-hover">
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header: title + source type badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">{doc.title || doc.query}</h3>
            {doc.url && (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="truncate max-w-[300px]">{doc.url}</span>
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
              {doc.source_type}
            </Badge>
            {doc.similarity !== undefined && doc.similarity !== null && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {t('researchMemory.search.similarity')}: {(doc.similarity * 100).toFixed(0)}%
              </Badge>
            )}
            {doc.score !== undefined && doc.score !== null && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {t('researchMemory.document.score')}: {doc.score.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {t('researchMemory.document.query')}: {doc.query}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(doc.created_at)}
          </span>
        </div>

        {/* Expandable content */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs">
              <ChevronDown
                className={cn(
                  'h-3 w-3 mr-1 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
              {t('researchMemory.document.viewContent')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 bg-muted/50 rounded-md">
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-[300px] overflow-y-auto">
                {doc.content || t('researchMemory.document.noContent')}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
