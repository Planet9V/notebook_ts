'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Radio, Eye, EyeOff, Zap, ExternalLink, Server, Globe, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { voiceApi } from '@/lib/api/voice'
import type { VoiceConfig, VoiceSettings } from '@/lib/api/voice'
import { useServiceHealthTest } from '../hooks/use-voice-testing'

interface LiveKitConfigCardProps {
  config: VoiceConfig | null
  settings: VoiceSettings | null
  onRefresh: () => void
}

type DeploymentMode = 'local' | 'remote'

export function LiveKitConfigCard({ config, settings, onRefresh }: LiveKitConfigCardProps) {
  const [mode, setMode] = useState<DeploymentMode>('local')
  const [showSecret, setShowSecret] = useState(false)

  // Health check — shared hook eliminates duplicate handler
  const healthTest = useServiceHealthTest('LiveKit SFU')

  // Remote self-hosted fields
  const [remoteUrl, setRemoteUrl] = useState('wss://livekit.myserver.com:7880')
  const [remoteApiKey, setRemoteApiKey] = useState('')
  const [remoteApiSecret, setRemoteApiSecret] = useState('')
  const [saving, setSaving] = useState(false)

  // Hydrate from database settings on load
  useEffect(() => {
    if (!settings) return
    if (settings.livekit_mode) setMode(settings.livekit_mode as DeploymentMode)
    if (settings.livekit_remote_ws_url) setRemoteUrl(settings.livekit_remote_ws_url)
    if (settings.livekit_remote_api_key) setRemoteApiKey(settings.livekit_remote_api_key)
    if (settings.livekit_remote_api_secret) setRemoteApiSecret(settings.livekit_remote_api_secret)
  }, [settings])

  const handleModeChange = useCallback(async (targetMode: DeploymentMode) => {
    setMode(targetMode)
    try {
      await voiceApi.updateSettings({
        livekit_mode: targetMode,
      })
      toast.success(`LiveKit mode set to ${targetMode === 'local' ? 'Local Docker' : 'Remote'}`)
      onRefresh()
    } catch (error) {
      console.error('Failed to update LiveKit mode:', error)
      toast.error('Failed to save deployment mode')
    }
  }, [onRefresh])

  const livekitService = config?.services.find((s) => s.name === 'LiveKit SFU')
  const isHealthy = livekitService?.status === 'healthy'

  const handleSaveRemote = useCallback(async () => {
    setSaving(true)
    try {
      await voiceApi.updateSettings({
        livekit_mode: 'remote',
        livekit_remote_ws_url: remoteUrl,
        livekit_remote_api_key: remoteApiKey,
        livekit_remote_api_secret: remoteApiSecret,
      })
      toast.success('Remote LiveKit settings saved')
      onRefresh()
    } catch (error) {
      console.error('Failed to save remote LiveKit config:', error)
      toast.error('Failed to save remote configuration')
    } finally {
      setSaving(false)
    }
  }, [remoteUrl, remoteApiKey, remoteApiSecret, onRefresh])

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
              <Radio className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-base">LiveKit SFU</CardTitle>
              <CardDescription className="text-xs">
                WebRTC media server for real-time voice
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            role="status"
            aria-live="polite"
            className={cn(
              'text-[11px] font-mono',
              isHealthy
                ? 'border-emerald-500/40 text-emerald-400'
                : 'border-red-500/40 text-red-400'
            )}
          >
            {isHealthy ? 'Connected' : 'Offline'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Deployment Mode Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Deployment Mode</Label>
          <div className="flex gap-2" role="radiogroup" aria-label="LiveKit deployment mode">
            <button
              role="radio"
              aria-checked={mode === 'local'}
              onClick={() => handleModeChange('local')}
              className={cn(
                'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all',
                mode === 'local'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                  : 'border-sidebar-border/30 bg-sidebar-accent/5 text-muted-foreground hover:border-sidebar-border/50'
              )}
            >
              <Server className="h-3.5 w-3.5" />
              <div className="text-left">
                <div className="font-medium">Local Docker</div>
                <div className="text-[10px] text-muted-foreground">Self-hosted on this machine</div>
              </div>
            </button>
            <button
              role="radio"
              aria-checked={mode === 'remote'}
              onClick={() => handleModeChange('remote')}
              className={cn(
                'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all',
                mode === 'remote'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                  : 'border-sidebar-border/30 bg-sidebar-accent/5 text-muted-foreground hover:border-sidebar-border/50'
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              <div className="text-left">
                <div className="font-medium">Remote Self-Hosted</div>
                <div className="text-[10px] text-muted-foreground">Another server</div>
              </div>
            </button>
          </div>
        </div>

        {mode === 'local' ? (
          <>
            {/* Local Docker Config (env-var based, read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">WebSocket URL</Label>
              <Input
                value={config?.livekit_ws_url || 'ws://localhost:7880'}
                readOnly
                className="h-8 text-xs font-mono bg-sidebar-accent/20"
              />
              <p className="text-[10px] text-muted-foreground">
                Set via <code className="bg-sidebar-accent/30 px-1 rounded">LIVEKIT_WS_URL</code> env var
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">API Key</Label>
              <Input
                value={config?.livekit_api_key_set ? '••••••••••' : 'Not configured'}
                readOnly
                className="h-8 text-xs font-mono bg-sidebar-accent/20"
              />
              <p className="text-[10px] text-muted-foreground">
                Set via <code className="bg-sidebar-accent/30 px-1 rounded">LIVEKIT_API_KEY</code> env var
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">API Secret</Label>
              <div className="relative">
                <Input
                  value={showSecret ? '(set via LIVEKIT_API_SECRET env)' : '••••••••••'}
                  readOnly
                  type={showSecret ? 'text' : 'password'}
                  className="h-8 text-xs font-mono bg-sidebar-accent/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Set via <code className="bg-sidebar-accent/30 px-1 rounded">LIVEKIT_API_SECRET</code> env var. Never expose in UI.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Remote Self-Hosted Config (editable) */}
            <div className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-[11px] text-amber-300/80">
                ⚠️ Connects to a <strong>self-hosted</strong> LiveKit instance on another server. Not LiveKit Cloud.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Remote WebSocket URL</Label>
              <Input
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="wss://livekit.myserver.com:7880"
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                WebSocket URL of the remote LiveKit server
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Remote API Key</Label>
              <Input
                value={remoteApiKey}
                onChange={(e) => setRemoteApiKey(e.target.value)}
                placeholder="Enter API key..."
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Remote API Secret</Label>
              <div className="relative">
                <Input
                  value={remoteApiSecret}
                  onChange={(e) => setRemoteApiSecret(e.target.value)}
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Enter API secret..."
                  className="h-8 text-xs font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <Button size="sm" className="w-full text-xs h-8 bg-cyan-600 hover:bg-cyan-700" onClick={handleSaveRemote} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save Remote Configuration
            </Button>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={healthTest.test}
            disabled={healthTest.testing}
          >
            <Zap className={cn('h-3 w-3 mr-1', healthTest.testing && 'animate-pulse')} />
            {healthTest.testing ? 'Testing...' : 'Test Connection'}
          </Button>
          {healthTest.result && (
            <span
              className={cn(
                'text-[11px] font-mono',
                healthTest.result === 'success' ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {healthTest.result === 'success' ? '✓ Connected' : '✗ Connection failed'}
            </span>
          )}
          <a
            href="https://docs.livekit.io"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Docs <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
