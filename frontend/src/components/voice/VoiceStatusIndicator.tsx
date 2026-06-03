'use client'

import { useEffect, useState } from 'react'
import { Mic, MicOff, Volume2 } from 'lucide-react'
import { voiceApi, VoiceHealth } from '@/lib/api/voice'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * VoiceStatusIndicator — A small badge showing voice service health.
 * Place in sidebar footer or header bar.
 */
export function VoiceStatusIndicator({ className }: { className?: string }) {
  const [health, setHealth] = useState<VoiceHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const h = await voiceApi.checkHealth()
        if (mounted) setHealth(h)
      } catch {
        if (mounted)
          setHealth({
            overall: 'unhealthy',
            services: [],
          })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    check()
    // Re-check every 60s
    const interval = setInterval(check, 60000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading) return null

  const overall = health?.overall ?? 'unhealthy'
  const statusColor =
    overall === 'healthy'
      ? 'text-emerald-400'
      : overall === 'degraded'
        ? 'text-amber-400'
        : 'text-red-400'

  const StatusIcon =
    overall === 'healthy' ? Volume2 : overall === 'degraded' ? Mic : MicOff

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md',
              'text-xs font-mono cursor-default',
              'bg-sidebar-accent/30 border border-sidebar-border/50',
              'transition-colors duration-300',
              className
            )}
          >
            <StatusIcon className={cn('h-3.5 w-3.5', statusColor)} />
            <span className="text-muted-foreground">Voice</span>
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                overall === 'healthy'
                  ? 'bg-emerald-400 animate-pulse'
                  : overall === 'degraded'
                    ? 'bg-amber-400'
                    : 'bg-red-400'
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          <div className="space-y-1">
            <p className="font-semibold text-xs">
              Voice AI:{' '}
              <span className={statusColor}>
                {overall.charAt(0).toUpperCase() + overall.slice(1)}
              </span>
            </p>
            {health?.services.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="text-muted-foreground">{s.name}</span>
                <span
                  className={cn(
                    'font-mono',
                    s.status === 'healthy'
                      ? 'text-emerald-400'
                      : s.status === 'unhealthy'
                        ? 'text-amber-400'
                        : 'text-red-400'
                  )}
                >
                  {s.status}
                  {s.latency_ms ? ` (${s.latency_ms}ms)` : ''}
                </span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
