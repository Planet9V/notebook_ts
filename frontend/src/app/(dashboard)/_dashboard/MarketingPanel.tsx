'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Mic, Volume2, Sparkles, Send } from 'lucide-react'
import { useVoiceRegistry } from '@/lib/hooks/use-voice-registry'

interface MarketingPanelProps {
  marketingAudioScript: string
  setMarketingAudioScript: (val: string) => void
  selectedMarketingVoiceId: string
  setSelectedMarketingVoiceId: (id: string) => void
  isGeneratingAudio: boolean
  isAudioGenerated: boolean
  marketingAudioUrl: string | null
  onGenerateAudio: () => void
  marketingPosts: any[]
  showPostGenerator: boolean
  setShowPostGenerator: (show: boolean) => void
  marketingPlatform: 'LinkedIn' | 'X/Twitter' | 'Blog'
  setMarketingPlatform: (platform: 'LinkedIn' | 'X/Twitter' | 'Blog') => void
  marketingSourceText: string
  setMarketingSourceText: (text: string) => void
  generatedPost: string
  isGeneratingPost: boolean
  onGeneratePostText: () => void
  onAddCampaign: () => void
}

export function MarketingPanel({
  marketingAudioScript,
  setMarketingAudioScript,
  selectedMarketingVoiceId,
  setSelectedMarketingVoiceId,
  isGeneratingAudio,
  isAudioGenerated,
  marketingAudioUrl,
  onGenerateAudio,
  marketingPosts,
  showPostGenerator,
  setShowPostGenerator,
  marketingPlatform,
  setMarketingPlatform,
  marketingSourceText,
  setMarketingSourceText,
  generatedPost,
  isGeneratingPost,
  onGeneratePostText,
  onAddCampaign,
}: MarketingPanelProps) {
  const { data: voiceRegistry } = useVoiceRegistry()
  const voicesList = (voiceRegistry as any)?.voices ?? [
    { voice_id: 'am_adam', name: 'Adam (Male)' },
    { voice_id: 'af_bella', name: 'Bella (Female)' },
    { voice_id: 'am_michael', name: 'Michael (Male)' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
      {/* Voice & Audio Studio */}
      <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Mic className="h-4 w-4" /> Kokoro TTS Audio Studio
            </span>
            <Badge className="bg-cyan-500/10 text-cyan-400 text-[9px] border-cyan-500/20 font-mono">
              Kokoro FastAPI
            </Badge>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-[9.5px] text-slate-400 uppercase tracking-wider block">Select Voice Profile</label>
              <Select value={selectedMarketingVoiceId} onValueChange={setSelectedMarketingVoiceId}>
                <SelectTrigger className="bg-slate-950/80 border-white/10 text-xs h-9 rounded-xl">
                  <SelectValue placeholder="Select TTS Voice" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-100">
                  {voicesList.map((v: any) => (
                    <SelectItem key={v.voice_id} value={v.voice_id} className="text-xs font-mono">
                      {v.name || v.voice_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[9.5px] text-slate-400 uppercase tracking-wider block">Audio Script (With Emotion Cues)</label>
                <div className="flex gap-1 text-[8.5px] font-mono">
                  {['[excited]', '[whisper]', '[thoughtful]', '[laugh]'].map((cue) => (
                    <button
                      key={cue}
                      type="button"
                      onClick={() => setMarketingAudioScript(marketingAudioScript + ` ${cue} `)}
                      className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 text-[8px]"
                    >
                      {cue}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                value={marketingAudioScript}
                onChange={(e) => setMarketingAudioScript(e.target.value)}
                placeholder="Enter script text... Use cues like [excited] or [whisper] to direct emotion!"
                className="bg-slate-950/80 border-white/10 text-xs font-mono min-h-[90px] rounded-xl"
              />
            </div>

            {/* Mastering Controls */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[9px] font-mono text-slate-400">
              <div>
                <label className="text-[8.5px] uppercase block text-slate-500 mb-0.5">Export Format</label>
                <select className="w-full bg-slate-950 border border-white/10 rounded-lg p-1 text-slate-200">
                  <option value="mp3">MP3 (192k Streaming)</option>
                  <option value="m4a">M4A (256k Apple)</option>
                  <option value="wav">WAV (24-bit Studio)</option>
                  <option value="flac">FLAC (Lossless)</option>
                  <option value="ogg">OGG (Web Opus)</option>
                </select>
              </div>
              <div>
                <label className="text-[8.5px] uppercase block text-slate-500 mb-0.5">Mastering Standard</label>
                <select className="w-full bg-slate-950 border border-white/10 rounded-lg p-1 text-slate-200">
                  <option value="-16">-16 LUFS (Podcast EBU R128)</option>
                  <option value="-14">-14 LUFS (Web Streaming)</option>
                </select>
              </div>
            </div>

            <Button
              onClick={onGenerateAudio}
              disabled={isGeneratingAudio}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase h-9 rounded-xl"
            >
              {isGeneratingAudio ? 'Synthesizing & Mastering...' : 'Generate Mastered Audio'}
            </Button>

            {isAudioGenerated && marketingAudioUrl && (
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] text-cyan-300 font-bold flex items-center gap-1.5">
                    <Volume2 className="h-4 w-4" /> Mastered Output (-16 LUFS):
                  </span>
                  <a
                    href={marketingAudioUrl}
                    download="mastered_podcast_clip.mp3"
                    className="text-[9px] text-cyan-400 hover:underline font-mono font-bold"
                  >
                    Download Mastered Audio →
                  </a>
                </div>
                <audio controls src={marketingAudioUrl} className="w-full h-8" />
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl text-[9.5px] font-mono flex items-center justify-between text-slate-400">
          <span>Mastering Pipeline:</span>
          <span className="text-cyan-400 font-bold">EQ + LUFS + Panning Active</span>
        </div>
      </Card>

      {/* Marketing Queue & Generator */}
      <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Content Generator & Schedule
            </span>
            <Button
              size="sm"
              onClick={() => setShowPostGenerator(!showPostGenerator)}
              className="h-6 px-2 text-[8.5px] font-mono uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 rounded-md"
            >
              {showPostGenerator ? 'View Queue' : '+ Generate Post'}
            </Button>
          </div>

          {showPostGenerator ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex gap-2">
                {(['LinkedIn', 'X/Twitter', 'Blog'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setMarketingPlatform(p)}
                    className={`text-[9px] uppercase px-2.5 py-1 rounded-lg border ${
                      marketingPlatform === p
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'border-white/5 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Textarea
                value={marketingSourceText}
                onChange={(e) => setMarketingSourceText(e.target.value)}
                placeholder="Paste source context or research notes..."
                className="bg-slate-950/80 border-white/10 text-xs min-h-[70px] rounded-xl"
              />

              <Button
                onClick={onGeneratePostText}
                disabled={isGeneratingPost}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs uppercase h-8 rounded-xl"
              >
                {isGeneratingPost ? 'Transforming with AI...' : 'Generate Transformation'}
              </Button>

              {generatedPost && (
                <div className="p-3 bg-slate-950/80 border border-cyan-500/20 rounded-xl space-y-2 text-xs font-mono">
                  <p className="text-slate-200 line-clamp-3">{generatedPost}</p>
                  <Button
                    onClick={onAddCampaign}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[10px] uppercase h-7 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> Add to Schedule Queue
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {marketingPosts.length === 0 ? (
                <div className="text-[10px] font-mono text-slate-500 py-12 text-center border border-dashed border-white/5 rounded-xl">
                  No publication posts or scheduled podcasts in queue. Click "+ Generate Post" to create one.
                </div>
              ) : (
                marketingPosts.map((post: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 flex items-center justify-between font-mono text-xs">
                    <div className="space-y-0.5 truncate max-w-[200px]">
                      <span className="font-bold text-slate-200 block truncate">{post.title || 'Untitled Post'}</span>
                      <span className="text-[9.5px] text-slate-400 block">{post.platform || 'Post'}</span>
                    </div>
                    <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[8.5px]">
                      {post.status || 'Queued'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 rounded-xl text-[10px] font-mono flex items-center justify-between">
          <span>Marketing Queue Items:</span>
          <span className="font-bold text-cyan-400">{marketingPosts.length} Total</span>
        </div>
      </Card>
    </div>
  )
}
