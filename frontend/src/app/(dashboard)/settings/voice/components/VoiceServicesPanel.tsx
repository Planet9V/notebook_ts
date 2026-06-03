'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Radio, Volume2, Mic2, Server } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VoiceConfig } from '@/lib/api/voice'

interface VoiceServicesPanelProps {
  config: VoiceConfig | null
  loading: boolean
}

const SERVICE_META: Record<string, { icon: typeof Radio; gradient: string }> = {
  'LiveKit SFU': {
    icon: Radio,
    gradient: 'from-cyan-500/20 to-blue-500/20',
  },
  'Kokoro TTS': {
    icon: Volume2,
    gradient: 'from-violet-500/20 to-purple-500/20',
  },
  'Faster Whisper STT': {
    icon: Mic2,
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
}

export function VoiceServicesPanel({ config, loading }: VoiceServicesPanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-sidebar-accent/10">
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" role="status" aria-label="Loading voice service status" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!config) {
    return (
      <Card className="bg-red-500/5 border-red-500/20">
        <CardContent className="p-6 text-center">
          <Server className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-300">
            Unable to reach voice services. Ensure the API server is running.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Run:{' '}
            <code className="bg-sidebar-accent/30 px-1.5 py-0.5 rounded text-[11px]">
              docker compose up livekit-server kokoro-tts whisper-stt -d
            </code>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {config.services.map((service) => {
        const meta = SERVICE_META[service.name] || {
          icon: Server,
          gradient: 'from-gray-500/20 to-gray-600/20',
        }
        const Icon = meta.icon

        return (
          <Card
            key={service.name}
            className={cn(
              'relative overflow-hidden transition-all duration-300',
              'hover:border-sidebar-border/80',
              service.status === 'healthy'
                ? 'bg-sidebar-accent/10'
                : 'bg-red-500/5 border-red-500/20'
            )}
          >
            {/* Gradient accent bar */}
            <div
              className={cn(
                'absolute top-0 left-0 right-0 h-0.5',
                service.status === 'healthy'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : service.status === 'unhealthy'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'bg-gradient-to-r from-red-500 to-red-400'
              )}
            />
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center',
                      `bg-gradient-to-br ${meta.gradient}`,
                      'border border-sidebar-border/30'
                    )}
                  >
                    <Icon className="h-4 w-4 text-foreground/70" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{service.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]" title={service.url}>
                      {service.url}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[11px] font-mono shrink-0',
                    service.status === 'healthy'
                      ? 'border-emerald-500/40 text-emerald-400'
                      : service.status === 'unhealthy'
                        ? 'border-amber-500/40 text-amber-400'
                        : 'border-red-500/40 text-red-400'
                  )}
                >
                  {service.status}
                </Badge>
              </div>

              {/* Latency / Details */}
              <div className="mt-3 flex items-center gap-2">
                {service.latency_ms != null && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Latency: {service.latency_ms}ms
                  </span>
                )}
                {service.details && (
                  <span className="text-[11px] text-red-300/70 truncate" title={service.details}>
                    {service.details}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
