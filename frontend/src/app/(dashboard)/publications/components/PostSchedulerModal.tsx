'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/lib/hooks/use-toast'
import { ScheduledPost, ScheduledPostCreate, ScheduledPostUpdate } from '@/lib/types/publications'
import { Loader2, Trash2 } from 'lucide-react'

interface PostSchedulerModalProps {
  isOpen: boolean
  onClose: () => void
  post: ScheduledPost | null // If null, we are creating. If set, we are editing.
  defaultDate: Date | null
  onSave: (data: ScheduledPostCreate | ScheduledPostUpdate) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function PostSchedulerModal({
  isOpen,
  onClose,
  post,
  defaultDate,
  onSave,
  onDelete,
}: PostSchedulerModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form Fields
  const [channel, setChannel] = useState<'linkedin' | 'twitter' | 'email'>('linkedin')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [status, setStatus] = useState<'draft' | 'queued' | 'published' | 'failed'>('draft')

  const formatIsoToLocal = (isoString?: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return ''
    
    const pad = (num: number) => String(num).padStart(2, '0')
    const yyyy = date.getFullYear()
    const MM = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
  }

  const formatDatePickerDefault = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0')
    const yyyy = date.getFullYear()
    const MM = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    // Default to current time + 1 hour or just current hour/minute
    const now = new Date()
    const hh = pad(now.getHours())
    const mm = pad(now.getMinutes())
    
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
  }

  // Set initial fields based on edit or create mode
  useEffect(() => {
    if (isOpen) {
      if (post) {
        setChannel(post.channel)
        setTitle(post.title)
        setContent(post.content)
        setScheduledTime(formatIsoToLocal(post.scheduled_time))
        setStatus(post.status)
      } else {
        setChannel('linkedin')
        setTitle('')
        setContent('')
        setScheduledTime(defaultDate ? formatDatePickerDefault(defaultDate) : formatDatePickerDefault(new Date()))
        setStatus('draft')
      }
    }
  }, [isOpen, post, defaultDate])

  // Character limit validation based on channel
  const getCharLimit = () => {
    switch (channel) {
      case 'twitter':
        return 280
      case 'linkedin':
        return 3000
      case 'email':
        return 10000
      default:
        return 1000
    }
  }

  const maxChars = getCharLimit()
  const isOverCharLimit = content.length > maxChars

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({ title: 'Validation Error', description: 'Title is required', variant: 'destructive' })
      return
    }
    if (!content.trim()) {
      toast({ title: 'Validation Error', description: 'Content is required', variant: 'destructive' })
      return
    }
    if (!scheduledTime) {
      toast({ title: 'Validation Error', description: 'Scheduled Time is required', variant: 'destructive' })
      return
    }
    if (isOverCharLimit) {
      toast({ title: 'Validation Error', description: 'Content exceeds character limit for this channel', variant: 'destructive' })
      return
    }

    try {
      setLoading(true)
      const scheduledTimeUtc = new Date(scheduledTime).toISOString()

      if (post) {
        // Edit mode
        const updateData: ScheduledPostUpdate = {
          channel,
          title,
          content,
          scheduled_time: scheduledTimeUtc,
          status,
        }
        await onSave(updateData)
      } else {
        // Create mode
        const createData: ScheduledPostCreate = {
          channel,
          title,
          content,
          scheduled_time: scheduledTimeUtc,
          status,
          media_urls: [],
        }
        await onSave(createData)
      }
      onClose()
    } catch (err: any) {
      toast({
        title: 'Error Saving Post',
        description: err.response?.data?.detail || err.message || 'Unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!post || !onDelete) return
    if (!confirm('Are you sure you want to cancel and delete this scheduled post?')) return

    try {
      setDeleting(true)
      await onDelete(post.id)
      onClose()
    } catch (err: any) {
      toast({
        title: 'Error Deleting Post',
        description: err.response?.data?.detail || err.message || 'Unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl backdrop-blur-md bg-card/95 border border-sidebar-border shadow-2xl">
        <DialogHeader>
          <DialogTitle>{post ? 'Edit Scheduled Publication' : 'Schedule Content Publication'}</DialogTitle>
          <DialogDescription>
            {post
              ? 'Modify your scheduled social post, email campaign, or draft properties.'
              : 'Create a LinkedIn post, Twitter tweet, or Email campaign. Content will run in sandbox mode in development.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Channel Select */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="channel">Publication Channel</Label>
              <Select value={channel} onValueChange={(val: any) => setChannel(val)}>
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn Post</SelectItem>
                  <SelectItem value="twitter">Twitter / X Tweet</SelectItem>
                  <SelectItem value="email">Email Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Select */}
            <div className="space-y-1.5">
              <Label htmlFor="status">Post Status</Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  {post && (
                    <>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Campaign / Post Title</Label>
            <Input
              id="title"
              placeholder="e.g., Q3 Security Compliance Announcement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content Copy</Label>
              <span
                className={`text-xs ${
                  isOverCharLimit ? 'text-red-500 font-semibold' : 'text-muted-foreground'
                }`}
              >
                {content.length} / {maxChars} chars
              </span>
            </div>
            <Textarea
              id="content"
              placeholder="Type your post or campaign copy here..."
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={isOverCharLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
          </div>

          {/* Scheduled Date/Time */}
          <div className="space-y-1.5">
            <Label htmlFor="scheduledTime">Scheduled Date & Time</Label>
            <Input
              id="scheduledTime"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t border-sidebar-border/20 pt-4 mt-6">
            {post ? (
              <Button
                type="button"
                variant="destructive"
                disabled={deleting || loading}
                onClick={handleDelete}
                className="flex items-center gap-1.5 mr-auto"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Post
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading || deleting}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || deleting || isOverCharLimit}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {post ? 'Save Changes' : 'Schedule Post'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
