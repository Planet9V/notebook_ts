'use client'

import React from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useNotifications, useMarkNotificationRead } from '@/lib/hooks/use-notes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  iconOnly?: boolean
}

export function NotificationBell({ iconOnly = false }: NotificationBellProps) {
  const router = useRouter()
  const { data: notifications = [], isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()

  const unreadNotifications = notifications.filter(n => !n.is_read)
  const unreadCount = unreadNotifications.length

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await markRead.mutateAsync(notif.id)
    }
    
    // Navigate to open the note editor modal
    if (notif.entity_type === 'note' && notif.entity_id) {
      router.push(`/notebooks?modal=note&id=${notif.entity_id}`)
    }
  }

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    for (const notif of unreadNotifications) {
      markRead.mutate(notif.id)
    }
  }

  // Format time relative
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      return `${diffDays}d ago`
    } catch {
      return ''
    }
  }

  const triggerButton = iconOnly ? (
    <Button
      variant="outline"
      size="icon"
      className="relative sidebar-menu-item h-9 w-9 rounded-md justify-center flex items-center cursor-pointer"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-pulse">
          {unreadCount}
        </span>
      )}
    </Button>
  ) : (
    <Button
      variant="outline"
      className="w-full justify-start gap-3 sidebar-menu-item relative cursor-pointer"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left truncate">Notifications</span>
      {unreadCount > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ml-auto animate-pulse">
          {unreadCount}
        </span>
      )}
    </Button>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {triggerButton}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={iconOnly ? "start" : "end"}
        className="w-80 max-h-96 overflow-y-auto bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl p-0 flex flex-col rounded-xl"
      >
        {/* Dropdown Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/20">
          <span className="text-xs font-semibold">Inbox</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Dropdown Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/20">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
              Loading inbox...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1">
              <Bell className="w-8 h-8 opacity-30 stroke-[1.5] mb-1" />
              <span>Your inbox is clear</span>
              <span className="text-[10px] opacity-70">No mentions yet.</span>
            </div>
          ) : (
            notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  "p-3 flex flex-col items-stretch gap-1 cursor-pointer transition-colors text-left focus:bg-muted/40",
                  !notif.is_read && "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold leading-tight text-foreground truncate flex-1">
                    {notif.title}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-medium shrink-0">
                    {formatTime(notif.created)}
                  </span>
                </div>
                {notif.body && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-normal">
                    {notif.body}
                  </p>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
