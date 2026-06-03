'use client'

import { cn } from '@/lib/utils'
import { LayoutGrid, Kanban, List, Table, Calendar } from 'lucide-react'

export type ViewMode = 'cards' | 'kanban' | 'table' | 'list' | 'calendar'

interface ViewToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  showKanban?: boolean
  showList?: boolean
  showCalendar?: boolean
  className?: string
}

export function ViewToggle({
  value,
  onChange,
  showKanban = false,
  showList = false,
  showCalendar = false,
  className,
}: ViewToggleProps) {
  const modes: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
    {
      key: 'cards',
      icon: <LayoutGrid className="h-3.5 w-3.5" />,
      label: 'Cards',
    },
    ...(showKanban
      ? [
          {
            key: 'kanban' as ViewMode,
            icon: <Kanban className="h-3.5 w-3.5" />,
            label: 'Kanban',
          },
        ]
      : []),
    {
      key: 'table',
      icon: <Table className="h-3.5 w-3.5" />,
      label: 'Table',
    },
    ...(showList
      ? [
          {
            key: 'list' as ViewMode,
            icon: <List className="h-3.5 w-3.5" />,
            label: 'List',
          },
        ]
      : []),
    ...(showCalendar
      ? [
          {
            key: 'calendar' as ViewMode,
            icon: <Calendar className="h-3.5 w-3.5" />,
            label: 'Calendar',
          },
        ]
      : []),
  ]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-sidebar-border bg-muted/40 backdrop-blur-sm',
        className
      )}
    >
      {modes.map((mode) => (
        <button
          key={mode.key}
          onClick={() => onChange(mode.key)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
            value === mode.key
              ? 'bg-sidebar-accent text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
          )}
          title={mode.label}
        >
          {mode.icon}
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider">
            {mode.label}
          </span>
        </button>
      ))}
    </div>
  )
}

