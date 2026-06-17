'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, FileText, ChevronRight, Sparkles, AlertCircle, Database, CheckCircle2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ResearchDashboardProps {
  sourceId: string
  content: string
  onReferenceClick: (type: string, id: string) => void
}

export function ResearchDashboard({ sourceId, content, onReferenceClick }: ResearchDashboardProps) {
  const [activeTab, setActiveTab] = useState('summary')

  // Parse key metrics from the content if possible (otherwise show default placeholders)
  const engine = content.includes('Engine: Local') ? 'Local Database' : 'Hybrid Search'
  
  // Extract clean text (removing the analysis details section at the end if it exists)
  const cleanContent = content.split('---')[0].trim()

  return (
    <Card className="bg-card/40 border-border/50 backdrop-blur-md shadow-2xl overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-cyan-950/20 my-4">
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-cyan-950/10 via-background/20 to-violet-950/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-cyan-300">
            <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 shadow-inner">
              <Search className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            Deep Research Agent Output
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-cyan-950/30 text-cyan-400 border-cyan-500/20 text-[10px] uppercase font-bold tracking-wider">
              {engine}
            </Badge>
            <Badge variant="outline" className="bg-emerald-950/30 text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Compiled
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Research Metrics Section */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/20 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sources Polled</span>
            <span className="text-xl font-bold text-cyan-400 mt-1 flex items-baseline gap-1">
              25+ <span className="text-[10px] font-normal text-muted-foreground">docs</span>
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/20 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Analysis Mode</span>
            <span className="text-sm font-bold text-violet-400 mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> High Precision
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/20 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Reranker</span>
            <span className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <Database className="w-3.5 h-3.5" /> Activated
            </span>
          </div>
        </div>

        {/* Tabs for detailed content vs short summary */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 bg-muted/50 border border-border/30 rounded-lg p-1">
            <TabsTrigger value="summary" className="text-xs font-semibold data-[state=active]:bg-card/80 data-[state=active]:text-cyan-300">
              Findings Preview
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-xs font-semibold data-[state=active]:bg-card/80 data-[state=active]:text-cyan-300">
              Raw Output Log
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="mt-3">
            <div className="max-h-[220px] overflow-y-auto pr-1 text-sm leading-relaxed text-foreground/90 border border-border/10 rounded-lg p-3 bg-muted/10">
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {cleanContent}
                </ReactMarkdown>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="raw" className="mt-3">
            <div className="max-h-[220px] overflow-y-auto pr-1 text-[11px] font-mono leading-relaxed text-muted-foreground border border-border/10 rounded-lg p-3 bg-muted/20 whitespace-pre-wrap">
              {content}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Row */}
        <div className="flex items-center justify-between border-t border-border/30 pt-3 mt-1">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
            Source automatically added to canvas
          </span>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onReferenceClick('source', sourceId)}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 gap-1.5 group cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Open Full Research Report
            <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
