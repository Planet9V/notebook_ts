'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ContentCalendar } from './components/ContentCalendar'
import { PostSchedulerModal } from './components/PostSchedulerModal'
import { publicationsApi } from '@/lib/api/publications'
import { ScheduledPost, PublicationMetrics, ScheduledPostCreate, ScheduledPostUpdate, PublicationMetricsHistoryEntry } from '@/lib/types/publications'
import { useToast } from '@/lib/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Eye, MousePointerClick, TrendingUp, Clock, Calendar, RefreshCw, Send, AlertTriangle, FileText, Activity } from 'lucide-react'

export default function PublicationsPage() {
  const { toast } = useToast()
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [metrics, setMetrics] = useState<PublicationMetrics>({
    total_views: 0,
    total_clicks: 0,
    total_interactions: 0,
    ctr: 0.0,
    by_channel: {},
  })
  const [history, setHistory] = useState<PublicationMetricsHistoryEntry[]>([])
  const [selectedChannel, setSelectedChannel] = useState<string>('all')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null)
  const [defaultDate, setDefaultDate] = useState<Date | null>(null)

  // Fetch all calendar posts, performance metrics, and history
  const fetchData = async () => {
    try {
      setLoading(true)
      const [calendarData, metricsData, historyData] = await Promise.all([
        publicationsApi.getCalendar(),
        publicationsApi.getMetrics(),
        publicationsApi.getMetricsHistory(),
      ])
      setPosts(calendarData)
      setMetrics(metricsData)
      setHistory(historyData)
    } catch (err: any) {
      toast({
        title: 'Failed to fetch data',
        description: err.response?.data?.detail || err.message || 'Error occurred connecting to API',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'Content Calendar & Publication | Tetrel'
    fetchData()
  }, [])


  // CRUD handlers passed to Modal
  const handleSavePost = async (data: ScheduledPostCreate | ScheduledPostUpdate) => {
    try {
      if (editingPost) {
        // Update
        await publicationsApi.updatePost(editingPost.id, data as ScheduledPostUpdate)
        toast({ title: 'Success', description: 'Scheduled post updated successfully' })
      } else {
        // Create
        await publicationsApi.schedulePost(data as ScheduledPostCreate)
        toast({ title: 'Success', description: 'New post scheduled successfully' })
      }
      fetchData()
    } catch (err: any) {
      throw err // Re-throw to let the modal show the error
    }
  }

  const handleDeletePost = async (id: string) => {
    try {
      await publicationsApi.deletePost(id)
      toast({ title: 'Success', description: 'Scheduled post cancelled and removed' })
      fetchData()
    } catch (err: any) {
      throw err
    }
  }

  // Open creation modal
  const handleAddPostClick = (date: Date) => {
    setEditingPost(null)
    setDefaultDate(date)
    setIsModalOpen(true)
  }

  // Open editing modal
  const handleEditPostClick = (post: ScheduledPost) => {
    setEditingPost(post)
    setDefaultDate(null)
    setIsModalOpen(true)
  }

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'linkedin':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'twitter':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
      case 'email':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      default:
        return 'bg-secondary text-secondary-foreground'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="capitalize">{status}</Badge>
      case 'queued':
        return <Badge variant="outline" className="capitalize text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5">{status}</Badge>
      case 'published':
        return <Badge className="capitalize bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25 hover:bg-green-500/25">{status}</Badge>
      case 'failed':
        return <Badge variant="destructive" className="capitalize">{status}</Badge>
      default:
        return <Badge variant="secondary" className="capitalize">{status}</Badge>
    }
  }

  // Segment posts for the side lists
  const drafts = posts.filter((p) => p.status === 'draft')
  const queued = posts.filter((p) => p.status === 'queued')

  const totalQueuedCount = queued.length

  // Compile history chart data aggregated by timestamp
  const chartDataMap = new Map<string, { views: number; clicks: number; interactions: number; rawTime: number }>()
  history
    .filter(h => selectedChannel === 'all' || h.channel === selectedChannel)
    .forEach(h => {
      const dateObj = h.timestamp ? new Date(h.timestamp) : new Date()
      const t = dateObj.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      const rawTime = dateObj.getTime()
      const existing = chartDataMap.get(t) || { views: 0, clicks: 0, interactions: 0, rawTime }
      chartDataMap.set(t, {
        views: existing.views + h.views,
        clicks: existing.clicks + h.clicks,
        interactions: existing.interactions + h.interactions,
        rawTime: Math.min(existing.rawTime, rawTime)
      })
    })

  const chartData = Array.from(chartDataMap.entries())
    .map(([time, vals]) => ({
      time,
      ...vals
    }))
    .sort((a, b) => a.rawTime - b.rawTime)

  const width = 800
  const height = 180
  const paddingLeft = 45
  const paddingRight = 15
  const paddingTop = 15
  const paddingBottom = 25

  const drawableWidth = width - paddingLeft - paddingRight
  const drawableHeight = height - paddingTop - paddingBottom

  const maxViews = Math.max(...chartData.map(d => d.views), 10)
  const maxClicks = Math.max(...chartData.map(d => d.clicks), 5)
  const maxInteractions = Math.max(...chartData.map(d => d.interactions), 5)

  const viewPoints = chartData.map((d, index) => {
    const x = paddingLeft + (chartData.length > 1 ? (index / (chartData.length - 1)) * drawableWidth : 0)
    const y = paddingTop + drawableHeight - (d.views / maxViews) * drawableHeight
    return { x, y }
  })

  const clickPoints = chartData.map((d, index) => {
    const x = paddingLeft + (chartData.length > 1 ? (index / (chartData.length - 1)) * drawableWidth : 0)
    const y = paddingTop + drawableHeight - (d.clicks / maxClicks) * drawableHeight
    return { x, y }
  })

  const interactionPoints = chartData.map((d, index) => {
    const x = paddingLeft + (chartData.length > 1 ? (index / (chartData.length - 1)) * drawableWidth : 0)
    const y = paddingTop + drawableHeight - (d.interactions / maxInteractions) * drawableHeight
    return { x, y }
  })

  const getPathString = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return ''
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
  }

  const getAreaPathString = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return ''
    const linePath = getPathString(points)
    const lastPoint = points[points.length - 1]
    const firstPoint = points[0]
    return `${linePath} L ${lastPoint.x} ${paddingTop + drawableHeight} L ${firstPoint.x} ${paddingTop + drawableHeight} Z`
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (chartData.length === 0) return
    const svgRect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - svgRect.left
    const relativeX = x - paddingLeft
    if (relativeX < 0 || relativeX > drawableWidth) {
      setHoveredIndex(null)
      return
    }
    const ratio = relativeX / drawableWidth
    const approxIndex = Math.round(ratio * (chartData.length - 1))
    if (approxIndex >= 0 && approxIndex < chartData.length) {
      setHoveredIndex(approxIndex)
    } else {
      setHoveredIndex(null)
    }
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background/95">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Content Calendar & Publications</h1>
              <p className="text-sm text-muted-foreground">
                Plan, write, and schedule your social media posts (LinkedIn, Twitter) and email newsletters.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-9 px-3">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={() => handleAddPostClick(new Date())} className="h-9 px-4 flex items-center gap-1.5 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                New Publication
              </Button>
            </div>
          </div>

          {/* Performance KPIs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="tetrel-glass card-hover border-border/40">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Reach</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.total_views.toLocaleString()}</p>
                </div>
                <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20">
                  <Eye className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="tetrel-glass card-hover border-border/40">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Clicks</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.total_clicks.toLocaleString()}</p>
                </div>
                <div className="p-2.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg border border-green-500/20">
                  <MousePointerClick className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="tetrel-glass card-hover border-border/40">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Click Rate (CTR)</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.ctr}%</p>
                </div>
                <div className="p-2.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg border border-cyan-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="tetrel-glass card-hover border-border/40">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scheduled Queue</p>
                  <p className="text-2xl font-bold text-foreground">{totalQueuedCount}</p>
                </div>
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeseries reach analytics card */}
          <Card className="tetrel-glass border-border/40 shadow-sm">
            <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/40">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Activity className="h-4.5 w-4.5 text-primary" />
                  Historical Reach & Engagement Timeseries
                </CardTitle>
                <CardDescription className="text-xs">Views, clicks, and interactions tracked over time.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedChannel} onValueChange={(val) => setSelectedChannel(val)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="All Channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-6">
              {chartData.length < 2 ? (
                <div className="flex flex-col items-center justify-center h-[180px] border border-dashed border-border/30 rounded-lg text-muted-foreground bg-slate-950/10">
                  <TrendingUp className="h-7 w-7 opacity-20 mb-2" />
                  <p className="text-xs font-bold font-mono tracking-wider uppercase">Reach History Pending</p>
                  <p className="text-[10px] text-muted-foreground/80 max-w-sm mt-1 text-center leading-normal">
                    Metrics history snapshots will populate here once posts are published and tracked by the background worker.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-[180px] select-none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <defs>
                      <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
 
                    {/* Horizontal Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                      const y = paddingTop + r * drawableHeight
                      const labelVal = Math.round((1 - r) * maxViews)
                      return (
                        <g key={i}>
                          <line
                             x1={paddingLeft}
                             y1={y}
                             x2={width - paddingRight}
                             y2={y}
                             stroke="currentColor"
                             className="stroke-border/40"
                             strokeWidth={1}
                             strokeDasharray="4 4"
                           />
                          <text
                            x={paddingLeft - 8}
                            y={y + 3}
                            className="text-[9px] font-mono fill-muted-foreground text-right"
                            textAnchor="end"
                          >
                            {labelVal}
                          </text>
                        </g>
                      )
                    })}

                    {/* X-axis labels */}
                    {chartData.map((d, index) => {
                      const showLabel = chartData.length <= 5 || index === 0 || index === chartData.length - 1 || index === Math.floor(chartData.length / 2)
                      if (!showLabel) return null
                      const x = paddingLeft + (index / (chartData.length - 1)) * drawableWidth
                      return (
                        <text
                          key={index}
                          x={x}
                          y={height - 5}
                          className="text-[9px] font-mono fill-muted-foreground"
                          textAnchor="middle"
                        >
                          {d.time}
                        </text>
                      )
                    })}

                    {/* Fills */}
                    <path d={getAreaPathString(viewPoints)} fill="url(#viewsGrad)" />
                    <path d={getAreaPathString(clickPoints)} fill="url(#clicksGrad)" />

                    {/* Lines */}
                    <path d={getPathString(viewPoints)} fill="none" stroke="#3b82f6" strokeWidth={2} />
                    <path d={getPathString(clickPoints)} fill="none" stroke="#10b981" strokeWidth={2} />
                    <path d={getPathString(interactionPoints)} fill="none" stroke="#eab308" strokeWidth={1.5} strokeDasharray="3 3" />

                    {/* Hover vertical bar & dots */}
                    {hoveredIndex !== null && chartData[hoveredIndex] && (
                      <>
                        <line
                          x1={viewPoints[hoveredIndex].x}
                          y1={paddingTop}
                          x2={viewPoints[hoveredIndex].x}
                          y2={paddingTop + drawableHeight}
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth={1.5}
                        />
                        <circle cx={viewPoints[hoveredIndex].x} cy={viewPoints[hoveredIndex].y} r={4} fill="#3b82f6" stroke="white" strokeWidth={1.5} />
                        <circle cx={clickPoints[hoveredIndex].x} cy={clickPoints[hoveredIndex].y} r={4} fill="#10b981" stroke="white" strokeWidth={1.5} />
                        <circle cx={interactionPoints[hoveredIndex].x} cy={interactionPoints[hoveredIndex].y} r={4} fill="#eab308" stroke="white" strokeWidth={1.5} />
                      </>
                    )}
                  </svg>

                  {/* Tooltip Overlay */}
                  {hoveredIndex !== null && chartData[hoveredIndex] && (
                    <div className="absolute top-2 right-4 p-2.5 rounded-lg border border-sidebar-border/20 bg-slate-950/85 backdrop-blur-md text-[10px] font-mono space-y-1 shadow-xl z-20">
                      <p className="text-white font-bold text-center border-b border-white/5 pb-1 mb-1">{chartData[hoveredIndex].time}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                        <span className="text-[#3b82f6] font-semibold">Views:</span>
                        <span className="text-right text-slate-200">{chartData[hoveredIndex].views.toLocaleString()}</span>
                        <span className="text-[#10b981] font-semibold">Clicks:</span>
                        <span className="text-right text-slate-200">{chartData[hoveredIndex].clicks.toLocaleString()}</span>
                        <span className="text-[#eab308] font-semibold">Interactions:</span>
                        <span className="text-right text-slate-200">{chartData[hoveredIndex].interactions.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Calendar Grid (75%) */}
            <div className="xl:col-span-3 h-[750px]">
              <ContentCalendar
                posts={posts}
                onAddPost={handleAddPostClick}
                onEditPost={handleEditPostClick}
              />
            </div>

            {/* Sidebar (25%) */}
            <div className="space-y-6 flex flex-col h-[750px] overflow-y-auto pr-1">
              {/* Scheduled Queue Sidebar */}
              <Card className="tetrel-glass flex-1 flex flex-col min-h-[300px] border-border/40 shadow-sm">
                <CardHeader className="p-4 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Scheduled Queue ({queued.length})
                  </CardTitle>
                  <CardDescription className="text-xs">Posts currently queued for automatic delivery.</CardDescription>
                </CardHeader>
                <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5">
                  {queued.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground space-y-1">
                      <Send className="h-8 w-8 opacity-20 mb-1" />
                      <p className="text-xs font-medium">Queue is empty</p>
                      <p className="text-[10px]">Plan a publication and set its status to queued.</p>
                    </div>
                  ) : (
                    queued.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handleEditPostClick(post)}
                        className="p-3 rounded-lg border border-border/40 bg-background/50 hover:bg-muted/30 hover:border-primary/30 transition-all duration-150 cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <Badge variant="outline" className={`capitalize text-[10px] py-0 px-2 h-4.5 border ${getChannelColor(post.channel)}`}>
                            {post.channel}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.scheduled_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{post.title}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Drafts Sidebar */}
              <Card className="tetrel-glass flex-1 flex flex-col min-h-[300px] border-border/40 shadow-sm">
                <CardHeader className="p-4 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Draft Publications ({drafts.length})
                  </CardTitle>
                  <CardDescription className="text-xs">Work-in-progress content campaigns.</CardDescription>
                </CardHeader>
                <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5">
                  {drafts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground space-y-1">
                      <FileText className="h-8 w-8 opacity-20 mb-1" />
                      <p className="text-xs font-medium">No drafts found</p>
                      <p className="text-[10px]">Create a new publication as a draft first.</p>
                    </div>
                  ) : (
                    drafts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handleEditPostClick(post)}
                        className="p-3 rounded-lg border border-border/40 bg-background/50 hover:bg-muted/30 hover:border-primary/30 transition-all duration-150 cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <Badge variant="outline" className={`capitalize text-[10px] py-0 px-2 h-4.5 border ${getChannelColor(post.channel)}`}>
                            {post.channel}
                          </Badge>
                          {getStatusBadge(post.status)}
                        </div>
                        <h4 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{post.title}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduler Modal Form */}
      <PostSchedulerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        post={editingPost}
        defaultDate={defaultDate}
        onSave={handleSavePost}
        onDelete={handleDeletePost}
      />
    </AppShell>
  )
}
