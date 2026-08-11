'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Server, Database, Users, AlertTriangle } from 'lucide-react'

interface AdminPanelProps {
  liveContainers: any[]
  restartingContainers: Record<string, boolean>
  onRestartContainer: (name: string) => void
  isRebuildingIndex: boolean
  rebuildProgress: number
  onRebuildPgvectorIndex: () => void
  usersList: any[]
  onOpenUserModal: () => void
}

export function AdminPanel({
  liveContainers,
  restartingContainers,
  onRestartContainer,
  isRebuildingIndex,
  rebuildProgress,
  onRebuildPgvectorIndex,
  usersList,
  onOpenUserModal,
}: AdminPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
      {/* Docker Container Status */}
      <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Server className="h-4 w-4" /> Docker Infrastructure Monitor
            </span>
            <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">
              {liveContainers.length} Services
            </Badge>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {liveContainers.length === 0 ? (
              <div className="text-[10px] font-mono text-slate-500 py-8 text-center border border-dashed border-white/5 rounded-xl">
                Fetching container statuses from Docker daemon...
              </div>
            ) : (
              liveContainers.map((c: any) => (
                <div key={c.id} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 flex items-center justify-between font-mono text-xs">
                  <div className="space-y-0.5 truncate max-w-[180px]">
                    <span className="font-bold text-slate-200 block truncate">{c.name}</span>
                    <span className="text-[9.5px] text-slate-400 block truncate">{c.port || 'Internal Port'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      c.status === 'running'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8.5px]'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20 text-[8.5px]'
                    }>
                      {c.status}
                    </Badge>
                    <Button
                      size="sm"
                      disabled={restartingContainers[c.name]}
                      onClick={() => onRestartContainer(c.name)}
                      className="h-5 px-2 text-[8px] font-mono uppercase bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
                    >
                      {restartingContainers[c.name] ? 'Restarting...' : 'Restart'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl text-[9.5px] font-mono flex items-center justify-between text-slate-400">
          <span>Docker Daemon Socket:</span>
          <span className="text-cyan-400 font-bold">/var/run/docker.sock</span>
        </div>
      </Card>

      {/* Index Rebuild & User Management */}
      <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Database className="h-4 w-4" /> Operations & System Controls
            </span>
            <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">System Admin</Badge>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {/* Rebuild Vector Index */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-200">pgvector Embedding Index</span>
                {isRebuildingIndex && <span className="text-cyan-400 font-bold">{rebuildProgress}%</span>}
              </div>
              {isRebuildingIndex && (
                <Progress value={rebuildProgress} className="h-1.5 bg-slate-900" />
              )}
              <Button
                onClick={onRebuildPgvectorIndex}
                disabled={isRebuildingIndex}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs uppercase h-8 rounded-xl"
              >
                {isRebuildingIndex ? 'Rebuilding Embeddings...' : 'Rebuild Similarity Index'}
              </Button>
            </div>

            {/* User Access Controls */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> User Accounts ({usersList.length})
                </span>
                <Button
                  size="sm"
                  onClick={onOpenUserModal}
                  className="h-5 px-2 text-[8px] uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 rounded"
                >
                  + Add User
                </Button>
              </div>

              <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1 text-[10px]">
                {usersList.map((u: any) => (
                  <div key={u.id} className="flex justify-between items-center text-slate-300 py-0.5 border-b border-white/5">
                    <span>{u.username || u.email || 'User'}</span>
                    <Badge className="bg-slate-800 text-slate-400 text-[8px] uppercase">{u.role || 'Member'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 rounded-xl text-[10px] font-mono flex items-center justify-between">
          <span>SurrealDB Auth Mode:</span>
          <span className="font-bold text-cyan-400">SCHEMAFULL</span>
        </div>
      </Card>
    </div>
  )
}
