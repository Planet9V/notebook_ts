'use client'

import { cn } from '@/lib/utils'

/**
 * Layout variants for the skeleton loader.
 * - cards-grid: 3-column grid of card-shaped placeholders (notebooks, sources)
 * - table: Rows of horizontal bars (data tables, lists)
 * - detail: Left sidebar + right content panel (detail pages)
 * - kpi-row: Row of KPI cards + content below (operations hub)
 */
type SkeletonLayout = 'cards-grid' | 'table' | 'detail' | 'kpi-row'

interface DataPageSkeletonProps {
  layout?: SkeletonLayout
  /** Number of skeleton items to render */
  count?: number
  className?: string
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-muted/50',
        className
      )}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
      <Shimmer className="h-4 w-3/4" />
      <Shimmer className="h-3 w-1/2" />
      <div className="pt-2 space-y-2">
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-5/6" />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Shimmer className="h-5 w-16 rounded-full" />
        <Shimmer className="h-5 w-12 rounded-full" />
      </div>
    </div>
  )
}

function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border/30">
      <Shimmer className="h-4 w-4 rounded" />
      <Shimmer className="h-4 w-1/3" />
      <Shimmer className="h-4 w-1/5 ml-auto" />
      <Shimmer className="h-4 w-16" />
      <Shimmer className="h-5 w-14 rounded-full" />
    </div>
  )
}

function SkeletonKpiCard() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 flex items-center gap-4">
      <Shimmer className="h-10 w-10 rounded-lg" />
      <div className="space-y-2 flex-1">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-6 w-12" />
      </div>
    </div>
  )
}

export function DataPageSkeleton({
  layout = 'cards-grid',
  count = 6,
  className,
}: DataPageSkeletonProps) {
  return (
    <div
      className={cn('w-full', className)}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>

      {layout === 'cards-grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {layout === 'table' && (
        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50 bg-muted/20">
            <Shimmer className="h-4 w-4 rounded" />
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3 w-20 ml-auto" />
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-3 w-14" />
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonTableRow key={i} />
          ))}
        </div>
      )}

      {layout === 'detail' && (
        <div className="flex gap-6">
          {/* Left panel */}
          <div className="w-1/3 space-y-4">
            <Shimmer className="h-8 w-3/4" />
            <Shimmer className="h-4 w-1/2" />
            <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3 mt-4">
              <Shimmer className="h-4 w-full" />
              <Shimmer className="h-4 w-5/6" />
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-4 w-2/3" />
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
              <Shimmer className="h-4 w-1/2" />
              <Shimmer className="h-20 w-full" />
            </div>
          </div>
          {/* Right panel */}
          <div className="flex-1 space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
              <Shimmer className="h-5 w-1/3" />
              <Shimmer className="h-3 w-2/3" />
              <Shimmer className="h-32 w-full rounded-lg" />
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
              <Shimmer className="h-5 w-1/4" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-3 w-full" />
              ))}
            </div>
          </div>
        </div>
      )}

      {layout === 'kpi-row' && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonKpiCard key={i} />
            ))}
          </div>
          {/* Content cards below */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Shimmer className="h-4 w-1/3" />
                  <Shimmer className="h-6 w-10" />
                </div>
                <Shimmer className="h-px w-full bg-border/30" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between py-1">
                    <Shimmer className="h-3 w-2/3" />
                    <Shimmer className="h-3 w-16" />
                  </div>
                ))}
                <Shimmer className="h-4 w-20 mx-auto rounded" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
