'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ClipboardCheck, Map, Lightbulb, TrendingUp, RefreshCw, FileText, CheckCircle2 } from 'lucide-react'

interface PlanningDashboardProps {
  planId: string
  findingsId: string
  progressId: string
  content: string
  onReferenceClick: (type: string, id: string) => void
  onSendMessage: (message: string) => void
  isStreaming?: boolean
}

export function PlanningDashboard({
  planId,
  findingsId,
  progressId,
  content,
  onReferenceClick,
  onSendMessage,
  isStreaming = false
}: PlanningDashboardProps) {
  
  // Parse stats from content if possible
  // Matches e.g. "Roadmap Progress: `[...]` **70%** (7/10 tasks complete)"
  // Matches e.g. "| 🟢 Completed | 7 | Emerald |"
  // Matches e.g. "| 🟡 In Progress | 2 | Amber |"
  // Matches e.g. "| ⚪ To Do | 1 | Slate |"
  const pctMatch = content.match(/\*\*(\d+)%\*\*/)
  const pct = pctMatch ? parseInt(pctMatch[1]) : 0

  const doneMatch = content.match(/🟢 Completed\s*\|\s*(\d+)/i)
  const doneCount = doneMatch ? parseInt(doneMatch[1]) : 0

  const ipMatch = content.match(/🟡 In Progress\s*\|\s*(\d+)/i)
  const ipCount = ipMatch ? parseInt(ipMatch[1]) : 0

  const todoMatch = content.match(/⚪ To Do\s*\|\s*(\d+)/i)
  const todoCount = todoMatch ? parseInt(todoMatch[1]) : 0

  const totalTasks = doneCount + ipCount + todoCount

  const handleSync = () => {
    if (!isStreaming) {
      onSendMessage('/planning-with-files sync')
    }
  }

  return (
    <Card className="bg-card/40 border-border/50 backdrop-blur-md shadow-2xl overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-violet-950/20 my-4">
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-violet-950/10 via-background/20 to-emerald-950/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-violet-300">
            <div className="p-1.5 rounded-lg bg-violet-950/40 border border-violet-500/20 shadow-inner">
              <ClipboardCheck className="w-4 h-4 text-violet-400" />
            </div>
            Project Roadmap Dashboard
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleSync}
            disabled={isStreaming}
            className="h-8 text-xs bg-emerald-950/30 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/50 hover:text-emerald-300 gap-1.5 cursor-pointer font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isStreaming ? 'animate-spin' : ''}`} />
            Sync Tasks Checklist
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">Roadmap Progress</span>
            <span className="font-bold text-emerald-400">{pct}% Complete <span className="text-[10px] text-muted-foreground font-normal">({doneCount}/{totalTasks} tasks)</span></span>
          </div>
          <Progress value={pct} className="h-2 bg-muted/50" />
        </div>

        {/* Task Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/10 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Completed</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-lg font-bold text-emerald-400">{doneCount}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/10 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">In Progress</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-lg font-bold text-amber-400">{ipCount}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/10 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">To Do</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]" />
              <span className="text-lg font-bold text-slate-400">{todoCount}</span>
            </div>
          </div>
        </div>

        {/* Linked Planning Notes */}
        <div className="space-y-2">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Linked Planning Files</span>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReferenceClick('note', planId)}
              className="text-[11px] h-9 bg-muted/30 border-border/40 hover:bg-muted/50 hover:text-violet-300 justify-start px-2.5 gap-1.5 w-full cursor-pointer font-medium"
            >
              <Map className="w-3.5 h-3.5 text-violet-400" />
              <span className="truncate">task_plan.md</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReferenceClick('note', findingsId)}
              className="text-[11px] h-9 bg-muted/30 border-border/40 hover:bg-muted/50 hover:text-cyan-300 justify-start px-2.5 gap-1.5 w-full cursor-pointer font-medium"
            >
              <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate">findings.md</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReferenceClick('note', progressId)}
              className="text-[11px] h-9 bg-muted/30 border-border/40 hover:bg-muted/50 hover:text-emerald-300 justify-start px-2.5 gap-1.5 w-full cursor-pointer font-medium"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">progress.md</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
