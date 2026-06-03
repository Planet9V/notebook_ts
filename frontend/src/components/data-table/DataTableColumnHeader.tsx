'use client'

import { Column } from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <span
        className={cn(
          'text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground',
          className
        )}
      >
        {title}
      </span>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        '-ml-3 h-8 text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent',
        className
      )}
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {title}
      {column.getIsSorted() === 'asc' ? (
        <ArrowUp className="ml-1.5 h-3 w-3 text-cyan-400" />
      ) : column.getIsSorted() === 'desc' ? (
        <ArrowDown className="ml-1.5 h-3 w-3 text-cyan-400" />
      ) : (
        <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
      )}
    </Button>
  )
}
