'use client'

import React, { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSearch } from '@/lib/hooks/use-search'

interface AICommandBarProps {
  onMindsetChange: (mindset: 'sales' | 'research' | 'delivery' | 'marketing' | 'admin') => void
}

export function AICommandBar({ onMindsetChange }: AICommandBarProps) {
  const [aiCommand, setAiCommand] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const searchMutation = useSearch()

  const handleRunAiCommand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiCommand.trim()) return

    setAiProcessing(true)
    setAiResponse(null)

    try {
      const res = await searchMutation.mutateAsync({
        query: aiCommand,
        type: 'hybrid',
        limit: 5,
        search_sources: true,
        search_notes: true,
        minimum_score: 0.0,
      })
      const results: any[] = res?.results ?? []

      const cmd = aiCommand.toLowerCase()
      if (cmd.includes('sales') || cmd.includes('pipeline') || cmd.includes('deal') || cmd.includes('customer')) {
        onMindsetChange('sales')
      } else if (cmd.includes('podcast') || cmd.includes('audio') || cmd.includes('marketing') || cmd.includes('campaign') || cmd.includes('post')) {
        onMindsetChange('marketing')
      } else if (cmd.includes('container') || cmd.includes('sre') || cmd.includes('project') || cmd.includes('delivery') || cmd.includes('facility')) {
        onMindsetChange('delivery')
      } else if (cmd.includes('admin') || cmd.includes('user') || cmd.includes('config') || cmd.includes('settings') || cmd.includes('logs')) {
        onMindsetChange('admin')
      } else {
        onMindsetChange('research')
      }

      if (results.length > 0) {
        const preview = results.slice(0, 2)
          .map((r) => r.title || (r.content as string)?.slice(0, 50))
          .filter(Boolean)
          .join(' · ')
        setAiResponse(`Found ${results.length} result${results.length > 1 ? 's' : ''}: ${preview}`)
      } else {
        setAiResponse('No matching documents found. Try adding sources in the Research Hub.')
      }
    } catch {
      setAiResponse('Search unavailable. Ensure the API service is running.')
    } finally {
      setAiProcessing(false)
    }
  }

  return (
    <div className="tetrel-glass p-4 rounded-2xl border border-white/10 bg-slate-900/30">
      <form onSubmit={handleRunAiCommand} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={aiCommand}
            onChange={(e) => setAiCommand(e.target.value)}
            placeholder="Ask anything — search sources, query pipeline, switch mindset, run compliance checks..."
            className="pl-11 bg-slate-950/80 border-white/10 text-xs font-mono h-10 rounded-xl"
          />
        </div>
        <Button
          type="submit"
          disabled={aiProcessing}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase h-10 px-4 rounded-xl shrink-0"
        >
          {aiProcessing ? 'Processing...' : 'Run Query'}
        </Button>
      </form>

      {aiResponse && (
        <div className="mt-3 p-3 bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 rounded-xl font-mono text-xs flex gap-2 items-start animate-in fade-in duration-300">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
          <div>
            <span className="font-bold text-cyan-200">AI Co-pilot:</span> {aiResponse}
          </div>
        </div>
      )}
    </div>
  )
}
