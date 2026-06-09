'use client'

import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import {
  FlaskConical,
  Volume2,
  Mic,
  ArrowRightLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TTSPlayground } from './components/TTSPlayground'
import { STTPlayground } from './components/STTPlayground'
import { RoundTripPlayground } from './components/RoundTripPlayground'

// ── Main Page ───────────────────────────────────────────────────────

export default function VoicePlaygroundPage({ embedded = false }: { embedded?: boolean } = {}) {
  useEffect(() => {
    document.title = 'Voice Playground | Tetrel'
  }, [])


  const content = (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
            <FlaskConical className="h-7 w-7 text-violet-400" />
            Voice Lab
          </h1>
          <p className="text-muted-foreground">
            Test and experiment with text-to-speech, speech-to-text, and round-trip voice pipelines
          </p>
        </header>

        {/* Tabs */}
        <Tabs defaultValue="tts" className="space-y-6">
          <TabsList className="bg-sidebar-accent/10 border border-sidebar-border/30">
            <TabsTrigger value="tts" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <Volume2 className="h-3.5 w-3.5 mr-1.5" />
              Text-to-Speech
            </TabsTrigger>
            <TabsTrigger value="stt" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
              <Mic className="h-3.5 w-3.5 mr-1.5" />
              Speech-to-Text
            </TabsTrigger>
            <TabsTrigger value="roundtrip" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
              Round-Trip
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tts">
            <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-cyan-400" />
                  TTS Playground
                </CardTitle>
                <CardDescription>
                  Enter text, choose a voice, adjust speed, and synthesize speech
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TTSPlayground />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stt">
            <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mic className="h-5 w-5 text-violet-400" />
                  STT Playground
                </CardTitle>
                <CardDescription>
                  Record audio and transcribe it using Whisper speech recognition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <STTPlayground />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roundtrip">
            <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-amber-400" />
                  Round-Trip Test
                </CardTitle>
                <CardDescription>
                  Full pipeline: Speak → Transcribe → Re-Synthesize with a different voice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoundTripPlayground />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )

  if (embedded) {
    return content
  }

  return <AppShell>{content}</AppShell>
}
