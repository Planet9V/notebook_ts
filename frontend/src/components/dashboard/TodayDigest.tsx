'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Megaphone,
  Sparkles,
  ArrowRight,
  ClipboardList,
} from 'lucide-react'
import { useTasks } from '@/lib/hooks/use-tasks'
import { useCampaigns } from '@/lib/hooks/use-campaigns'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function TodayDigest() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: campaigns = [], isLoading: campaignsLoading } = useCampaigns()

  // Filter tasks that need attention:
  // - status is not done or cancelled
  // - priority is critical or high OR has a due date
  const activeTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done' && t.status !== 'cancelled')
      .sort((a, b) => {
        // Sort critical/high first, then by due date
        const priorityScore = (p?: string) => {
          if (p === 'critical') return 4
          if (p === 'high') return 3
          if (p === 'medium') return 2
          return 1
        }
        const scoreDiff = priorityScore(b.priority) - priorityScore(a.priority)
        if (scoreDiff !== 0) return scoreDiff

        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })
      .slice(0, 5)
  }, [tasks])

  // Filter active campaigns
  const activeCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => c.status === 'active')
      .slice(0, 3)
  }, [campaigns])

  const stats = useMemo(() => {
    const pendingCount = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length
    const criticalCount = tasks.filter((t) => t.status !== 'done' && t.priority === 'critical').length
    const runningCampaigns = campaigns.filter((c) => c.status === 'active').length

    return { pendingCount, criticalCount, runningCampaigns }
  }, [tasks, campaigns])

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      case 'high':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'medium':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Clock className="h-3 w-3 text-cyan-400 animate-pulse" />
      case 'review':
        return <AlertTriangle className="h-3 w-3 text-amber-400" />
      default:
        return <ClipboardList className="h-3 w-3 text-slate-400" />
    }
  }

  const isLoaded = !tasksLoading && !campaignsLoading

  return (
    <Card className="relative overflow-hidden bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl transition-all duration-300 hover:border-white/15">
      {/* Decorative gradient background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <CardHeader className="pb-3 border-b border-white/5 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl border border-white/10">
              <Sparkles className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider text-slate-100">
                Today's Intelligence Digest
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                Contextual briefing & critical operations focus
              </p>
            </div>
          </div>
          <Badge className="bg-cyan-500/10 text-cyan-400 text-[9px] border border-cyan-500/20 font-mono tracking-wide px-2 py-0.5">
            LIVE BRIEFING
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5 relative z-10">
        {/* Aggregated Overview Badges */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-950/40 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">Pending Tasks</span>
            <span className="text-xl font-bold font-mono text-cyan-400 mt-0.5">{stats.pendingCount}</span>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">Critical Focus</span>
            <span className={cn("text-xl font-bold font-mono mt-0.5", stats.criticalCount > 0 ? "text-rose-400" : "text-slate-400")}>
              {stats.criticalCount}
            </span>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">Active Campaigns</span>
            <span className="text-xl font-bold font-mono text-violet-400 mt-0.5">{stats.runningCampaigns}</span>
          </div>
        </div>

        {/* Priorities Section */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-cyan-400" /> Immediate Priorities
          </h4>
          
          <ScrollArea className="max-h-[170px] rounded-lg">
            <div className="space-y-2 pr-2">
              {!isLoaded ? (
                <div className="py-6 text-center text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">
                  Syncing agenda...
                </div>
              ) : activeTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-xl text-center text-slate-500">
                  <CheckCircle className="h-6 w-6 text-emerald-400/60 mb-1" />
                  <p className="text-[10px] font-mono uppercase">All caught up! No pending tasks.</p>
                </div>
              ) : (
                activeTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 bg-slate-950/30 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="text-xs font-medium text-slate-200 truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1 pl-5">
                          {task.description}
                        </p>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-[9px] text-amber-500/80 font-mono pl-5">
                          <Calendar className="h-2.5 w-2.5" />
                          <span>Due: {task.due_date}</span>
                        </div>
                      )}
                    </div>
                    {task.priority && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] font-mono tracking-wider font-semibold py-0 px-1.5 uppercase shrink-0',
                          getPriorityColor(task.priority)
                        )}
                      >
                        {task.priority}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Marketing / Campaigns Section */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Megaphone className="h-3 w-3 text-violet-400" /> Active Marketing Themes
          </h4>

          <div className="space-y-2">
            {!isLoaded ? (
              <div className="h-12 bg-slate-950/20 border border-white/5 rounded-xl animate-pulse" />
            ) : activeCampaigns.length === 0 ? (
              <div className="p-4 bg-slate-950/10 rounded-xl border border-dashed border-white/5 text-center text-slate-500 text-[9px] font-mono uppercase">
                No active marketing campaigns
              </div>
            ) : (
              activeCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-2.5 bg-slate-950/20 border border-white/5 rounded-xl flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-violet-400 uppercase font-bold tracking-wider">
                      📢 {camp.name}
                    </span>
                    {camp.theme && (
                      <p className="text-[10px] text-slate-300 truncate mt-0.5">
                        Theme: {camp.theme}
                      </p>
                    )}
                  </div>
                  {camp.channels && camp.channels.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {camp.channels.slice(0, 2).map((chan) => (
                        <Badge
                          key={chan}
                          variant="outline"
                          className="text-[8px] font-mono py-0 px-1 border-white/5 bg-slate-900/60 text-slate-400 capitalize"
                        >
                          {chan}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <Link href="/tasks" className="w-1/2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[10px] font-mono uppercase tracking-wider text-cyan-400 hover:text-cyan-300 hover:bg-slate-800/20 py-1"
            >
              Task Board <ArrowRight className="h-3 w-3 ml-1.5" />
            </Button>
          </Link>
          <div className="w-px h-4 bg-white/5" />
          <Link href="/campaigns" className="w-1/2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[10px] font-mono uppercase tracking-wider text-violet-400 hover:text-violet-300 hover:bg-slate-800/20 py-1"
            >
              Campaigns <ArrowRight className="h-3 w-3 ml-1.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
