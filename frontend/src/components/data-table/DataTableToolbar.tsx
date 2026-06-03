'use client'

import React from 'react'
import { Search } from 'lucide-react'

interface DataTableToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filterSlot?: React.ReactNode
  actionSlot?: React.ReactNode
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filterSlot,
  actionSlot,
}: DataTableToolbarProps) {
  return (
    <div className="flex items-center justify-between bg-slate-900/20 border border-white/5 p-4 rounded-xl backdrop-blur-sm gap-4">
      {/* Search (left) */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-950/60 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 font-mono focus:outline-none focus:border-cyan-500/30"
        />
      </div>

      {/* Filters (center) */}
      {filterSlot && (
        <div className="flex items-center gap-2">{filterSlot}</div>
      )}

      {/* Actions (right) */}
      {actionSlot && (
        <div className="flex items-center gap-2 shrink-0">{actionSlot}</div>
      )}
    </div>
  )
}
