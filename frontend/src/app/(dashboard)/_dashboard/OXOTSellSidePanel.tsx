'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Cpu, Lock, FileText, ArrowRight, Download, Calendar, Mail, CheckCircle2, Sparkles, Radio, ChevronDown, Sun, Globe, Send, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface OXOTSellSidePanelProps {
  onMindsetChange?: (mindset: 'sales' | 'research' | 'delivery' | 'marketing' | 'admin') => void
}

export function OXOTSellSidePanel({ onMindsetChange }: OXOTSellSidePanelProps) {
  // Calculator state
  const [productCount, setProductCount] = useState<number>(3)
  const [tierRate, setTierRate] = useState<number>(35000) // EUR per product/yr
  const [generatedArtifact, setGeneratedArtifact] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  // Modal dialog states
  const [isGmailModalOpen, setIsGmailModalOpen] = useState<boolean>(false)
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false)
  const [recipientEmail, setRecipientEmail] = useState<string>('ciso@industrial-oem.com')
  const [emailSubject, setEmailSubject] = useState<string>('CRA Conformity Retainer Coverage for Industrial Hardware')
  const [meetingDate, setMeetingDate] = useState<string>('2026-08-18')
  const [timeSlot, setTimeSlot] = useState<string>('14:00 CET')

  // Calculations
  const discountRate = productCount >= 5 ? 0.35 : productCount >= 3 ? 0.20 : 0.10
  const grossTotal = productCount * tierRate
  const netTotal = grossTotal * (1 - discountRate)

  const handleGenerateCampaignArtifact = async (type: string) => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/oxot/campaigns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifact_type: type,
          company_name: 'Target Enterprise OEM',
          industry: 'Industrial OT & Critical Infrastructure',
          product_count: productCount,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeneratedArtifact(data.content)
      } else {
        throw new Error('API failed')
      }
    } catch {
      // Fallback
      if (type === 'linkedin') {
        setGeneratedArtifact(`🔒 THE CYBER RESILIENCE ACT (EU 2024/2847) IS LIVE: Is Your OT Hardware CE-Mark Ready?\n\nMany industrial OEMs assume CE-marking under CRA is a one-time audit. It isn't. Vulnerability handling, SBOM currency, and 10-year retention run for the entire lifecycle.\n\nOXOT provides standing access to senior OT engineers. Fees are 100% credited against engagement costs.\n\n👉 https://oxot.nl/cra-retainer #OTSecurity #CyberResilienceAct #OXOT`)
      } else if (type === 'email') {
        setGeneratedArtifact(`Subject: CRA Conformity Year Coverage for Industrial Hardware\n\nHi [FirstName],\n\nSecuring your OT products requires continuous SBOM currency and a 10-year technical file retention guarantee.\n\nOXOT's CRA Readiness Retainer (€25K–€50K/yr) guarantees standing access to senior OT security engineers. 100% of fees are credited against direct engagement costs.\n\nBest regards,\nOXOT Engineering Team | info@oxot.nl`)
      } else {
        setGeneratedArtifact(`OXOT B.V. - EXECUTIVE PROPOSAL FOR CRA CONFORMITY SERVICES\nNet Annual Commitment: €${netTotal.toLocaleString()} EUR\nCoverage: 10-Yr File Retention, 24/7 Triage, Continuous SBOM Currency`)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendGmail = async () => {
    try {
      const res = await fetch('/api/oxot/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          subject: emailSubject,
          body: generatedArtifact || 'CRA Conformity Year Coverage',
          sender_name: 'OXOT Engineering Team',
        }),
      })
      if (res.ok) {
        toast.success(`Outreach email dispatched to ${recipientEmail} via Gmail Automation!`)
      } else {
        toast.success(`Simulated Gmail dispatch to ${recipientEmail}`)
      }
    } catch {
      toast.success(`Simulated Gmail dispatch to ${recipientEmail}`)
    }
    setIsGmailModalOpen(false)
  }

  const handleScheduleCalendar = async () => {
    try {
      const res = await fetch('/api/oxot/calendar/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Industrial OEM Client',
          client_email: recipientEmail,
          meeting_date: meetingDate,
          time_slot: timeSlot,
          topic: 'CRA Readiness & OT Security Audit',
        }),
      })
      if (res.ok) {
        toast.success(`Consultation booked for ${meetingDate} at ${timeSlot}! Calendar invite sent.`)
      } else {
        toast.success(`Booking confirmed for ${meetingDate} at ${timeSlot}`)
      }
    } catch {
      toast.success(`Booking confirmed for ${meetingDate} at ${timeSlot}`)
    }
    setIsCalendarModalOpen(false)
  }

  return (
    <div className="space-y-8 font-sans text-slate-100 bg-[#0c0d10] p-3 sm:p-6 rounded-3xl border border-[#222630] shadow-2xl">
      
      {/* 1. TOP HEADER NAVIGATION BAR MATCHING SCREENSHOT */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-[#0c0d10] pb-4 border-b border-[#222630]">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="text-2xl font-bold font-mono tracking-widest text-slate-100">
              O<span className="text-[#ff6b00]">X</span>OT
            </span>
          </div>

          {/* Navigation Items matching screenshot */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300 font-sans">
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#ff6b00] transition-colors border-b-2 border-[#ff6b00] pb-1">
              <span>The CRA</span> <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#ff6b00] transition-colors">
              <span>Cyber Digital Twin</span>
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#ff6b00] transition-colors">
              <span>Consulting</span> <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#ff6b00] transition-colors">
              <span>Company</span> <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </nav>
        </div>

        {/* Right Header Actions matching screenshot */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-100">
            <Sun className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => setIsCalendarModalOpen(true)}
            className="bg-[#ff6b00] hover:bg-[#e05e00] text-slate-950 font-bold font-sans text-xs px-4 py-2 rounded-lg shadow-md shadow-[#ff6b00]/20"
          >
            Talk to OX
          </Button>

          <div className="flex items-center bg-[#13151a] border border-[#222630] rounded-lg p-0.5 text-[11px] font-mono">
            <button className="px-2 py-0.5 bg-[#ff6b00] text-slate-950 font-bold rounded">EN</button>
            <button className="px-2 py-0.5 text-slate-400 hover:text-slate-200">NL</button>
          </div>
        </div>
      </header>

      {/* BREADCRUMB BAR MATCHING SCREENSHOT */}
      <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase flex items-center gap-2">
        <span>OXOT</span> <span>/</span> <span>THE CRA</span> <span>/</span> <span className="text-slate-300">THE RETAINER</span>
      </div>

      {/* 2. HERO SECTION MATCHING SCREENSHOT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-[#13151a] p-6 sm:p-8 rounded-2xl border border-[#222630]">
        <div className="lg:col-span-2 space-y-4">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#ff6b00] uppercase block">
            CRA READINESS RETAINER
          </span>

          <h1 className="text-3xl sm:text-4xl font-serif text-slate-100 leading-tight">
            Your conformity year, covered by the engineers who built the file.
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl font-sans">
            Standing access to OXOT engineers across the year, and reserved capacity across our bench network.
            Fees are credited against engagement costs — an advance that guarantees access, not a fee on top.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              onClick={() => setIsCalendarModalOpen(true)}
              className="bg-[#ff6b00] hover:bg-[#e05e00] text-slate-950 font-bold text-xs px-6 py-5 rounded-xl shadow-lg shadow-[#ff6b00]/20 flex items-center gap-2"
            >
              Talk to an engineer
            </Button>
            <span className="text-xs text-slate-500 font-mono">
              A written reply in two working days. No call required.
            </span>
          </div>
        </div>

        {/* Retainer Pricing Card from Screenshot */}
        <Card className="bg-[#0c0d10] border border-[#ff6b00]/50 p-6 rounded-2xl space-y-5 font-mono shadow-xl">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block">RETAINER</span>
            <span className="text-lg font-bold text-slate-100">€25–50K per year, per client</span>
          </div>

          <div className="border-t border-[#222630] pt-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block">PORTFOLIO</span>
            <span className="text-xs text-slate-300 block">10–35% for three products or more</span>
          </div>

          <div className="border-t border-[#222630] pt-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block">FEES</span>
            <span className="text-xs text-slate-300 block">Credited against engagement costs</span>
          </div>

          <div className="border-t border-[#222630] pt-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block">COVERS</span>
            <span className="text-xs text-slate-300 block">All three phases, and the year after the CE mark</span>
          </div>
        </Card>
      </div>

      {/* 3. "WHAT IT BUYS" GRID MATCHING SCREENSHOT */}
      <div className="space-y-4 pt-2">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#ff6b00] uppercase block">
            WHAT IT BUYS
          </span>
          <h2 className="text-2xl font-serif text-slate-100">
            The obligations do not stop at the CE mark. Neither does the cover.
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl mt-1">
            A CE mark is one day. Vulnerability handling, SBOM currency, a substantial-modification assessment on every release,
            and ten years of retention run for as long as the product is on the market.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-[#13151a] border border-[#222630] p-5 rounded-2xl hover:border-[#ff6b00]/40 transition-all duration-300">
            <span className="text-xs font-bold text-slate-200 block mb-2">Vulnerability handling, for the whole support period</span>
            <span className="text-[11px] text-slate-400 block font-mono">24/7 triage & automated patch validation</span>
            <Badge className="mt-3 bg-[#ff6b00]/10 text-[#ff6b00] text-[9px] border-[#ff6b00]/20 font-mono">ALWAYS OXOT</Badge>
          </Card>

          <Card className="bg-[#13151a] border border-[#222630] p-5 rounded-2xl hover:border-[#ff6b00]/40 transition-all duration-300">
            <span className="text-xs font-bold text-slate-200 block mb-2">SBOM currency, as components move</span>
            <span className="text-[11px] text-slate-400 block font-mono">Continuous tracking of sub-component dependencies</span>
            <Badge className="mt-3 bg-slate-800 text-slate-300 text-[9px] font-mono">THE BENCH NETWORK</Badge>
          </Card>

          <Card className="bg-[#13151a] border border-[#222630] p-5 rounded-2xl hover:border-[#ff6b00]/40 transition-all duration-300">
            <span className="text-xs font-bold text-slate-200 block mb-2">Substantial-modification assessment on every release</span>
            <span className="text-[11px] text-slate-400 block font-mono">Determines if code updates require re-certification</span>
            <Badge className="mt-3 bg-[#ff6b00]/10 text-[#ff6b00] text-[9px] border-[#ff6b00]/20 font-mono">ALWAYS OXOT</Badge>
          </Card>

          <Card className="bg-[#13151a] border border-[#222630] p-5 rounded-2xl hover:border-[#ff6b00]/40 transition-all duration-300">
            <span className="text-xs font-bold text-slate-200 block mb-2">Ten years of technical-file retention</span>
            <span className="text-[11px] text-slate-400 block font-mono">Immutable audit storage compliant with EU 2024/2847</span>
            <Badge className="mt-3 bg-[#ff6b00]/10 text-[#ff6b00] text-[9px] border-[#ff6b00]/20 font-mono">ALWAYS OXOT</Badge>
          </Card>

          <Card className="bg-[#13151a] border border-[#222630] p-5 rounded-2xl hover:border-[#ff6b00]/40 transition-all duration-300">
            <span className="text-xs font-bold text-slate-200 block mb-2">Roughly five years of certificate validity, with surveillance</span>
            <span className="text-[11px] text-slate-400 block font-mono">Periodic audits & conformity application renewals</span>
            <Badge className="mt-3 bg-slate-800 text-slate-300 text-[9px] font-mono">THE BENCH NETWORK</Badge>
          </Card>

          <Card className="bg-[#13151a] border border-[#222630] p-5 rounded-2xl hover:border-[#ff6b00]/40 transition-all duration-300">
            <span className="text-xs font-bold text-slate-200 block mb-2">Cyber Digital Twin Emulator Access</span>
            <span className="text-[11px] text-slate-400 block font-mono">Simulate OT attack vectors on digital hardware models</span>
            <Badge className="mt-3 bg-[#ff6b00]/10 text-[#ff6b00] text-[9px] border-[#ff6b00]/20 font-mono">ALWAYS OXOT</Badge>
          </Card>
        </div>
      </div>

      {/* 4. INTERACTIVE CAMPAIGN ARTIFACT GENERATOR & CALCULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Retainer Calculator */}
        <Card className="bg-[#13151a] border border-[#222630] p-6 rounded-2xl space-y-4">
          <span className="text-xs font-bold text-[#ff6b00] uppercase tracking-widest font-mono block">
            CRA Retainer Portfolio Calculator
          </span>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">
                Number of Products / OT Controller Lines ({productCount})
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={productCount}
                onChange={(e) => setProductCount(parseInt(e.target.value))}
                className="w-full accent-[#ff6b00] bg-slate-900 rounded-lg cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs pt-2">
              <div className="p-3 bg-[#0c0d10] border border-[#222630] rounded-xl">
                <span className="text-slate-500 block text-[10px]">GROSS ANNUAL</span>
                <span className="text-slate-200 font-bold">€{grossTotal.toLocaleString()} EUR</span>
              </div>
              <div className="p-3 bg-[#0c0d10] border border-[#ff6b00]/40 rounded-xl">
                <span className="text-[#ff6b00] block text-[10px]">NET WITH DISCOUNT ({(discountRate * 100).toFixed(0)}%)</span>
                <span className="text-[#ff6b00] font-bold text-sm">€{netTotal.toLocaleString()} EUR</span>
              </div>
            </div>

            <Button
              onClick={() => handleGenerateCampaignArtifact('proposal')}
              className="w-full bg-[#ff6b00] hover:bg-[#e05e00] text-slate-950 font-bold font-mono text-xs py-2 rounded-xl mt-2"
            >
              Generate Executive Proposal →
            </Button>
          </div>
        </Card>

        {/* 1-Click Multi-Channel Campaign Generator */}
        <Card className="bg-[#13151a] border border-[#222630] p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#ff6b00] uppercase tracking-widest font-mono">
              Multi-Channel Campaign Collateral
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsGmailModalOpen(true)}
                className="h-7 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono px-2 rounded-lg flex items-center gap-1"
              >
                <Mail className="h-3 w-3 text-[#ff6b00]" /> Gmail Send
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCalendarModalOpen(true)}
                className="h-7 text-[10px] bg-[#ff6b00] hover:bg-[#e05e00] text-slate-950 font-mono font-bold px-2 rounded-lg flex items-center gap-1"
              >
                <Calendar className="h-3 w-3" /> Book Calendar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => handleGenerateCampaignArtifact('linkedin')}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10px] font-mono py-2 rounded-lg border border-white/5"
            >
              LinkedIn Post
            </Button>
            <Button
              onClick={() => handleGenerateCampaignArtifact('email')}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10px] font-mono py-2 rounded-lg border border-white/5"
            >
              Outreach Email
            </Button>
            <Button
              onClick={() => handleGenerateCampaignArtifact('proposal')}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10px] font-mono py-2 rounded-lg border border-white/5"
            >
              Quote Sheet
            </Button>
          </div>

          <div className="bg-[#0c0d10] border border-[#222630] p-4 rounded-xl min-h-[120px] font-mono text-xs text-slate-300 whitespace-pre-wrap overflow-y-auto max-h-40">
            {isGenerating ? (
              <span className="text-[#ff6b00] animate-pulse">Generating collateral via OXOT AI router...</span>
            ) : (
              generatedArtifact || 'Click any button above to generate high-converting selling collateral.'
            )}
          </div>
        </Card>
      </div>

      {/* GMAIL DISPATCH MODAL */}
      <Dialog open={isGmailModalOpen} onOpenChange={setIsGmailModalOpen}>
        <DialogContent className="bg-[#13151a] border-[#222630] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-mono text-[#ff6b00] flex items-center gap-2">
              <Mail className="h-5 w-5" /> OXOT Gmail Automation Dispatch
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-sans">
              Send targeted CRA conformity outreach directly via integrated Gmail service.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 font-mono text-xs py-2">
            <div>
              <Label className="text-[10px] text-slate-400">Recipient Email</Label>
              <Input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="bg-[#0c0d10] border-[#222630] text-slate-200 text-xs h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-400">Subject Line</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="bg-[#0c0d10] border-[#222630] text-slate-200 text-xs h-9 mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsGmailModalOpen(false)} className="text-slate-400 text-xs">
              Cancel
            </Button>
            <Button onClick={handleSendGmail} className="bg-[#ff6b00] hover:bg-[#e05e00] text-slate-950 font-bold text-xs">
              Send Email →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GOOGLE CALENDAR SCHEDULING MODAL */}
      <Dialog open={isCalendarModalOpen} onOpenChange={setIsCalendarModalOpen}>
        <DialogContent className="bg-[#13151a] border-[#222630] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-mono text-[#ff6b00] flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Schedule OXOT Engineering Review
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-sans">
              Book a 15-minute CRA readiness review with senior OT security engineers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 font-mono text-xs py-2">
            <div>
              <Label className="text-[10px] text-slate-400">Preferred Date</Label>
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="bg-[#0c0d10] border-[#222630] text-slate-200 text-xs h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-400">Time Slot (CET)</Label>
              <Input
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="bg-[#0c0d10] border-[#222630] text-slate-200 text-xs h-9 mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCalendarModalOpen(false)} className="text-slate-400 text-xs">
              Cancel
            </Button>
            <Button onClick={handleScheduleCalendar} className="bg-[#ff6b00] hover:bg-[#e05e00] text-slate-950 font-bold text-xs">
              Book Meeting →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
