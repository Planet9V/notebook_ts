'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  Plus, 
  Search, 
  ExternalLink,
  ChevronRight,
  Globe,
  Building,
  Mail,
  X
} from 'lucide-react'
import apiClient from '@/lib/api/client'

interface Customer {
  id: string
  name: string
  website: string
  description: string
  industry: string
  contacts: { name: string; title: string; email: string }[]
  notebook_count: number
  total_value: number
  compliance_progress: number
}

export default function CustomerLedgerPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    website: '',
    description: '',
    industry: 'Energy',
    contactName: '',
    contactTitle: '',
    contactEmail: ''
  })
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Fetch customers
  const fetchCustomers = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get<Customer[]>('/customers')
      setCustomers(response.data || [])
    } catch (e) {
      console.error('Error fetching customers:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Calculate Ledger-wide analytics
  const kpis = useMemo(() => {
    if (customers.length === 0) return { totalClients: 0, pipelineValue: 0, avgCompliance: 0 }
    
    const totalClients = customers.length
    const pipelineValue = customers.reduce((sum, c) => sum + (c.total_value || 0), 0)
    
    const complianceList = customers.map(c => c.compliance_progress || 0)
    const avgCompliance = Math.round(complianceList.reduce((sum, c) => sum + c, 0) / totalClients)
    
    return { totalClients, pipelineValue, avgCompliance }
  }, [customers])

  // Filter clients
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [customers, searchQuery])

  // Handle submit form
  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomer.name) return

    setIsSubmitting(true)
    try {
      const payload = {
        name: newCustomer.name,
        website: newCustomer.website,
        description: newCustomer.description,
        industry: newCustomer.industry,
        contacts: newCustomer.contactName ? [{
          name: newCustomer.contactName,
          title: newCustomer.contactTitle || 'Stakeholder',
          email: newCustomer.contactEmail || ''
        }] : []
      }

      await apiClient.post('/customers', payload)
      
      // Reset form
      setNewCustomer({
        name: '',
        website: '',
        description: '',
        industry: 'Energy',
        contactName: '',
        contactTitle: '',
        contactEmail: ''
      })
      setDialogOpen(false)
      fetchCustomers() // Refresh
    } catch (err) {
      console.error('Failed to create customer:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background text-foreground">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold tracking-tight uppercase font-mono">
                  CRM Customer Ledger
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                Track client accounts, link drafting proposals, and audit corporate cybersecurity compliance posture
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchCustomers()} 
                className="border-white/10 hover:bg-sidebar-accent font-mono text-xs uppercase"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase"
              >
                <Plus className="h-4 w-4 mr-2" />
                Register Customer
              </Button>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500" />
              <CardContent className="flex items-center gap-4 p-4 pl-5">
                <div className="rounded-lg p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Corporate Accounts
                  </p>
                  <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
                    {kpis.totalClients} Clients
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
              <CardContent className="flex items-center gap-4 p-4 pl-5">
                <div className="rounded-lg p-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    B2B Active Deal Pipeline
                  </p>
                  <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
                    ${kpis.pipelineValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
              <CardContent className="flex items-center gap-4 p-4 pl-5">
                <div className="rounded-lg p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Average Security Compliance
                  </p>
                  <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
                    {kpis.avgCompliance}% Rated
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Table Toolbar */}
          <div className="flex items-center justify-between bg-slate-900/20 border border-white/5 p-4 rounded-xl backdrop-blur-sm">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search ledger by client name or sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 font-mono focus:outline-none focus:border-cyan-500/30"
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {filteredCustomers.length} Accounts matched
            </span>
          </div>

          {/* Customer Ledger Table */}
          <Card className="shadow-2xl border-white/5 bg-slate-900/60 backdrop-blur-md overflow-hidden">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mt-1">Hydrating Ledger...</p>
                </div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Building className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-xs font-bold font-mono tracking-wider uppercase text-muted-foreground">No accounts registered</p>
                <p className="text-[10px] text-muted-foreground max-w-[260px] leading-relaxed">
                  Register corporate customer profiles to associate proposal notebooks, stencils, and CSET checklists.
                </p>
                <Button 
                  size="sm" 
                  onClick={() => setDialogOpen(true)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase"
                >
                  Create First Client
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-950/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                      <th className="p-4 w-1/4">Client Name</th>
                      <th className="p-4 w-1/6">Sector / Industry</th>
                      <th className="p-4 w-1/6">Active notebooks</th>
                      <th className="p-4 w-1/6">Pipeline Value</th>
                      <th className="p-4 w-1/6">Maturity Progress</th>
                      <th className="p-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredCustomers.map(customer => (
                      <tr 
                        key={customer.id} 
                        className="hover:bg-slate-800/25 transition-all group"
                      >
                        <td className="p-4">
                          <Link href={`/customers/${customer.id.replace('customer:', '')}`} className="flex flex-col gap-0.5 hover:underline">
                            <span className="font-bold text-slate-200 text-xs tracking-wide">{customer.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[260px]">{customer.website || 'No website registered'}</span>
                          </Link>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-[9px] font-mono border-white/10 bg-slate-950/40 text-slate-300 py-0.5 uppercase tracking-wide">
                            {customer.industry}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-300 font-semibold">{customer.notebook_count} Active</td>
                        <td className="p-4 text-slate-300 font-bold">
                          ${(customer.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-950 border border-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${customer.compliance_progress}%` }} />
                            </div>
                            <span className="text-[10px] text-cyan-400 font-bold">{customer.compliance_progress}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <Link href={`/customers/${customer.id.replace('customer:', '')}`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg group-hover:bg-slate-700/50">
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan-400" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Premium custom desaturated dialog wrapper */}
          {dialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
              <Card className="w-full max-w-lg shadow-2xl border-white/10 bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-4.5 w-4.5 text-cyan-400" />
                    <span className="text-sm font-bold font-mono tracking-wider uppercase text-foreground">Register Corporate Customer</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} className="h-7 w-7 p-0 hover:bg-slate-800 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <form onSubmit={handleRegisterCustomer} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
                  
                  {/* Account Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Company Name</label>
                    <input
                      type="text"
                      required
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Acme Industrial Utilities"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                    />
                  </div>

                  {/* Industry and Website in row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Industry Sector</label>
                      <select
                        value={newCustomer.industry}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, industry: e.target.value }))}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/35"
                      >
                        <option value="Energy">Energy & Power</option>
                        <option value="Water">Water & Wastewater</option>
                        <option value="Transport">Transportation & Log</option>
                        <option value="Defense">Defense & Aerospace</option>
                        <option value="Nuclear">Nuclear Operations</option>
                        <option value="Chemical">Chemical & Biotech</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Website Domain</label>
                      <input
                        type="url"
                        value={newCustomer.website}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://acmeutility.com"
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Company Profile / Description</label>
                    <textarea
                      value={newCustomer.description}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Critical infrastructure grid details and operation profiles..."
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35 leading-relaxed"
                      rows={2}
                    />
                  </div>

                  <Separator className="bg-white/5" />

                  {/* Primary stakeholder contact */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Primary Stakeholder Contact</span>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Contact Full Name</label>
                      <input
                        type="text"
                        value={newCustomer.contactName}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, contactName: e.target.value }))}
                        placeholder="Sarah Connor"
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Title / Role</label>
                        <input
                          type="text"
                          value={newCustomer.contactTitle}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, contactTitle: e.target.value }))}
                          placeholder="Director of OT Security"
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Email Address</label>
                        <input
                          type="email"
                          value={newCustomer.contactEmail}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, contactEmail: e.target.value }))}
                          placeholder="sconnor@acmeindustrial.com"
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/5 bg-slate-950/10 mt-5">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setDialogOpen(false)}
                      className="font-mono text-xs hover:bg-slate-800 text-muted-foreground uppercase"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase"
                    >
                      {isSubmitting ? 'Registering...' : 'Confirm Registration'}
                    </Button>
                  </div>
                  
                </form>
              </Card>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  )
}
