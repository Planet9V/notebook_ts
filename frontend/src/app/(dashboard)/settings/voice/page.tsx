'use client'

import { AppShell } from '@/components/layout/AppShell'
import { VoiceServicesPanel } from './components/VoiceServicesPanel'
import { LiveKitConfigCard } from './components/LiveKitConfigCard'
import { TTSConfigCard } from './components/TTSConfigCard'
import { STTConfigCard } from './components/STTConfigCard'
import { AudioLines, RefreshCw, Cpu, HardDrive, Monitor, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState, useCallback } from 'react'
import { voiceApi, VoiceConfig, VoiceSettings } from '@/lib/api/voice'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface PlatformInfo {
  os: string
  arch: string
  python_version: string
  hostname: string
  cpu_count: number
  memory_total_mb: number
  memory_available_mb: number
  gpu: {
    available: boolean
    type: string
    devices: Array<{ name: string; memory_mb: number; compute_capability?: string }>
    driver_version?: string
    recommended_compute_type: string
  }
  docker: {
    available: boolean
    version?: string
    compose_version?: string
  }
}

export default function VoiceSettingsPage() {
  const [config, setConfig] = useState<VoiceConfig | null>(null)
  const [settings, setSettings] = useState<VoiceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<PlatformInfo | null>(null)

  useEffect(() => {
    document.title = 'Voice AI | Tetrel'
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      // Use allSettled so one failure doesn't kill the others
      const results = await Promise.allSettled([
        voiceApi.getConfig(),
        apiClient.get<PlatformInfo>('/platform/info'),
        voiceApi.getSettings(),
      ])
      setConfig(results[0].status === 'fulfilled' ? results[0].value : null)
      setPlatform(results[1].status === 'fulfilled' ? results[1].value.data : null)
      setSettings(results[2].status === 'fulfilled' ? results[2].value : null)
    } catch {
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const overallStatus = config?.services.every((s) => s.status === 'healthy')
    ? 'healthy'
    : config?.services.some((s) => s.status === 'healthy')
      ? 'degraded'
      : 'offline'

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                  <AudioLines className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Voice AI Services
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Configure LiveKit, Kokoro TTS, Faster Whisper, OpenAI,
                    ElevenLabs, and Deepgram for voice-powered features
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    overallStatus === 'healthy'
                      ? 'border-emerald-500/50 text-emerald-400'
                      : overallStatus === 'degraded'
                        ? 'border-amber-500/50 text-amber-400'
                        : 'border-red-500/50 text-red-400'
                  }
                >
                  {overallStatus === 'healthy'
                    ? '● All Services Online'
                    : overallStatus === 'degraded'
                      ? '◐ Partial Services'
                      : '○ Services Offline'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={loading}
                  aria-label="Refresh voice services"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>
            </div>

            {/* Platform Info */}
            {platform && (
              <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-cyan-400" />
                    Platform Detection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* GPU */}
                    <div className="space-y-1.5">
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Cpu className="h-3 w-3" />
                        GPU
                      </dt>
                      <dd className={cn(
                        'text-sm font-medium',
                        platform.gpu.available ? 'text-emerald-400' : 'text-muted-foreground'
                      )}>
                        {platform.gpu.available
                          ? `${platform.gpu.type.toUpperCase()} — ${platform.gpu.devices[0]?.name || 'Detected'}`
                          : 'None Detected'}
                      </dd>
                      <dd>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Compute: {platform.gpu.recommended_compute_type}
                        </Badge>
                      </dd>
                    </div>

                    {/* Memory */}
                    <div className="space-y-1.5">
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <HardDrive className="h-3 w-3" />
                        Memory
                      </dt>
                      <dd className="text-sm font-medium">
                        {(platform.memory_total_mb / 1024).toFixed(1)} GB total
                      </dd>
                      <dd className="text-xs text-muted-foreground">
                        {(platform.memory_available_mb / 1024).toFixed(1)} GB available
                      </dd>
                    </div>

                    {/* System */}
                    <div className="space-y-1.5">
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Server className="h-3 w-3" />
                        System
                      </dt>
                      <dd className="text-sm font-medium">
                        {platform.os} {platform.arch}
                      </dd>
                      <dd className="text-xs text-muted-foreground">
                        {platform.cpu_count} cores · Python {platform.python_version}
                      </dd>
                    </div>

                    {/* Docker */}
                    <div className="space-y-1.5">
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Server className="h-3 w-3" />
                        Docker
                      </dt>
                      <dd className={cn(
                        'text-sm font-medium',
                        platform.docker.available ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {platform.docker.available ? 'Available' : 'Not Found'}
                      </dd>
                      {platform.docker.compose_version && (
                        <dd className="text-xs text-muted-foreground truncate">
                          {platform.docker.compose_version}
                        </dd>
                      )}
                    </div>
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Service Health Overview */}
            <VoiceServicesPanel config={config} loading={loading} />

            {/* Configuration Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LiveKitConfigCard config={config} settings={settings} onRefresh={refresh} />
              <TTSConfigCard config={config} settings={settings} onRefresh={refresh} />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <STTConfigCard config={config} settings={settings} onRefresh={refresh} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
