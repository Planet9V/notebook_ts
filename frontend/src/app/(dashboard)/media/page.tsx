'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mic, 
  FlaskConical,
  Video
} from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'

// Named imports for embedded components
import PodcastsPage from '@/app/(dashboard)/podcasts/page'
import VoicePlaygroundPage from '@/app/(dashboard)/voice-playground/page'

function MediaWorkspaceContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tab = searchParams?.get('tab') || 'podcasts'
  const activeTab = ['podcasts', 'voice-playground'].includes(tab)
    ? tab
    : 'podcasts'

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', val)
    router.replace(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    document.title = 'Media Creation Workspace | Tetrel'
  }, [])

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background text-foreground">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Mic className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold tracking-tight uppercase font-mono">
                  Media Creation Workspace
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                Unified workspace for automated audio generation, podcast creation, and real-time voice testing pipelines
              </p>
            </div>
          </div>

          {/* Workspace Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select Media Tool</p>
              <TabsList className="w-full max-w-md grid grid-cols-2 bg-slate-900/60 p-1 border border-white/5 rounded-xl">
                <TabsTrigger value="podcasts" className="flex items-center justify-center gap-2 py-2">
                  <Video className="h-4 w-4" />
                  <span>Podcast Builder</span>
                </TabsTrigger>
                <TabsTrigger value="voice-playground" className="flex items-center justify-center gap-2 py-2">
                  <FlaskConical className="h-4 w-4" />
                  <span>Voice Lab Sandbox</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Panels */}
            <TabsContent value="podcasts" className="mt-0 outline-none">
              <PodcastsPage embedded={true} />
            </TabsContent>
            <TabsContent value="voice-playground" className="mt-0 outline-none">
              <VoicePlaygroundPage embedded={true} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  )
}

export default function MediaPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <Mic className="h-8 w-8 text-cyan-400 animate-pulse" />
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Loading Media Workspace...</p>
        </div>
      </div>
    }>
      <MediaWorkspaceContent />
    </Suspense>
  )
}
