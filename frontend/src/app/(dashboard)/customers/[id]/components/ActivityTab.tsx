'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useActivities } from '@/lib/hooks/use-activities'
import { Activity } from '@/lib/types/activity'
import {
  Clock,
  FileText,
  BookOpen,
  Link2,
  ArrowRight,
  User,
  ShieldCheck,
  BarChart3,
  Activity as ActivityIcon,
} from 'lucide-react'

interface ActivityTabProps {
  customerId: string
  isMiniView?: boolean
  searchTerm?: string
}

// Map activity_type to icon + color
const ACTIVITY_TYPE_MAP: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  notebook_created: { icon: BookOpen, color: 'text-cyan-400', label: 'Notebook Created' },
  note_added: { icon: FileText, color: 'text-emerald-400', label: 'Note Added' },
  source_added: { icon: Link2, color: 'text-violet-400', label: 'Source Added' },
  stage_changed: { icon: ArrowRight, color: 'text-amber-400', label: 'Stage Changed' },
  contact_added: { icon: User, color: 'text-blue-400', label: 'Contact Added' },
  contact_updated: { icon: User, color: 'text-blue-300', label: 'Contact Updated' },
  deal_updated: { icon: BarChart3, color: 'text-green-400', label: 'Deal Updated' },
  assessment_started: { icon: ShieldCheck, color: 'text-orange-400', label: 'Assessment Started' },
  assessment_completed: { icon: ShieldCheck, color: 'text-emerald-400', label: 'Assessment Completed' },
  pipeline_moved: { icon: ArrowRight, color: 'text-cyan-300', label: 'Pipeline Moved' },
  customer_updated: { icon: User, color: 'text-slate-300', label: 'Customer Updated' },
  email_sent: { icon: FileText, color: 'text-pink-400', label: 'Email Sent' },
  meeting_logged: { icon: Clock, color: 'text-yellow-400', label: 'Meeting Logged' },
  custom: { icon: ActivityIcon, color: 'text-slate-400', label: 'Custom Event' },
}

const sanitizeTerm = (term: string) => {
  return term.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&').trim()
}

const highlightText = (text: string, query: string) => {
  if (!query || !query.trim()) return <>{text}</>
  const sanitized = sanitizeTerm(query)
  const regex = new RegExp(`(${sanitized})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-cyan-500/30 text-cyan-200 font-semibold px-0.5 rounded border-b border-cyan-400">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 rounded-full bg-slate-700/50 animate-pulse" />
            <div className="w-0.5 h-full bg-slate-700/30" />
          </div>
          <div className="flex-1 pb-6 space-y-2">
            <div className="h-3 w-32 rounded bg-slate-700/50 animate-pulse" />
            <div className="h-2.5 w-64 rounded bg-slate-700/50 animate-pulse" />
            <div className="h-2 w-16 rounded bg-slate-700/50 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActivityTab({ customerId, isMiniView = false, searchTerm = '' }: ActivityTabProps) {
  const { data: activities, isLoading } = useActivities(customerId)
  const activityCount = activities?.length ?? 0

  // Group activities by date
  const grouped = React.useMemo(() => {
    if (!activities) return new Map<string, Activity[]>()
    const displayActivities = isMiniView ? activities.slice(0, 5) : activities
    const map = new Map<string, Activity[]>()
    for (const activity of displayActivities) {
      const dateKey = formatDate(activity.created)
      const existing = map.get(dateKey) || []
      existing.push(activity)
      map.set(dateKey, existing)
    }
    return map
  }, [activities, isMiniView])

  const innerContent = (
    <>
      {isLoading ? (
        <ActivitySkeleton />
      ) : activityCount === 0 ? (
        <div className="flex flex-col items-center py-12 text-center space-y-3">
          <div className="p-3 rounded-full bg-slate-800/60 border border-white/5">
            <Clock className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold font-mono tracking-wider uppercase text-muted-foreground">
              {highlightText("No activity recorded yet", searchTerm)}
            </p>
            <p className="text-[10px] text-muted-foreground/75 max-w-[280px] leading-relaxed font-sans">
              {highlightText("Activity events will appear here as notebooks are created, notes are added, pipeline stages change, and more.", searchTerm)}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([dateLabel, dayActivities]) => (
            <div key={dateLabel}>
              {/* Date separator */}
              {!isMiniView && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2">
                    {highlightText(dateLabel, searchTerm)}
                  </span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              )}

              {/* Timeline entries */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/5" />

                {dayActivities.map((activity, index) => {
                  const config = ACTIVITY_TYPE_MAP[activity.activity_type] || ACTIVITY_TYPE_MAP.custom
                  const Icon = config.icon

                  return (
                    <div 
                      key={activity.id} 
                      className="flex gap-4 relative group animate-in fade-in slide-in-from-bottom duration-300"
                      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
                    >
                      {/* Icon dot */}
                      <div className="flex-shrink-0 z-10">
                        <div className={`h-8 w-8 rounded-full border border-white/10 bg-slate-950/80 flex items-center justify-center group-hover:border-cyan-500/30 transition-colors`}>
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0 border-white/10 ${config.color}`}>
                            {highlightText(config.label, searchTerm)}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground/50">
                            {formatRelativeTime(activity.created)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {highlightText(activity.description, searchTerm)}
                        </p>
                        {activity.actor && activity.actor !== 'system' && !isMiniView && (
                          <p className="text-[9px] text-muted-foreground/40 mt-0.5">
                            by {highlightText(activity.actor, searchTerm)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  if (isMiniView) {
    return <div className="font-mono text-xs">{innerContent}</div>
  }

  return (
    <div className="space-y-6 font-mono text-xs">
      <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md animate-in fade-in slide-in-from-bottom duration-300">
        <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ActivityIcon className="h-3.5 w-3.5" />
            {highlightText("Activity Timeline", searchTerm)}
            {activityCount > 0 && (
              <Badge variant="outline" className="text-[8px] border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-bold ml-1">
                {highlightText(`${activityCount} events`, searchTerm)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {innerContent}
        </CardContent>
      </Card>
    </div>
  )
}
