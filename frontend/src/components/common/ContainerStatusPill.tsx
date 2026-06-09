'use client'

import { useEffect, useState, useCallback } from 'react'
import { Container, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import Link from 'next/link'

interface ContainerInfo {
  id: string
  name: string
  image: string
  status: string
  state: string
  ports: string
  created: string
  uptime: string
  size?: string
}

interface ContainerStatusResponse {
  containers: ContainerInfo[]
  total: number
  error?: string
}

export function ContainerStatusPill({ isCollapsed }: { isCollapsed?: boolean }) {
  const [containers, setContainers] = useState<ContainerInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await apiClient.get<ContainerStatusResponse>('/containers/status')
      setContainers(data.containers || [])
      setError(data.error || null)
    } catch {
      setError('Failed to connect to container API')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  if (loading && containers.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono bg-sidebar-accent/30 border border-sidebar-border/50 text-muted-foreground w-full justify-center">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        {!isCollapsed && <span>SRE Monitoring...</span>}
      </div>
    )
  }

  const runningCount = containers.filter(c =>
    c.status.toLowerCase().includes('up') || c.state === 'running'
  ).length
  const totalCount = containers.length
  const isHealthy = runningCount === totalCount && totalCount > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1.5 rounded-md text-xs font-mono border transition-all duration-300 hover:bg-sidebar-accent/50 cursor-pointer w-full',
            isCollapsed ? 'justify-center p-1.5' : 'justify-start px-2 py-1.5',
            isHealthy
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
              : totalCount === 0 || error
                ? 'border-red-500/30 bg-red-500/5 text-red-400'
                : 'border-amber-500/30 bg-amber-500/5 text-amber-400'
          )}
        >
          {isHealthy ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          ) : totalCount === 0 || error ? (
            <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          )}
          {!isCollapsed && (
            <span className="truncate">
              {isHealthy
                ? 'SRE: All Systems OK'
                : totalCount === 0 || error
                  ? 'SRE: API Unreachable'
                  : `SRE: ${runningCount}/${totalCount} Services Up`}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-80 bg-background/95 backdrop-blur-lg border-sidebar-border p-3 shadow-2xl z-50">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-sidebar-border/50 pb-2">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
              System Service Health
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-sidebar-accent"
              onClick={fetchStatus}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          {error && (
            <p className="text-[10px] text-red-400 font-mono leading-relaxed">{error}</p>
          )}

          {containers.length === 0 && !error && (
            <p className="text-[10px] text-muted-foreground font-mono">No containers detected.</p>
          )}

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {containers.map(c => {
              const run = c.status.toLowerCase().includes('up') || c.state === 'running'
              return (
                <div key={c.id} className="flex items-center justify-between gap-2 p-1.5 rounded bg-sidebar-accent/20 border border-sidebar-border/30">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate font-mono">{c.name}</p>
                    <p className="text-[9px] text-muted-foreground truncate font-mono">{c.status}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] font-mono py-0 px-1 uppercase shrink-0',
                      run
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-red-500/30 bg-red-500/10 text-red-400'
                    )}
                  >
                    {run ? 'Running' : 'Stopped'}
                  </Badge>
                </div>
              )
            })}
          </div>

          <div className="border-t border-sidebar-border/50 pt-2 flex justify-end">
            <Link href="/settings?tab=containers" passHref>
              <Button size="sm" variant="outline" className="text-[10px] font-mono h-7 uppercase tracking-wider">
                Full Observatory →
              </Button>
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
