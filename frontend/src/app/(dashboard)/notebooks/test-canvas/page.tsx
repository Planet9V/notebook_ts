'use client'

import React, { useState, useEffect } from 'react'
import { CSETNetworkCanvas } from '../components/CSETNetworkCanvas'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function TestCanvasPage() {
  const [verifiedChecks, setVerifiedChecks] = useState<string[]>([])

  useEffect(() => {
    document.title = 'Test Canvas | Tetrel'
  }, [])

  const handleValidationSuccess = (verified: string[]) => {
    setVerifiedChecks(verified)
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
      {/* Sandbox Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card/20 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <Link href="/notebooks">
            <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Notebooks
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-500" />
            <h1 className="text-sm font-bold text-foreground uppercase tracking-widest">CSET Network Canvas Sandbox</h1>
            <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-mono text-[9px] uppercase font-bold px-1.5">
              UI Sandbox
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground font-semibold">Verified Compliance Standards:</span>
          {verifiedChecks.length > 0 ? (
            <div className="flex gap-1.5">
              {verifiedChecks.map(id => (
                <Badge key={id} className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono text-[9px] uppercase font-bold py-0.5 px-1.5">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
                  {id}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-[9.5px] italic text-muted-foreground">None (Build a secure path L1 {"->"} L3 {"->"} L4 to verify IEC 62443)</span>
          )}
        </div>
      </div>

      {/* Main Full-Height Canvas Playground */}
      <div className="flex-1 min-h-0 relative">
        <CSETNetworkCanvas onValidationSuccess={handleValidationSuccess} />
      </div>
    </div>
  )
}
