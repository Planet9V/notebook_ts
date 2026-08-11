'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { usePublicationsCalendar } from '@/lib/hooks/use-publications'
import { RevenueDrilldownDashboard } from '@/components/dashboard/RevenueDrilldownDashboard'

interface SalesCRMPanelProps {
  onSeedCRM: () => void
  onOpenNewCustomer: () => void
  onMindsetChange: (mindset: 'sales' | 'research' | 'delivery' | 'marketing' | 'admin') => void
  onOverrideConfirm: (customerId: string, name: string) => void
}

export function SalesCRMPanel({ onSeedCRM, onOpenNewCustomer, onMindsetChange, onOverrideConfirm }: SalesCRMPanelProps) {
  const { data: customersList = [] } = useCustomers()
  const { data: notebooksList = [] } = useNotebooks()
  const { data: calendarPosts = [] } = usePublicationsCalendar()

  const totalLeads = customersList.length
  const qualifiedCount = customersList.filter((c: any) => c.status === 'active' || c.status === 'verified').length
  const getStageCount = (stage: string) => notebooksList.filter((n: any) => n.stage?.toLowerCase() === stage.toLowerCase()).length

  const propCount = getStageCount('proposal')
  const negCount = getStageCount('negotiation')
  const closedCount = getStageCount('closed')

  const leadsPct = totalLeads > 0 ? 100 : 0
  const qualifiedPct = totalLeads > 0 ? Math.round((qualifiedCount / totalLeads) * 100) : 0
  const proposalsPct = totalLeads > 0 ? Math.round((propCount / totalLeads) * 100) : 0
  const negPct = totalLeads > 0 ? Math.round((negCount / totalLeads) * 100) : 0
  const closedPct = totalLeads > 0 ? Math.round((closedCount / totalLeads) * 100) : 0

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      {/* Interactive Revenue Drill-Down Dashboard */}
      <RevenueDrilldownDashboard onMindsetChange={onMindsetChange} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Card 1: Funnel & Campaigns Linkage */}
      <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl flex flex-col justify-between p-5 min-h-[380px]">
        {customersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 p-6 h-full my-auto">
            <AlertTriangle className="h-8 w-8 text-cyan-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">CRM Database is Empty</span>
            <Button
              onClick={onSeedCRM}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[10px] uppercase h-8 px-4 rounded-lg"
            >
              Seed CRM Accounts & Deals
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> Sales Funnel & Campaigns
              </span>
              <Badge className="bg-cyan-500/10 text-cyan-400 text-[9px] border border-cyan-500/20 font-mono font-bold">
                Conversion: {totalLeads > 0 ? ((closedCount / totalLeads) * 100).toFixed(1) : '0.0'}%
              </Badge>
            </div>

            {/* Funnel Visualizer */}
            <div className="space-y-2">
              <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">CRM Conversion Funnel</label>
              <div className="space-y-2">
                {[
                  { stage: 'Leads Ingested', count: totalLeads, pct: leadsPct, color: 'bg-cyan-500/90' },
                  { stage: 'Qualified (Compliance Passed)', count: qualifiedCount, pct: qualifiedPct, color: 'bg-cyan-500/70' },
                  { stage: 'Proposals / Notebooks Sent', count: propCount, pct: proposalsPct, color: 'bg-cyan-500/50' },
                  { stage: 'Negotiation / Milestones Set', count: negCount, pct: negPct, color: 'bg-cyan-500/30' },
                  { stage: 'Closed Won (Deals Inflight)', count: closedCount, pct: closedPct, color: 'bg-emerald-500/40' },
                ].map((s, idx) => (
                  <div key={idx} className="space-y-1 font-mono text-[10px]">
                    <div className="flex justify-between text-[9px] text-slate-300">
                      <span>{s.stage} ({s.count})</span>
                      <span className="font-bold">{s.pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-950/60 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scheduled Publications */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Scheduled Publications</label>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                {calendarPosts.length === 0 ? (
                  <div className="text-[9px] font-mono text-slate-500 py-2 text-center border border-dashed border-white/5 rounded-lg">
                    No posts scheduled —{' '}
                    <button onClick={() => onMindsetChange('marketing')} className="text-violet-400 hover:underline">
                      open Marketing Studio →
                    </button>
                  </div>
                ) : (
                  calendarPosts.map((post: any) => (
                    <div key={post.id} className="p-2 bg-slate-950/40 rounded border border-white/5 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-300 font-bold truncate max-w-[140px]">{post.title || post.content?.slice(0, 40)}</span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-violet-500/20 text-violet-400 text-[8.5px] uppercase">{post.channel || 'post'}</Badge>
                        <span className="text-slate-500 text-[8.5px]">
                          {post.scheduled_time ? new Date(post.scheduled_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Card 2: CRM Accounts & Compliance Ledger */}
      <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
        {customersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 p-6 h-full my-auto">
            <AlertTriangle className="h-8 w-8 text-cyan-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">CRM Ledger is Empty</span>
            <Button
              onClick={onSeedCRM}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[10px] uppercase h-8 px-4 rounded-lg"
            >
              Seed CRM Accounts & Deals
            </Button>
          </div>
        ) : (
          <div className="space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4 w-full">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Active Accounts & Compliance
                </span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">{customersList.length} Accounts</Badge>
                  <Button
                    size="sm"
                    onClick={onOpenNewCustomer}
                    className="h-5 px-2 text-[8px] font-mono uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 rounded-md"
                  >
                    + New
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {customersList.map((customer: any) => (
                  <div key={customer.id} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-1 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">{customer.name}</span>
                      <Badge className={
                        customer.status === 'active' || customer.status === 'verified'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]'
                          : customer.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px]'
                      }>
                        {customer.status || 'active'}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{customer.description || customer.industry || 'B2B Client'}</p>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-white/5">
                      <span>Industry: {customer.industry || 'Enterprise'}</span>
                      {customer.status !== 'verified' && (
                        <button
                          onClick={() => onOverrideConfirm(customer.id, customer.name)}
                          className="text-amber-400 hover:text-amber-300 underline font-mono text-[8.5px]"
                        >
                          Override Compliance →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 rounded-xl text-[10px] font-mono flex items-center justify-between mt-auto gap-2">
              <span className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4" /> Compliance & Outbound:
              </span>
              <Button
                onClick={() => window.open('/api/market-analysis/prospects/csv?industry=Healthcare%20IT', '_blank')}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-[9px] h-7 px-3 rounded-lg"
              >
                📥 Export Lead Sheet CSV
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  </div>
)
}
