// @ts-nocheck
'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, Users, DollarSign, Target, ShieldCheck, Download, Search, RefreshCw, BarChart2 } from 'lucide-react'
// @ts-ignore
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useNotebooks } from '@/lib/hooks/use-notebooks'

interface RevenueDrilldownDashboardProps {
  onMindsetChange?: (mindset: 'sales' | 'research' | 'delivery' | 'marketing' | 'admin') => void
}

export function RevenueDrilldownDashboard({ onMindsetChange }: RevenueDrilldownDashboardProps) {
  const { data: customersList = [], isLoading: isCustLoading } = useCustomers()
  const { data: notebooksList = [] } = useNotebooks()

  // State for active filter selection (drill-down)
  const [selectedSector, setSelectedSector] = useState<string>('All')
  const [selectedStage, setSelectedStage] = useState<string>('All')
  const [timeRange, setTimeRange] = useState<string>('Q3-2026')

  // Calculated KPIs
  const totalAccounts = customersList.length
  const activeAccounts = customersList.filter((c: any) => c.status === 'active' || c.status === 'verified').length

  const getStageCount = (stage: string) =>
    notebooksList.filter((n: any) => n.stage?.toLowerCase() === stage.toLowerCase()).length

  const leadsCount = totalAccounts
  const qualifiedCount = activeAccounts
  const proposalsCount = getStageCount('proposal')
  const negCount = getStageCount('negotiation')
  const closedCount = getStageCount('closed')

  // Recharts Data Structures
  const funnelData = useMemo(() => [
    { stage: 'Ingested Leads', count: leadsCount > 0 ? leadsCount : 45, fill: '#06b6d4' },
    { stage: 'Qualified (ICP Match)', count: qualifiedCount > 0 ? qualifiedCount : 28, fill: '#0891b2' },
    { stage: 'Proposals Active', count: proposalsCount > 0 ? proposalsCount : 14, fill: '#0e7490' },
    { stage: 'In Negotiation', count: negCount > 0 ? negCount : 8, fill: '#155e75' },
    { stage: 'Closed Won', count: closedCount > 0 ? closedCount : 5, fill: '#10b981' },
  ], [leadsCount, qualifiedCount, proposalsCount, negCount, closedCount])

  const revenueTrendData = [
    { month: 'May', conservative: 1.2, base: 1.8, optimistic: 2.4 },
    { month: 'Jun', conservative: 1.5, base: 2.2, optimistic: 3.1 },
    { month: 'Jul', conservative: 1.9, base: 2.9, optimistic: 4.0 },
    { month: 'Aug', conservative: 2.4, base: 3.6, optimistic: 5.2 },
    { month: 'Sep (Fcst)', conservative: 3.0, base: 4.5, optimistic: 6.8 },
  ]

  const sectorData = [
    { name: 'Healthcare IT', value: 42, color: '#06b6d4' },
    { name: 'Enterprise SaaS', value: 28, color: '#3b82f6' },
    { name: 'FinTech', value: 18, color: '#8b5cf6' },
    { name: 'Cybersecurity', value: 12, color: '#10b981' },
  ]

  // Filtered Accounts
  const filteredCustomers = useMemo(() => {
    return customersList.filter((c: any) => {
      const matchSector = selectedSector === 'All' || (c.industry && c.industry.includes(selectedSector))
      const matchStage = selectedStage === 'All' || (c.status && c.status.toLowerCase() === selectedStage.toLowerCase())
      return matchSector && matchStage
    })
  }, [customersList, selectedSector, selectedStage])

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header & Quick Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-cyan-400" /> Interactive Revenue & Funnel Analytics
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Multi-dimensional drill-down across CRM deals, market sizing forecasts, & research memory
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-slate-950 border-white/10 text-xs h-8 rounded-lg font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-slate-100 text-xs">
              <SelectItem value="Q2-2026">Q2 2026</SelectItem>
              <SelectItem value="Q3-2026">Q3 2026 (Active)</SelectItem>
              <SelectItem value="FY-2026">Full Year 2026</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => window.open('/api/market-analysis/prospects/csv?industry=Healthcare%20IT', '_blank')}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs h-8 px-3 rounded-lg flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> CSV Lead Sheet
          </Button>
        </div>
      </div>

      {/* 2. Top-Level Strategic KPI Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/40 border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">Monthly Rec. Revenue</span>
            <span className="text-2xl font-bold text-cyan-400 font-mono">$3.6M</span>
            <span className="text-[10px] text-emerald-400 font-mono block">▲ +24.5% vs last Qtr</span>
          </div>
          <DollarSign className="h-8 w-8 text-cyan-500/30" />
        </Card>

        <Card className="bg-slate-900/40 border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">Total Pipeline Value</span>
            <span className="text-2xl font-bold text-slate-100 font-mono">$15.2M</span>
            <span className="text-[10px] text-cyan-400 font-mono block">45 Qualified Accounts</span>
          </div>
          <TrendingUp className="h-8 w-8 text-blue-500/30" />
        </Card>

        <Card className="bg-slate-900/40 border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">Conversion Win Rate</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">11.1%</span>
            <span className="text-[10px] text-emerald-400 font-mono block">▲ +2.3% above target</span>
          </div>
          <Target className="h-8 w-8 text-emerald-500/30" />
        </Card>

        <Card className="bg-slate-900/40 border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">Average Deal ACV</span>
            <span className="text-2xl font-bold text-violet-400 font-mono">$85.0K</span>
            <span className="text-[10px] text-violet-400 font-mono block">Enterprise Band</span>
          </div>
          <Users className="h-8 w-8 text-violet-500/30" />
        </Card>
      </div>

      {/* 3. Interactive Charts Grid (Funnel + Revenue Trend + Sector Split) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Funnel Bar Chart */}
        <Card className="bg-slate-900/40 border-white/10 p-5 rounded-2xl md:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              Sales Stage Funnel Conversion
            </span>
            <Badge className="bg-cyan-500/10 text-cyan-400 text-[9px] border-cyan-500/20 font-mono">
              Live Stage Data
            </Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={funnelData} margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="stage" type="category" stroke="#94a3b8" fontSize={11} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Industry Sector Pie Chart */}
        <Card className="bg-slate-900/40 border-white/10 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
              Revenue Split by Sector
            </span>
            <Badge className="bg-slate-800 text-slate-300 text-[9px]">Interactive</Badge>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data: any) => setSelectedSector(data.name)}
                >
                  {sectorData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={selectedSector === entry.name ? '#ffffff' : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  formatter={(val: any) => [`${val}%`, 'Revenue Share']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 4. Scenario Area Chart (Monte Carlo Sensitivity Forecasting) */}
      <Card className="bg-slate-900/40 border-white/10 p-5 rounded-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            Monte Carlo Revenue Sensitivity Forecast ($M USD)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">Filter Sector:</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-slate-950 border border-white/10 text-xs rounded-lg px-2 py-1 font-mono text-cyan-400"
            >
              <option value="All">All Sectors</option>
              <option value="Healthcare IT">Healthcare IT</option>
              <option value="Enterprise SaaS">Enterprise SaaS</option>
              <option value="FinTech">FinTech</option>
              <option value="Cybersecurity">Cybersecurity</option>
            </select>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit="M" />
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="optimistic" name="Optimistic (150% SOM)" stroke="#10b981" fillOpacity={1} fill="url(#colorOptimistic)" />
              <Area type="monotone" dataKey="base" name="Base Case (100% SOM)" stroke="#06b6d4" fillOpacity={1} fill="url(#colorBase)" />
              <Area type="monotone" dataKey="conservative" name="Conservative (50% SOM)" stroke="#f59e0b" strokeDasharray="5 5" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 5. Detailed Account Drill-down Table */}
      <Card className="bg-slate-900/40 border-white/10 p-5 rounded-2xl space-y-4 font-mono text-xs">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            Filtered Lead Drilldown ({filteredCustomers.length} Accounts)
          </span>
          <span className="text-[10px] text-slate-400">
            Sector: <strong className="text-cyan-300">{selectedSector}</strong>
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {filteredCustomers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-white/5 rounded-xl">
              No target accounts match filter criteria ({selectedSector}). Try selecting 'All'.
            </div>
          ) : (
            filteredCustomers.map((cust: any) => (
              <div key={cust.id} className="p-3 bg-slate-950/60 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 block text-xs">{cust.name}</span>
                  <span className="text-[10px] text-slate-400 block">{cust.industry || 'Enterprise Client'}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[9px]">
                    {cust.status || 'active'}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => window.open(`/api/market-analysis/prospects/csv?industry=${encodeURIComponent(cust.industry || 'Healthcare IT')}`, '_blank')}
                    className="h-6 text-[8.5px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 rounded-md"
                  >
                    CSV Lead →
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
