'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBreadcrumbStore } from '@/lib/stores/breadcrumb-store'

/**
 * Route-to-label mapping for known paths.
 * Dynamic segments like [id] are handled by the `overrideLabel` prop.
 */
const ROUTE_LABELS: Record<string, string> = {
  notebooks: 'Notebooks',
  sources: 'Sources',
  search: 'Ask & Search',
  customers: 'Customers',
  contacts: 'Contacts',
  pipeline: 'Pipeline',
  operations: 'Operations Hub',
  research: 'Research Intelligence',
  projects: 'Project Delivery',
  compliance: 'Compliance Hub',
  podcasts: 'Podcasts',
  settings: 'Settings',
  advanced: 'Advanced',
  transformations: 'Transformations',
  documentation: 'Documentation',
  'voice-playground': 'Voice Lab',
  'customer-ledger': 'Customer Ledger',
  'api-keys': 'Models & API Keys',
  voice: 'Voice AI',
  containers: 'Containers',
  styleguides: 'Style Guides',
}

interface BreadcrumbsProps {
  /** Optional label to override the last (current) breadcrumb segment.
   *  Useful for dynamic routes like `/customers/[id]` where the ID
   *  should be replaced with a human-readable name. */
  overrideLabel?: string
  className?: string
}

export function Breadcrumbs({ overrideLabel: propOverrideLabel, className }: BreadcrumbsProps) {
  const pathname = usePathname()
  const storeOverrideLabel = useBreadcrumbStore((s) => s.overrideLabel)
  const overrideLabel = propOverrideLabel ?? storeOverrideLabel
  if (!pathname || pathname === '/') return null

  // Build segments from the path, filtering out empty strings
  const segments = pathname.split('/').filter(Boolean)

  // Don't show breadcrumbs for top-level pages (e.g., /notebooks)
  if (segments.length <= 1) return null

  // Build breadcrumb items with href and label
  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1

    // Use override for the last segment, or look up known labels
    let label: string
    if (isLast && overrideLabel) {
      label = overrideLabel
    } else {
      label = ROUTE_LABELS[segment] ?? formatSegment(segment)
    }

    return { href, label, isLast }
  })

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}
    >
      <Link
        href="/notebooks"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span
              className="font-medium text-foreground truncate max-w-[200px]"
              aria-current="page"
            >
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}

/** Convert a URL segment into a human-readable label (e.g., 'my-page' → 'My Page') */
function formatSegment(segment: string): string {
  // If it looks like a SurrealDB record ID (e.g., "notebook:abc123"), show just the ID part
  if (segment.includes(':')) {
    return segment.split(':')[1] ?? segment
  }
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
