'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import {
  RefreshCw,
  Search,
  Trash2,
  Terminal,
  AlertTriangle,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  FileText,
  Boxes,
  Database,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'

// ── Types ───────────────────────────────────────────────────────────

interface SystemLog {
  id: string
  timestamp: string
  level: string
  component: string
  message: string
  module: string
  function: string
  line: number
  exception?: string
  extra?: Record<string, any>
}

interface SystemLogsResponse {
  logs: SystemLog[]
  total: number
}

// ── Page Component ──────────────────────────────────────────────────

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  // Filters
  const [componentFilter, setComponentFilter] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [limit] = useState(50)
  const [page, setPage] = useState(1)

  // Metrics
  const [errorCount, setErrorCount] = useState(0)
  const [warningCount, setWarningCount] = useState(0)
  const [componentStats, setComponentStats] = useState<Record<string, number>>({
    api: 0,
    worker: 0,
    voice_agent: 0,
  })

  // Auto-refresh timer reference
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    document.title = 'System Logs | Tetrel'
  }, [])

  // 1. Fetch Logs from API
  const fetchLogs = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true)
    try {
      const offset = (page - 1) * limit
      const params: Record<string, any> = {
        limit,
        offset,
      }
      if (componentFilter) params.component = componentFilter
      if (levelFilter) params.level = levelFilter
      if (searchQuery) params.search = searchQuery

      const { data } = await apiClient.get<SystemLogsResponse>('/system-logs', { params })
      setLogs(data.logs || [])
      setTotal(data.total || 0)

      // Calculate simple stats on current batch (or fetch summaries in the future)
      let errors = 0
      let warnings = 0
      const comps = { api: 0, worker: 0, voice_agent: 0 } as Record<string, number>

      data.logs.forEach((log) => {
        if (log.level === 'ERROR') errors++
        if (log.level === 'WARNING') warnings++
        if (log.component in comps) {
          comps[log.component]++
        }
      })

      setErrorCount(errors)
      setWarningCount(warnings)
      setComponentStats(comps)

    } catch (err) {
      console.error('Failed to load system logs', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, limit, componentFilter, levelFilter, searchQuery])

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [componentFilter, levelFilter, searchQuery])

  // Refetch logs when filters or pagination changes
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // 2. Setup Auto-Refresh Interval
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchLogs(true)
      }, 5000)
    } else if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current)
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current)
      }
    }
  }, [autoRefresh, fetchLogs])

  // 3. Clear/Prune Logs
  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to purge all system logs from the database?')) {
      return
    }

    try {
      const { data } = await apiClient.delete('/system-logs')
      toast.success(data.message || 'Successfully cleared database logs.')
      setLogs([])
      setTotal(0)
      fetchLogs()
    } catch {
      toast.error('Failed to clear logs.')
    }
  }

  // Helper: Format levels with beautiful HSL colors
  const getLevelBadgeStyles = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'border-rose-500/35 bg-rose-500/10 text-rose-400 font-medium'
      case 'WARNING':
        return 'border-amber-500/35 bg-amber-500/10 text-amber-400 font-medium'
      case 'SUCCESS':
        return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400 font-medium'
      case 'DEBUG':
        return 'border-slate-500/35 bg-slate-500/10 text-slate-400 font-mono text-[11px]'
      default:
        return 'border-cyan-500/35 bg-cyan-500/10 text-cyan-400 font-medium'
    }
  }

  const getComponentBadgeStyles = (comp: string) => {
    switch (comp) {
      case 'worker':
        return 'border-violet-500/35 bg-violet-500/10 text-violet-400'
      case 'voice_agent':
        return 'border-orange-500/35 bg-orange-500/10 text-orange-400'
      default:
        return 'border-blue-500/35 bg-blue-500/10 text-blue-400'
    }
  }

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts)
      return d.toLocaleTimeString() + ' ' + d.toLocaleDateString()
    } catch {
      return ts
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background/50 backdrop-blur-md">
        <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto">
          {/* ── Header ──────────────────────────────────────────── */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                <Terminal className="h-7 w-7 text-cyan-400 animate-pulse" />
                System Logs & Diagnostics
              </h1>
              <p className="text-muted-foreground text-sm">
                Monitor and query database-persisted events from all running services
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Auto Refresh Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(
                  'transition-all duration-200 border-sidebar-border',
                  autoRefresh ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'text-muted-foreground'
                )}
              >
                {autoRefresh ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" /> Live Monitoring On
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" /> Live Monitoring Off
                  </>
                )}
              </Button>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(true)}
                disabled={refreshing}
                className="border-sidebar-border"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
                Refresh
              </Button>

              {/* Clear Logs Button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearLogs}
                className="bg-rose-600 hover:bg-rose-700 text-white border-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Logs
              </Button>
            </div>
          </header>

          {/* ── Bento Grid Metric Summaries ─────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-sidebar border-sidebar-border/30 shadow-lg backdrop-blur-md">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Logs Ingested</p>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground/90 font-mono mt-0.5">{total}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sidebar border-sidebar-border/30 shadow-lg backdrop-blur-md">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Errors (Batch)</p>
                  <h3 className="text-2xl font-bold tracking-tight text-rose-400 font-mono mt-0.5">{errorCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sidebar border-sidebar-border/30 shadow-lg backdrop-blur-md">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Warnings (Batch)</p>
                  <h3 className="text-2xl font-bold tracking-tight text-amber-400 font-mono mt-0.5">{warningCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sidebar border-sidebar-border/30 shadow-lg backdrop-blur-md">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-violet-500/10 text-violet-400">
                  <Boxes className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Component Stats</p>
                  <div className="flex gap-3 mt-1.5 text-xs font-mono font-medium">
                    <span className="text-blue-400">api:{componentStats.api}</span>
                    <span className="text-violet-400">wrk:{componentStats.worker}</span>
                    <span className="text-orange-400">vce:{componentStats.voice_agent}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Filters Bar ─────────────────────────────────────── */}
          <div className="bg-sidebar border border-sidebar-border/30 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-lg backdrop-blur-md">
            {/* Search query input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages or stacktraces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-sidebar-border/60 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            {/* Component Filter Select */}
            <select
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value)}
              className="bg-background/50 border border-sidebar-border/60 hover:border-sidebar-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-cyan-500 focus:outline-none w-full md:w-44"
            >
              <option value="">All Components</option>
              <option value="api">API Process</option>
              <option value="worker">Background Worker</option>
              <option value="voice_agent">Voice WebRTC Agent</option>
            </select>

            {/* Level Filter Select */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-background/50 border border-sidebar-border/60 hover:border-sidebar-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-cyan-500 focus:outline-none w-full md:w-44"
            >
              <option value="">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="DEBUG">DEBUG</option>
            </select>

            {/* Reset Filters */}
            {(componentFilter || levelFilter || searchQuery) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setComponentFilter('')
                  setLevelFilter('')
                  setSearchQuery('')
                }}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* ── Logs Table / List ────────────────────────────────── */}
          <div className="bg-sidebar border border-sidebar-border/30 rounded-xl overflow-hidden shadow-lg backdrop-blur-md">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
                <span>Streaming logs from database...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <FileText className="h-10 w-10 text-muted-foreground/50" />
                <span>No logs found matching your filters.</span>
              </div>
            ) : (
              <div className="divide-y divide-sidebar-border/20">
                {logs.map((log) => {
                  const isExpanded = expandedLog === log.id
                  return (
                    <div
                      key={log.id}
                      className={cn(
                        'transition-all duration-150',
                        isExpanded ? 'bg-sidebar-accent/30' : 'hover:bg-sidebar-accent/15'
                      )}
                    >
                      {/* Log Row Header */}
                      <div
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Level Badge */}
                          <Badge variant="outline" className={getLevelBadgeStyles(log.level)}>
                            {log.level}
                          </Badge>

                          {/* Component Badge */}
                          <Badge variant="outline" className={getComponentBadgeStyles(log.component)}>
                            {log.component}
                          </Badge>

                          {/* Log Message */}
                          <span className="text-sm font-medium text-foreground/90 break-all md:max-w-2xl lg:max-w-4xl line-clamp-1">
                            {log.message}
                          </span>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 text-xs text-muted-foreground font-mono shrink-0">
                          {/* Source context */}
                          <span className="hidden sm:inline opacity-75 max-w-[200px] truncate">
                            {log.module}.py:{log.line}
                          </span>
                          
                          {/* Timestamp */}
                          <span>{formatTimestamp(log.timestamp)}</span>

                          {/* Expand Icon */}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 opacity-70" />
                          ) : (
                            <ChevronDown className="h-4 w-4 opacity-70" />
                          )}
                        </div>
                      </div>

                      {/* Log Details (Expanded Panel) */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-sidebar-border/10 space-y-3 bg-black/10 transition-all duration-200">
                          {/* Meta grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-muted-foreground/80">
                            <div>
                              <strong className="text-foreground/75">Location:</strong> {log.module}.py:{log.line} in <span className="text-cyan-400">{log.function}()</span>
                            </div>
                            <div>
                              <strong className="text-foreground/75">Log ID:</strong> {log.id}
                            </div>
                          </div>

                          {/* Exception details (if present) */}
                          {log.exception && (
                            <div className="space-y-1.5">
                              <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5" /> Stacktrace Detail
                              </span>
                              <pre className="p-3 bg-rose-950/20 border border-rose-950/50 rounded-lg text-rose-300 font-mono text-[11px] overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed shadow-inner">
                                {log.exception}
                              </pre>
                            </div>
                          )}

                          {/* Extra loguru metadata (if present) */}
                          {log.extra && Object.keys(log.extra).length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-xs font-semibold text-cyan-400">Context Data (Extra)</span>
                              <pre className="p-3 bg-slate-950/45 border border-slate-900 rounded-lg text-cyan-300/80 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed shadow-inner">
                                {JSON.stringify(log.extra, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Pagination Controls ────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 mt-2">
              <span className="text-sm text-muted-foreground">
                Showing logs {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-sidebar-border"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                </Button>
                <span className="text-sm font-medium font-mono px-3">
                  Page {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-sidebar-border"
                >
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
