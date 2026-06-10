'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import {
  RefreshCw,
  Container,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'
import { SettingsTabs } from '../components/SettingsTabs'
import { ContainerCard } from './components/ContainerCard'
import { ContainerLogViewer } from './components/ContainerLogViewer'
import type { ContainerInfo } from './components/ContainerCard'

// ── Types ───────────────────────────────────────────────────────────

interface ContainerStatusResponse {
  containers: ContainerInfo[]
  total: number
  error?: string
}

// ── Main Page ───────────────────────────────────────────────────────

export default function ContainersPage() {
  const [containers, setContainers] = useState<ContainerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [logDialog, setLogDialog] = useState<{ open: boolean; name: string; logs: string }>({
    open: false,
    name: '',
    logs: '',
  })
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [restartingContainer, setRestartingContainer] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Containers | Tetrel'
  }, [])

  const fetchContainers = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const { data } = await apiClient.get<ContainerStatusResponse>('/containers/status')
      setContainers(data.containers || [])
      setError(data.error || null)
    } catch {
      setError('Failed to connect to container API. Is the backend running?')
      setContainers([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchContainers()
    const interval = setInterval(() => fetchContainers(), 30000)
    return () => clearInterval(interval)
  }, [fetchContainers])

  const handleViewLogs = async (name: string) => {
    setLoadingLogs(true)
    setLogDialog({ open: true, name, logs: '' })
    try {
      const { data } = await apiClient.get(`/containers/${encodeURIComponent(name)}/logs`, {
        params: { lines: 200 },
      })
      setLogDialog({ open: true, name, logs: data.logs || 'No logs available.' })
    } catch {
      setLogDialog({ open: true, name, logs: 'Failed to fetch logs.' })
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleRestart = async (name: string) => {
    setRestartingContainer(name)
    try {
      await apiClient.post(`/containers/${encodeURIComponent(name)}/restart`)
      toast.success(`Restarting ${name}…`)
      setTimeout(() => fetchContainers(true), 2000)
    } catch {
      toast.error(`Failed to restart ${name}`)
    } finally {
      setTimeout(() => setRestartingContainer(null), 3000)
    }
  }

  const runningCount = containers.filter(c =>
    c.status.toLowerCase().includes('up') || c.state === 'running'
  ).length
  const totalCount = containers.length

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 space-y-6">
          {/* ── Header ──────────────────────────────────────────── */}
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                <Container className="h-7 w-7 text-cyan-400" />
                Container Observatory
              </h1>
              <p className="text-muted-foreground">
                Monitor and manage Docker services in your application stack
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  'text-sm px-3 py-1.5 font-mono',
                  runningCount === totalCount && totalCount > 0
                    ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                    : runningCount > 0
                      ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                      : 'border-red-500/50 text-red-400 bg-red-500/10'
                )}
              >
                {runningCount === totalCount && totalCount > 0 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                ) : runningCount > 0 ? (
                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                )}
                {runningCount}/{totalCount} Running
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchContainers(true)}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </header>

          {/* Sub Navigation Tabs */}
          <SettingsTabs />

          {/* ── Error Banner ─────────────────────────────────────── */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Container API Warning</p>
                <p className="text-amber-300/70 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* ── Loading State ────────────────────────────────────── */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className="bg-sidebar-accent/10 border-sidebar-border/40 animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-5 w-40 bg-sidebar-accent/30 rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 w-60 bg-sidebar-accent/20 rounded" />
                      <div className="h-4 w-48 bg-sidebar-accent/20 rounded" />
                      <div className="h-4 w-32 bg-sidebar-accent/20 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ── Container Cards Grid ─────────────────────────────── */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {containers.map(container => (
                <ContainerCard
                  key={container.id}
                  container={container}
                  onViewLogs={handleViewLogs}
                  onRestart={handleRestart}
                  isRestarting={restartingContainer === container.name}
                />
              ))}

              {/* Empty state */}
              {containers.length === 0 && !error && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 gap-4">
                  <div className="h-16 w-16 rounded-full bg-sidebar-accent/20 border border-sidebar-border/30 flex items-center justify-center">
                    <Container className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">No Containers Detected</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Make sure Docker is running and the application has access to the Docker socket.
                    </p>
                    <code className="text-xs font-mono text-muted-foreground/60 block mt-2">
                      docker compose up -d
                    </code>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Log Viewer Dialog ──────────────────────────────── */}
      <ContainerLogViewer
        open={logDialog.open}
        name={logDialog.name}
        logs={logDialog.logs}
        loading={loadingLogs}
        onOpenChange={(open) => setLogDialog(prev => ({ ...prev, open }))}
        onRefresh={() => handleViewLogs(logDialog.name)}
      />
    </AppShell>
  )
}
