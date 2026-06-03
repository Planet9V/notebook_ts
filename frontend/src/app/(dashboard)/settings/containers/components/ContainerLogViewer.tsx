import { cn } from '@/lib/utils'
import { RefreshCw, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ── Types ───────────────────────────────────────────────────────────

interface ContainerLogViewerProps {
  open: boolean
  name: string
  logs: string
  loading: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

// ── Component ───────────────────────────────────────────────────────

export function ContainerLogViewer({
  open,
  name,
  logs,
  loading,
  onOpenChange,
  onRefresh,
}: ContainerLogViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-cyan-400" />
            Logs: {name}
          </DialogTitle>
        </DialogHeader>

        {/* Log Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onRefresh}
          >
            <RefreshCw
              className={cn('h-3 w-3 mr-1', loading && 'animate-spin')}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              navigator.clipboard.writeText(logs)
            }}
            disabled={!logs || loading}
          >
            Copy All
          </Button>
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground font-mono">
            {logs ? logs.split('\n').filter(Boolean).length : 0} lines
          </span>
        </div>

        {/* Log Output */}
        <div className="flex-1 overflow-auto rounded-lg bg-black/40 border border-sidebar-border/30 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
              {logs.split('\n').map((line, i) => {
                const isError = /\b(ERROR|FATAL|CRIT|PANIC)\b/i.test(line)
                const isWarn = /\b(WARN|WARNING)\b/i.test(line)
                return (
                  <div
                    key={i}
                    className={cn(
                      'px-1 -mx-1 rounded-sm',
                      isError && 'text-red-300 bg-red-500/10',
                      isWarn && 'text-amber-300 bg-amber-500/5',
                      !isError && !isWarn && 'text-foreground/80'
                    )}
                  >
                    <span className="text-muted-foreground/40 select-none mr-3 inline-block w-8 text-right">
                      {i + 1}
                    </span>
                    {line}
                  </div>
                )
              })}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
