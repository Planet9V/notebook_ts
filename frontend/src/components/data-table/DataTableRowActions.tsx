'use client'

import React from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RowAction {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  variant?: 'default' | 'destructive'
}

interface DataTableRowActionsProps {
  actions: RowAction[]
}

export function DataTableRowActions({ actions }: DataTableRowActionsProps) {
  const defaultActions = actions.filter((a) => a.variant !== 'destructive')
  const destructiveActions = actions.filter((a) => a.variant === 'destructive')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded-lg hover:bg-slate-700/50 data-[state=open]:bg-slate-700/50"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40 bg-slate-900 border-white/10"
      >
        {defaultActions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={action.onClick}
            className="text-xs font-mono gap-2 cursor-pointer"
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
        {destructiveActions.length > 0 && defaultActions.length > 0 && (
          <DropdownMenuSeparator className="bg-white/5" />
        )}
        {destructiveActions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={action.onClick}
            variant="destructive"
            className="text-xs font-mono gap-2 cursor-pointer"
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
