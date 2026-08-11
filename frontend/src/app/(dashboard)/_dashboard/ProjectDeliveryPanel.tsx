'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Activity, AlertTriangle } from 'lucide-react'

interface ProjectDeliveryPanelProps {
  projectsList: any[]
  activeDbProject: any
  onMoveTask: (taskIndex: number, currentStatus: string) => void
  onSeedProject: () => void
}

export function ProjectDeliveryPanel({
  projectsList,
  activeDbProject,
  onMoveTask,
  onSeedProject,
}: ProjectDeliveryPanelProps) {
  const tasks = activeDbProject?.tasks ?? []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
      {/* Project Kanban Board */}
      <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
        {projectsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 p-6 h-full my-auto">
            <AlertTriangle className="h-8 w-8 text-cyan-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">No Active Delivery Projects</span>
            <Button
              onClick={onSeedProject}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[10px] uppercase h-8 px-4 rounded-lg"
            >
              Seed Sample Project & Tasks
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Project Kanban ({activeDbProject?.name || 'Active Project'})
              </span>
              <Badge className="bg-cyan-500/10 text-cyan-400 text-[9px] border border-cyan-500/20 font-mono font-bold">
                {tasks.length} Tasks
              </Badge>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <div className="text-[10px] font-mono text-slate-500 py-8 text-center border border-dashed border-white/5 rounded-xl">
                  No tasks configured for this project.
                </div>
              ) : (
                tasks.map((task: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 flex items-center justify-between font-mono text-xs">
                    <div className="space-y-0.5 max-w-[200px]">
                      <span className="font-bold text-slate-200 block truncate">{task.title}</span>
                      <span className="text-[9.5px] text-slate-400 block">Assigned: {task.assigned_to || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        task.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8.5px]'
                          : task.status === 'in_progress' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[8.5px]'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8.5px]'
                      }>
                        {task.status || 'todo'}
                      </Badge>
                      <button
                        onClick={() => onMoveTask(idx, task.status)}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 font-mono underline"
                      >
                        Advance →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl text-[9.5px] font-mono flex items-center justify-between text-slate-400">
          <span>Active Projects in Pipeline:</span>
          <span className="text-cyan-400 font-bold">{projectsList.length}</span>
        </div>
      </Card>

      {/* Project Status & Progress */}
      <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="h-4 w-4" /> Project Milestones & Progress
            </span>
            <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">Live Sync</Badge>
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {projectsList.map((proj: any) => {
              const projTasks = proj.tasks ?? []
              const doneTasks = projTasks.filter((t: any) => t.status === 'done').length
              const pct = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : 0

              return (
                <div key={proj.id} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-200">{proj.name}</span>
                    <span className="text-cyan-400 font-bold">{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Tasks Done: {doneTasks} / {projTasks.length}</span>
                    <span>Stage: {proj.stage || 'In Progress'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 rounded-xl text-[10px] font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> Real-time Execution Tracker
          </span>
          <span className="font-bold text-cyan-400">SurrealDB Connected</span>
        </div>
      </Card>
    </div>
  )
}
