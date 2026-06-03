'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Mail, Linkedin, Twitter, Info, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScheduledPost } from '@/lib/types/publications'
import { cn } from '@/lib/utils'

interface ContentCalendarProps {
  posts: ScheduledPost[]
  onAddPost: (date: Date) => void
  onEditPost: (post: ScheduledPost) => void
}

export function ContentCalendar({ posts, onAddPost, onEditPost }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Calculate days in the month and previous/next month pads
  const { calendarCells, monthLabel } = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    const daysInMonth = lastDayOfMonth.getDate()
    const startDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday, 6 = Saturday

    const cells: { date: Date; isCurrentMonth: boolean }[] = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      })
    }

    // Next month padding (pad to fill whole rows of 7)
    const totalCells = Math.ceil(cells.length / 7) * 7
    const remaining = totalCells - cells.length
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      })
    }

    const label = currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })

    return { calendarCells: cells, monthLabel: label }
  }, [year, month, currentDate])

  // Filter posts that belong to each specific day
  const getPostsForDay = (date: Date) => {
    return posts.filter((post) => {
      const postDate = new Date(post.scheduled_time)
      return (
        postDate.getFullYear() === date.getFullYear() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getDate() === date.getDate()
      )
    })
  }

  const navigatePrev = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const navigateNext = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'linkedin':
        return <Linkedin className="h-3 w-3 mr-1" />
      case 'twitter':
        return <Twitter className="h-3 w-3 mr-1" />
      case 'email':
        return <Mail className="h-3 w-3 mr-1" />
      default:
        return null
    }
  }

  const getChannelStyle = (channel: string) => {
    switch (channel) {
      case 'linkedin':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
      case 'twitter':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
      case 'email':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20'
      default:
        return 'bg-secondary text-secondary-foreground border border-secondary-border'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Info className="h-3 w-3 text-muted-foreground mr-1" />
      case 'queued':
        return <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 mr-1" />
      case 'published':
        return <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 mr-1" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400 mr-1" />
      default:
        return null
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'queued':
        return 'outline'
      case 'published':
        return 'default'
      case 'failed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()

  return (
    <div className="w-full flex flex-col h-full tetrel-glass border border-border/40 rounded-xl overflow-hidden shadow-xl">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{monthLabel}</h2>
          <Button variant="outline" size="sm" onClick={navigateToday} className="text-xs h-7 px-2.5">
            Today
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" onClick={navigatePrev} className="h-8 w-8" aria-label="Previous Month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext} className="h-8 w-8" aria-label="Next Month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-border/20 text-center bg-muted/10">
        {daysOfWeek.map((day) => (
          <div key={day} className="py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-border/20">
        <TooltipProvider delayDuration={150}>
          {calendarCells.map((cell, idx) => {
            const isToday =
              today.getFullYear() === cell.date.getFullYear() &&
              today.getMonth() === cell.date.getMonth() &&
              today.getDate() === cell.date.getDate()

            const dayPosts = getPostsForDay(cell.date)

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[120px] p-2 flex flex-col group transition-all duration-200",
                  cell.isCurrentMonth ? "bg-card" : "bg-muted/10 opacity-40",
                  isToday && "bg-primary/5 ring-1 ring-primary/20 ring-inset"
                )}
              >
                {/* Day Header */}
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={cn(
                      "text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center transition-colors",
                      isToday
                        ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {cell.date.getDate()}
                  </span>
                  
                  {cell.isCurrentMonth && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onAddPost(cell.date)}
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted duration-150"
                      aria-label={`Schedule post for ${cell.date.toLocaleDateString()}`}
                    >
                      <Plus className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>

                {/* Day Posts List */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                  {dayPosts.map((post) => (
                    <Tooltip key={post.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onEditPost(post)}
                          className={cn(
                            "w-full flex items-center justify-between text-left text-[11px] font-medium py-1 px-1.5 rounded transition-all duration-150 truncate border",
                            getChannelStyle(post.channel)
                          )}
                        >
                          <span className="flex items-center truncate">
                            {getChannelIcon(post.channel)}
                            <span className="truncate">{post.title}</span>
                          </span>
                          <span className="flex-shrink-0 ml-1">
                            {getStatusIcon(post.status)}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs p-3 space-y-2 tetrel-glass text-foreground shadow-2xl">
                        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center">
                            {getChannelIcon(post.channel)}
                            {post.channel}
                          </span>
                          <Badge variant={getStatusBadgeVariant(post.status)} className="capitalize text-[10px] py-0 px-1.5 h-4">
                            {post.status}
                          </Badge>
                        </div>
                        <div className="font-semibold text-xs text-foreground truncate">{post.title}</div>
                        <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(post.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {post.error_message && (
                          <div className="text-[10px] text-red-600 dark:text-red-400 bg-red-500/10 p-1.5 rounded border border-red-500/20 leading-normal">
                            <strong>Error:</strong> {post.error_message}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )
          })}
        </TooltipProvider>
      </div>
    </div>
  )
}
