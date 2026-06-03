import { cn } from '@/lib/utils'
import {
  Container,
  Activity,
  Server,
  Cpu,
  HardDrive,
  ScrollText,
  RotateCcw,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ── Types ───────────────────────────────────────────────────────────

export interface ContainerInfo {
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

// ── Helpers ─────────────────────────────────────────────────────────

function getStatusBadgeVariant(status: string): string {
  if (status.toLowerCase().includes('up') || status === 'running')
    return 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
  if (status.toLowerCase().includes('restart'))
    return 'border-amber-500/50 text-amber-400 bg-amber-500/10'
  return 'border-red-500/50 text-red-400 bg-red-500/10'
}

function getServiceIcon(name: string) {
  if (name.includes('surrealdb')) return HardDrive
  if (name.includes('livekit')) return Activity
  if (name.includes('kokoro') || name.includes('tts')) return Server
  if (name.includes('whisper') || name.includes('stt')) return Cpu
  return Container
}

function getServiceDescription(name: string): string {
  if (name.includes('surrealdb')) return 'Graph Database'
  if (name.includes('open_notebook') || name.includes('notebook'))
    return 'Application Server'
  if (name.includes('livekit')) return 'WebRTC Media Server'
  if (name.includes('kokoro') || name.includes('tts'))
    return 'Text-to-Speech Engine'
  if (name.includes('whisper') || name.includes('stt'))
    return 'Speech-to-Text Engine'
  return 'Docker Service'
}

// ── Component ───────────────────────────────────────────────────────

interface ContainerCardProps {
  container: ContainerInfo
  onViewLogs: (name: string) => void
  onRestart: (name: string) => void
  isRestarting: boolean
}

export function ContainerCard({
  container,
  onViewLogs,
  onRestart,
  isRestarting,
}: ContainerCardProps) {
  const ServiceIcon = getServiceIcon(container.name)
  const isRunning =
    container.status.toLowerCase().includes('up') ||
    container.state === 'running'

  return (
    <Card
      className={cn(
        'bg-sidebar-accent/10 border-sidebar-border/40',
        'transition-all duration-300',
        'hover:border-sidebar-border/70 hover:bg-sidebar-accent/15',
        isRunning && 'border-l-2 border-l-emerald-500/60',
        !isRunning && 'border-l-2 border-l-red-500/60'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'h-9 w-9 rounded-lg flex items-center justify-center',
                isRunning
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              )}
            >
              <ServiceIcon
                className={cn(
                  'h-4.5 w-4.5',
                  isRunning ? 'text-emerald-400' : 'text-red-400'
                )}
              />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                {container.name}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                {getServiceDescription(container.name)}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-mono h-5',
              getStatusBadgeVariant(container.state || container.status)
            )}
          >
            {container.state || container.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Details */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Server className="h-3 w-3 flex-shrink-0" />
            <span className="truncate font-mono" title={container.image}>{container.image}</span>
          </div>
          {container.ports && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
              <span className="truncate font-mono" title={container.ports}>{container.ports}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{container.uptime || container.status}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-sidebar-border/20">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => onViewLogs(container.name)}
          >
            <ScrollText className="h-3 w-3 mr-1.5" />
            Logs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => onRestart(container.name)}
            disabled={isRestarting}
          >
            <RotateCcw
              className={cn(
                'h-3 w-3 mr-1.5',
                isRestarting && 'animate-spin'
              )}
            />
            {isRestarting ? 'Restarting...' : 'Restart'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
