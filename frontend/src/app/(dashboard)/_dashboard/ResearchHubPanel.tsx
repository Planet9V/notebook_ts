'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Folder, Sparkles } from 'lucide-react'

interface ResearchHubPanelProps {
  researchSearchQuery: string
  setResearchSearchQuery: (val: string) => void
  researchSearchType: 'vector' | 'hybrid'
  setResearchSearchType: (type: 'vector' | 'hybrid') => void
  researchSearchResults: any[]
  onRunSearch: () => void
  globalSources: any[]
  rmemStats: any
}

export function ResearchHubPanel({
  researchSearchQuery,
  setResearchSearchQuery,
  researchSearchType,
  setResearchSearchType,
  researchSearchResults,
  onRunSearch,
  globalSources,
  rmemStats,
}: ResearchHubPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
      {/* Search & RRF Vector Query */}
      <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Search className="h-4 w-4" /> Vector & RRF Hybrid Search
            </span>
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-white/5">
              {(['vector', 'hybrid'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setResearchSearchType(t)}
                  className={`text-[8.5px] font-mono uppercase px-2 py-0.5 rounded ${
                    researchSearchType === t ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={researchSearchQuery}
              onChange={(e) => setResearchSearchQuery(e.target.value)}
              placeholder="Search vector database across documents & notes..."
              className="bg-slate-950/80 border-white/10 text-xs font-mono h-9 rounded-xl flex-1"
            />
            <Button
              onClick={onRunSearch}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[10px] uppercase h-9 px-3 rounded-xl"
            >
              Search
            </Button>
          </div>

          {/* Results list */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {researchSearchResults.length === 0 ? (
              <div className="text-[10px] font-mono text-slate-500 py-8 text-center border border-dashed border-white/5 rounded-xl">
                Enter a query above to run vector similarity search across all ingested sources.
              </div>
            ) : (
              researchSearchResults.map((r, idx) => (
                <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-1 font-mono text-xs">
                  <div className="flex justify-between items-center text-[9.5px]">
                    <span className="text-cyan-400 font-bold truncate max-w-[200px]">{r.source || 'Document Chunk'}</span>
                    <Badge className="bg-cyan-500/10 text-cyan-400 text-[8.5px] border-cyan-500/20">
                      Score: {r.score}
                    </Badge>
                  </div>
                  <p className="text-[10.5px] text-slate-300 line-clamp-2">{r.text}</p>
                  {r.id && (
                    <div className="pt-1 flex justify-end">
                      <a href={`/sources?id=${encodeURIComponent(r.id)}`} className="text-[9px] text-cyan-400 hover:underline flex items-center gap-1 font-bold">
                        Open Source Document →
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Research Memory Stats */}
        <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl text-[9.5px] font-mono flex items-center justify-between text-slate-400">
          <span>pgvector Research Memory:</span>
          <span className="text-cyan-400 font-bold">
            {rmemStats?.total_records ?? 0} vectors indexed
          </span>
        </div>
      </Card>

      {/* Global Sources Tree View */}
      <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Folder className="h-4 w-4" /> Global Sources Repository
            </span>
            <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">
              {globalSources.length} Sources
            </Badge>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {globalSources.length === 0 ? (
              <div className="text-[10px] font-mono text-slate-500 py-12 text-center border border-dashed border-white/5 rounded-xl">
                No sources ingested yet. Upload documents or web pages in the Sources page.
              </div>
            ) : (
              globalSources.map((src: any) => (
                <div key={src.id} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
                  <div className="space-y-0.5 truncate max-w-[200px]">
                    <span className="font-bold text-slate-200 block truncate">{src.title || src.name || 'Untitled Source'}</span>
                    <span className="text-[9.5px] text-slate-400 block truncate">{src.source_type || 'URL/Document'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[8.5px]">
                      {src.status || 'Indexed'}
                    </Badge>
                    <a href={`/sources?id=${encodeURIComponent(src.id)}`} className="text-[9px] text-cyan-400 hover:underline font-bold">
                      View →
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 rounded-xl text-[10px] font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> RRF Hybrid Fusion:
          </span>
          <span className="font-bold text-cyan-400">SurrealDB + pgvector</span>
        </div>
      </Card>
    </div>
  )
}
