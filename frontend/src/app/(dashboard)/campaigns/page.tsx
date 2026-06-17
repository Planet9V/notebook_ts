'use client'

import { useState, useMemo, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Loader2,
  Calendar,
  Trash,
  Megaphone,
  Briefcase,
  Book,
  Users,
  Linkedin,
  Twitter,
  Mail,
  Edit2,
  FileText,
} from 'lucide-react'

// Hooks
import { useCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign } from '@/lib/hooks/use-campaigns'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useNotebooks } from '@/lib/hooks/use-notebooks'

// Types
import type { Campaign, CreateCampaignRequest } from '@/lib/types/campaign'

const CAMPAIGN_STATUS_COLUMNS = [
  { id: 'draft', title: 'Drafting', badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  { id: 'active', title: 'Active', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  { id: 'paused', title: 'Paused', badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  { id: 'completed', title: 'Completed', badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  { id: 'archived', title: 'Archived', badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
]

export default function CampaignsPage() {
  const { data: customers = [] } = useCustomers()
  const { data: notebooks = [] } = useNotebooks()

  const [searchQuery, setSearchQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState<string>('all')

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  // Form Fields State
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTheme, setFormTheme] = useState('')
  const [formStatus, setFormStatus] = useState('draft')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formTargetAudience, setFormTargetAudience] = useState('')
  const [formCustomerId, setFormCustomerId] = useState('none')
  const [formNotebookId, setFormNotebookId] = useState('none')
  const [channelsList, setChannelsList] = useState<string[]>([])

  // Query and Mutations
  const { data: campaigns = [], isLoading, refetch } = useCampaigns()
  const createCampaignMutation = useCreateCampaign()
  const updateCampaignMutation = useUpdateCampaign()
  const deleteCampaignMutation = useDeleteCampaign()

  useEffect(() => {
    document.title = 'Content Marketing Campaigns | Tetrel'
  }, [])

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.theme?.toLowerCase().includes(q)
      )
    }

    if (channelFilter !== 'all') {
      result = result.filter((c) => c.channels?.includes(channelFilter))
    }

    return result
  }, [campaigns, searchQuery, channelFilter])

  // Group campaigns by status
  const groupedCampaigns = useMemo(() => {
    const groups: Record<string, Campaign[]> = Object.fromEntries(
      CAMPAIGN_STATUS_COLUMNS.map((col) => [col.id, []])
    )
    filteredCampaigns.forEach((c) => {
      const status = c.status || 'draft'
      if (groups[status]) {
        groups[status].push(c)
      } else {
        groups['draft'].push(c)
      }
    })
    return groups
  }, [filteredCampaigns])

  // Open campaign for editing
  const handleOpenEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setFormName(campaign.name)
    setFormDescription(campaign.description || '')
    setFormTheme(campaign.theme || '')
    setFormStatus(campaign.status)
    setFormStartDate(campaign.start_date || '')
    setFormEndDate(campaign.end_date || '')
    setFormTargetAudience(campaign.target_audience || '')
    setFormCustomerId(campaign.customer_id || 'none')
    setFormNotebookId(campaign.notebook_id || 'none')
    setChannelsList(campaign.channels || [])
    setDialogOpen(true)
  }

  // Open modal for new campaign
  const handleOpenCreate = (statusId: string = 'draft') => {
    setEditingCampaign(null)
    setFormName('')
    setFormDescription('')
    setFormTheme('')
    setFormStatus(statusId)
    setFormStartDate('')
    setFormEndDate('')
    setFormTargetAudience('')
    setFormCustomerId('none')
    setFormNotebookId('none')
    setChannelsList([])
    setDialogOpen(true)
  }

  // Toggle selected channels
  const handleToggleChannel = (channel: string) => {
    setChannelsList((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    )
  }

  // Form submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error('Campaign name is required')
      return
    }

    const payload: CreateCampaignRequest = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      theme: formTheme.trim() || undefined,
      status: formStatus,
      start_date: formStartDate || undefined,
      end_date: formEndDate || undefined,
      target_audience: formTargetAudience.trim() || undefined,
      customer_id: formCustomerId === 'none' ? undefined : formCustomerId,
      notebook_id: formNotebookId === 'none' ? undefined : formNotebookId,
      channels: channelsList,
    }

    try {
      if (editingCampaign) {
        await updateCampaignMutation.mutateAsync({
          id: editingCampaign.id,
          data: payload,
        })
      } else {
        await createCampaignMutation.mutateAsync(payload)
      }
      setDialogOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Error saving campaign')
    }
  }

  // Delete campaign
  const handleDelete = async (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      try {
        await deleteCampaignMutation.mutateAsync(campaignId)
        setDialogOpen(false)
      } catch {
        toast.error('Failed to delete campaign')
      }
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'linkedin':
        return <Linkedin className="h-3 w-3 shrink-0 text-blue-400" />
      case 'twitter':
        return <Twitter className="h-3 w-3 shrink-0 text-cyan-400" />
      case 'email':
      case 'newsletter':
        return <Mail className="h-3 w-3 shrink-0 text-purple-400" />
      default:
        return <Megaphone className="h-3 w-3 shrink-0 text-slate-400" />
    }
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background/95">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Content & Marketing Campaigns
              </h1>
              <p className="text-sm text-muted-foreground">
                Plan, organize, and orchestrate campaign themes, audience channels, and customer deliverables.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-9 border-sidebar-border hover:bg-sidebar-accent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => handleOpenCreate('draft')}
                className="h-9 px-4 flex items-center gap-1.5 shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-background/20 backdrop-blur-sm border border-sidebar-border/50 rounded-xl p-4">
            <div className="flex flex-1 items-center gap-3 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/40 border-sidebar-border"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-[180px] bg-background/40 border-sidebar-border">
                  <SelectValue placeholder="Filter by Channel" />
                </SelectTrigger>
                <SelectContent className="bg-background border-sidebar-border">
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="email">Email Newsletter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Columns Grid */}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
              {CAMPAIGN_STATUS_COLUMNS.map((col) => {
                const colCampaigns = groupedCampaigns[col.id] || []
                return (
                  <div key={col.id} className="flex flex-col bg-background/30 border border-sidebar-border/50 rounded-xl p-3 h-[600px] overflow-hidden backdrop-blur-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-sidebar-border/40 shrink-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-foreground">{col.title}</h3>
                        <Badge variant="outline" className={col.badgeClass}>
                          {colCampaigns.length}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenCreate(col.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 rounded-md"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Cards Scroll Container */}
                    <ScrollArea className="flex-1 overflow-y-auto mt-3 pr-1.5">
                      <div className="space-y-3 pb-4">
                        {colCampaigns.map((camp) => (
                          <Card
                            key={camp.id}
                            className="bg-background/80 border-sidebar-border/50 hover:border-primary/20 hover:shadow-md cursor-pointer transition-all duration-200"
                            onClick={() => handleOpenEdit(camp)}
                          >
                            <CardContent className="p-3.5 space-y-3">
                              <div className="space-y-1">
                                <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                  {camp.name}
                                </h4>
                                {camp.theme && (
                                  <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider font-semibold truncate">
                                    Theme: {camp.theme}
                                  </p>
                                )}
                              </div>

                              {camp.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                  {camp.description}
                                </p>
                              )}

                              {/* Target audience */}
                              {camp.target_audience && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3 shrink-0 opacity-50" />
                                  <span className="truncate">Audience: {camp.target_audience}</span>
                                </div>
                              )}

                              {/* Channels badges */}
                              {camp.channels && camp.channels.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1 shrink-0">
                                  {camp.channels.map((chan) => (
                                    <Badge
                                      key={chan}
                                      variant="secondary"
                                      className="text-[9px] font-medium py-0 px-1 border border-border/10 flex items-center gap-0.5"
                                    >
                                      {getChannelIcon(chan)}
                                      <span className="capitalize">{chan}</span>
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Footer: Timeline & Relationships */}
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-2 border-t border-sidebar-border/10">
                                {camp.start_date ? (
                                  <span className="flex items-center gap-1 font-medium">
                                    <Calendar className="h-3 w-3 shrink-0" />
                                    {camp.start_date.split('T')[0]}
                                  </span>
                                ) : (
                                  <span className="opacity-50">No timeline</span>
                                )}

                                <div className="flex gap-1">
                                  {camp.customer_id && (
                                    <span title="Linked to customer">
                                      <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                                    </span>
                                  )}
                                  {camp.notebook_id && (
                                    <span title="Linked to workspace">
                                      <Book className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {colCampaigns.length === 0 && (
                          <div className="flex flex-col items-center justify-center border border-dashed border-sidebar-border/30 rounded-xl p-6 text-center text-muted-foreground mt-4 h-32 shrink-0">
                            <Megaphone className="h-6 w-6 mb-1 opacity-20" />
                            <p className="text-[11px] font-semibold">No campaigns</p>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => handleOpenCreate(col.id)}
                              className="text-[10px] text-primary p-0 h-auto mt-1"
                            >
                              + Add Item
                            </Button>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-background border-sidebar-border">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit Marketing Campaign' : 'Create Marketing Campaign'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-3">
            <div className="space-y-1">
              <Label htmlFor="camp-name">Campaign Name *</Label>
              <Input
                id="camp-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Q3 Cybersecurity Whitepaper"
                className="bg-background/40 border-sidebar-border"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="camp-desc">Description</Label>
              <Textarea
                id="camp-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Focus objectives and campaign messaging strategy..."
                className="bg-background/40 border-sidebar-border min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="camp-theme">Campaign Theme</Label>
                <Input
                  id="camp-theme"
                  value={formTheme}
                  onChange={(e) => setFormTheme(e.target.value)}
                  placeholder="e.g. Purdue Levels compliance"
                  className="bg-background/40 border-sidebar-border"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="camp-status">Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger id="camp-status" className="bg-background/40 border-sidebar-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-sidebar-border">
                    <SelectItem value="draft">Drafting</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="camp-start">Start Date</Label>
                <Input
                  id="camp-start"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="bg-background/40 border-sidebar-border"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="camp-end">End Date</Label>
                <Input
                  id="camp-end"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="bg-background/40 border-sidebar-border"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="camp-audience">Target Audience</Label>
              <Input
                id="camp-audience"
                value={formTargetAudience}
                onChange={(e) => setFormTargetAudience(e.target.value)}
                placeholder="e.g. CISO, OT Engineers, Compliance directors"
                className="bg-background/40 border-sidebar-border"
              />
            </div>

            {/* Channels checklist */}
            <div className="space-y-2">
              <Label>Distribution Channels</Label>
              <div className="flex gap-4 items-center">
                {['linkedin', 'twitter', 'email'].map((chan) => {
                  const checked = channelsList.includes(chan)
                  return (
                    <label key={chan} className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleChannel(chan)}
                        className="rounded border-sidebar-border bg-background/40 text-primary h-4.5 w-4.5"
                      />
                      <span className="capitalize">{chan}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-sidebar-border/30 pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Customer Link</Label>
                <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                  <SelectTrigger className="bg-background/40 border-sidebar-border text-xs h-8">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-sidebar-border text-xs">
                    <SelectItem value="none">None</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Workspace Link (Deal)</Label>
                <Select value={formNotebookId} onValueChange={setFormNotebookId}>
                  <SelectTrigger className="bg-background/40 border-sidebar-border text-xs h-8">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-sidebar-border text-xs">
                    <SelectItem value="none">None</SelectItem>
                    {notebooks.map((n) => (
                      <SelectItem key={n.id} value={n.id} className="text-xs">
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between border-t border-sidebar-border/30 pt-3">
              {editingCampaign ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDelete(editingCampaign.id)}
                  className="mr-auto"
                >
                  <Trash className="h-4 w-4 mr-1.5" />
                  Delete Campaign
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCampaign ? 'Save Changes' : 'Create Campaign'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
