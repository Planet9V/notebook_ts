'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { searchApi } from '@/lib/api/search'
import { CompareRequest, CompareResponse, SearchResult } from '@/lib/types/search'
import { Loader2, ArrowUp, ArrowDown, Minus, Search, Zap, Clock, ShieldAlert } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'

export function RerankerSandbox() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(10)
  const [hasCompared, setHasCompared] = useState(false)

  const compareMutation = useMutation({
    mutationFn: async (params: CompareRequest) => {
      return searchApi.compare(params)
    },
    onSuccess: () => {
      setHasCompared(true)
    }
  })

  const handleCompare = () => {
    if (!query.trim()) return
    compareMutation.mutate({
      query: query.trim(),
      limit: limit
    })
  }

  const renderRankShift = (item: SearchResult, newIndex: number) => {
    if (item.original_index === undefined) return null
    const shift = item.original_index - newIndex
    if (shift > 0) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 flex items-center">
          <ArrowUp className="h-3 w-3" />
          <span>+{shift}</span>
        </Badge>
      )
    } else if (shift < 0) {
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 gap-1 flex items-center">
          <ArrowDown className="h-3 w-3" />
          <span>{shift}</span>
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent gap-1 flex items-center">
          <Minus className="h-3 w-3" />
          <span>0</span>
        </Badge>
      )
    }
  }

  const data = compareMutation.data

  return (
    <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-500" />
          <span>{t('advanced.rerankerSandbox') || 'Reranker AI Sandbox'}</span>
        </CardTitle>
        <CardDescription>
          {t('advanced.rerankerSandboxDesc') || 'Compare raw vector search results against LLM-reranked relevance scores side-by-side to audit retrieval quality.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search controls */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="compare-query">{t('advanced.sandbox.query') || 'Search Query'}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="compare-query"
                  placeholder={t('advanced.sandbox.queryPlaceholder') || 'Enter a test prompt or contract requirement...'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
                  className="pl-9 h-10"
                />
              </div>
            </div>

            <div className="w-full md:w-48 space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="compare-limit">{t('advanced.sandbox.limit') || 'Result Limit'}</Label>
                <span className="text-xs font-semibold text-muted-foreground">{limit}</span>
              </div>
              <div className="pt-2">
                <Slider
                  min={3}
                  max={30}
                  step={1}
                  value={[limit]}
                  onValueChange={(val) => setLimit(val[0])}
                />
              </div>
            </div>

            <Button
              onClick={handleCompare}
              disabled={compareMutation.isPending || !query.trim()}
              className="h-10 px-6 gap-2 w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md active:scale-95"
            >
              {compareMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('advanced.sandbox.comparing') || 'Analyzing...'}</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>{t('advanced.sandbox.compareBtn') || 'Compare'}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error message */}
        {compareMutation.isError && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-rose-500">{t('advanced.sandbox.errorTitle') || 'Comparison Failed'}</h4>
              <p className="text-sm text-rose-500/80">
                {(compareMutation.error as Error)?.message || 'An error occurred while generating embedding or scoring.'}
              </p>
            </div>
          </div>
        )}

        {/* Results section */}
        {compareMutation.isPending && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-muted-foreground animate-pulse">
              {t('advanced.sandbox.loadingText') || 'Running search pipelines and invoking LLM relevance ranker...'}
            </p>
          </div>
        )}

        {hasCompared && data && !compareMutation.isPending && (
          <div className="space-y-6">
            {/* Latency and Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Raw Latency */}
              <Card className="bg-muted/30 border border-border/20">
                <CardContent className="pt-6 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      <span>{t('advanced.sandbox.rawLatency') || 'Raw Vector Latency'}</span>
                    </p>
                    <p className="text-3xl font-extrabold text-foreground">
                      {data.raw_latency_ms.toFixed(1)} <span className="text-sm font-medium">ms</span>
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 font-mono">
                    Baseline
                  </Badge>
                </CardContent>
              </Card>

              {/* Reranked Latency */}
              <Card className="bg-muted/30 border border-border/20">
                <CardContent className="pt-6 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4 text-indigo-500" />
                      <span>{t('advanced.sandbox.rerankedLatency') || 'Reranked Latency'}</span>
                    </p>
                    <p className="text-3xl font-extrabold text-foreground">
                      {data.reranked_latency_ms.toFixed(1)} <span className="text-sm font-medium">ms</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono mb-1 inline-block">
                      +{((data.reranked_latency_ms - data.raw_latency_ms)).toFixed(1)}ms
                    </Badge>
                    <p className="text-[10px] text-muted-foreground">
                      {data.raw_latency_ms > 0
                        ? `${(data.reranked_latency_ms / data.raw_latency_ms).toFixed(1)}x slower`
                        : 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Side-by-side Table / Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Raw Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="text-muted-foreground font-mono">01.</span>
                    <span>{t('advanced.sandbox.rawResults') || 'Raw Vector Results'}</span>
                  </h3>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    {data.raw_results.length} {t('advanced.sandbox.items') || 'items'}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {data.raw_results.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      {t('advanced.sandbox.noResults') || 'No matching items retrieved.'}
                    </p>
                  ) : (
                    data.raw_results.map((item, idx) => (
                      <div
                        key={`raw-${item.id}-${idx}`}
                        className="p-3 rounded-lg border border-border/30 bg-background/50 hover:bg-background/80 transition-all space-y-2 group"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold font-mono text-muted-foreground/60 mt-0.5">
                            #{idx + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-foreground/90 flex-1 line-clamp-1">
                            {item.title}
                          </h4>
                          <Badge variant="outline" className="font-mono text-[10px] whitespace-nowrap bg-muted/20">
                            Score: {((item.score ?? item.similarity ?? item.final_score ?? 0)).toFixed(3)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.content || (item.matches && item.matches[0]) || 'No snippet preview.'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
                          <span className="px-1.5 py-0.5 rounded bg-muted/40 uppercase tracking-wider text-[9px]">
                            {item.type || item.source_type || 'Snippet'}
                          </span>
                          <span>•</span>
                          <span>{item.source_origin || 'Local KB'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reranked Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-400">
                    <span className="text-indigo-400/60 font-mono">02.</span>
                    <span>{t('advanced.sandbox.rerankedResults') || 'Reranked Relevance'}</span>
                  </h3>
                  <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                    {data.reranked_results.length} {t('advanced.sandbox.items') || 'items'}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {data.reranked_results.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      {t('advanced.sandbox.noResults') || 'No matching items reranked.'}
                    </p>
                  ) : (
                    data.reranked_results.map((item, idx) => (
                      <div
                        key={`reranked-${item.id}-${idx}`}
                        className="p-3 rounded-lg border border-indigo-500/20 bg-background/50 hover:bg-background/80 hover:border-indigo-500/40 transition-all space-y-2 group relative overflow-hidden"
                      >
                        {/* Glow effect on hover */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 pointer-events-none rounded-full" />

                        <div className="flex justify-between items-start gap-2 relative">
                          <span className="text-xs font-bold font-mono text-indigo-400/80 mt-0.5">
                            #{idx + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-foreground/90 flex-1 line-clamp-1">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            {renderRankShift(item, idx)}
                            <Badge className="font-mono text-[10px] whitespace-nowrap bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                              Relevance: {((item.score ?? item.relevance ?? 0)).toFixed(3)}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.content || (item.matches && item.matches[0]) || 'No snippet preview.'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 relative">
                          <span className="px-1.5 py-0.5 rounded bg-muted/40 uppercase tracking-wider text-[9px]">
                            {item.type || item.source_type || 'Snippet'}
                          </span>
                          <span>•</span>
                          <span>{item.source_origin || 'Local KB'}</span>
                          {item.original_index !== undefined && (
                            <>
                              <span>•</span>
                              <span className="text-muted-foreground/60">
                                Original Position: #{item.original_index + 1}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
