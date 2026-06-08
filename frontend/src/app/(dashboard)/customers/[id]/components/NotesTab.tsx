'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  Building2,
  MapPin,
  Bot,
  User,
  Clock,
  Pencil,
  Trash2,
  Unlink,
  Check,
  X,
} from 'lucide-react'
import {
  useCustomerNotesRollup,
  useCreateCustomerNote,
  useCreateLocationNote,
  useUpdateNote,
  useDeleteNote,
  useDetachLocationNote,
  useDetachCustomerNote,
} from '@/lib/hooks/use-entity-notes'
import { useTranslation } from '@/lib/hooks/use-translation'
import { NoteResponse, LocationNotesRollup } from '@/lib/types/api'

interface NotesTabProps {
  customerId: string
}

function NoteCard({
  note,
  customerId,
  locationId,
}: {
  note: NoteResponse
  customerId?: string
  locationId?: string
}) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(note.title || '')
  const [editContent, setEditContent] = useState(note.content || '')

  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const detachLocation = useDetachLocationNote()
  const detachCustomer = useDetachCustomerNote()

  const preview = note.content
    ? note.content.length > 200
      ? note.content.slice(0, 200) + '…'
      : note.content
    : 'No content'

  const timeAgo = (() => {
    try {
      const diff = Date.now() - new Date(note.updated).getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 60) return `${mins}m ago`
      const hours = Math.floor(mins / 60)
      if (hours < 24) return `${hours}h ago`
      const days = Math.floor(hours / 24)
      return `${days}d ago`
    } catch {
      return note.updated
    }
  })()

  const handleSaveEdit = () => {
    if (!editContent.trim()) return
    updateNote.mutate(
      { noteId: note.id, data: { title: editTitle || undefined, content: editContent }, customerId, locationId },
      { onSuccess: () => setIsEditing(false) }
    )
  }

  const handleDelete = () => {
    if (!window.confirm(t('notes.deleteConfirm'))) return
    deleteNote.mutate({ noteId: note.id, customerId, locationId })
  }

  const handleDetach = () => {
    if (!window.confirm(t('notes.detachConfirm'))) return
    if (locationId) {
      detachLocation.mutate({ locationId, noteId: note.id, customerId })
    } else if (customerId) {
      detachCustomer.mutate({ customerId, noteId: note.id })
    }
  }

  if (isEditing) {
    return (
      <div className="p-3 border border-cyan-500/20 rounded-lg bg-cyan-500/5 space-y-2">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Note title (optional)"
          className="h-7 text-[11px] font-mono bg-slate-950/40 border-white/10"
        />
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={3}
          className="text-[11px] font-mono bg-slate-950/40 border-white/10 resize-none"
        />
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditTitle(note.title || '')
              setEditContent(note.content || '')
              setIsEditing(false)
            }}
            className="h-6 text-[9px] font-mono uppercase tracking-wider text-muted-foreground gap-1"
          >
            <X className="h-2.5 w-2.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveEdit}
            disabled={!editContent.trim() || updateNote.isPending}
            className="h-6 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-[9px] font-mono uppercase tracking-wider px-3 gap-1"
          >
            <Check className="h-2.5 w-2.5" />
            {updateNote.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 border border-white/5 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-200 font-mono truncate">
              {note.title || 'Untitled Note'}
            </span>
            <Badge
              variant="outline"
              className={`text-[7px] font-mono uppercase tracking-widest px-1.5 py-0 ${
                note.note_type === 'ai'
                  ? 'border-violet-500/30 text-violet-400 bg-violet-500/5'
                  : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
              }`}
            >
              {note.note_type === 'ai' ? (
                <><Bot className="h-2.5 w-2.5 mr-0.5" />AI</>
              ) : (
                <><User className="h-2.5 w-2.5 mr-0.5" />Human</>
              )}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground/80 font-mono leading-relaxed line-clamp-3">
            {preview}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 rounded hover:bg-slate-800/60 text-muted-foreground/50 hover:text-cyan-400 transition-colors"
              title={t('common.edit')}
            >
              <Pencil className="h-3 w-3" />
            </button>
            {(locationId || customerId) && (
              <button
                onClick={handleDetach}
                className="p-1 rounded hover:bg-slate-800/60 text-muted-foreground/50 hover:text-amber-400 transition-colors"
                title="Unlink"
              >
                <Unlink className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-slate-800/60 text-muted-foreground/50 hover:text-red-400 transition-colors"
              title={t('common.delete')}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <span className="text-[9px] text-muted-foreground/50 font-mono flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo}
          </span>
        </div>
      </div>
    </div>
  )
}

function InlineNoteForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  onSubmit: (title: string, content: string) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleSubmit = () => {
    if (!content.trim()) return
    onSubmit(title, content)
  }

  return (
    <div className="p-3 border border-cyan-500/20 rounded-lg bg-cyan-500/5 space-y-2">
      <Input
        placeholder="Note title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-7 text-[11px] font-mono bg-slate-950/40 border-white/10"
      />
      <Textarea
        placeholder="Write your note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="text-[11px] font-mono bg-slate-950/40 border-white/10 resize-none"
      />
      <div className="flex items-center gap-2 justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-6 text-[9px] font-mono uppercase tracking-wider text-muted-foreground"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="h-6 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-[9px] font-mono uppercase tracking-wider px-3"
        >
          {isSubmitting ? 'Saving...' : 'Save Note'}
        </Button>
      </div>
    </div>
  )
}

function LocationNotesSection({ rollup, customerId }: { rollup: LocationNotesRollup; customerId: string }) {
  const [expanded, setExpanded] = useState(rollup.note_count > 0)
  const [showForm, setShowForm] = useState(false)
  const createNote = useCreateLocationNote()

  const handleSubmit = (title: string, content: string) => {
    createNote.mutate(
      { locationId: rollup.location_id, data: { title: title || undefined, content, note_type: 'human' }, customerId },
      { onSuccess: () => setShowForm(false) }
    )
  }

  return (
    <div className="border border-white/5 rounded-lg bg-slate-900/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-800/30 transition-all"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <MapPin className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] font-bold font-mono text-slate-200 uppercase tracking-wider">
            {rollup.facility_name}
          </span>
          <Badge
            variant="outline"
            className="text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-1.5 py-0"
          >
            {rollup.note_count} {rollup.note_count === 1 ? 'note' : 'notes'}
          </Badge>
        </div>
        {rollup.latest_note_date && (
          <span className="text-[9px] text-muted-foreground/50 font-mono">
            Last updated: {new Date(rollup.latest_note_date).toLocaleDateString()}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {rollup.notes.length === 0 && !showForm ? (
            <p className="text-[10px] text-muted-foreground/60 font-mono py-2 text-center">
              No notes for this facility yet
            </p>
          ) : (
            rollup.notes.map((note) => <NoteCard key={note.id} note={note} customerId={customerId} locationId={rollup.location_id} />)
          )}

          {showForm ? (
            <InlineNoteForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              isSubmitting={createNote.isPending}
            />
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(true)}
              className="h-6 text-[9px] font-mono text-cyan-400 hover:text-cyan-300 uppercase tracking-wider gap-1"
            >
              <Plus className="h-2.5 w-2.5" />
              Add Note to Facility
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function NotesTab({ customerId }: NotesTabProps) {
  const { data: rollup, isLoading, isError } = useCustomerNotesRollup(customerId)
  const createNote = useCreateCustomerNote()
  const [showOrgForm, setShowOrgForm] = useState(false)

  const handleOrgNoteSubmit = (title: string, content: string) => {
    createNote.mutate(
      { customerId, data: { title: title || undefined, content, note_type: 'human' } },
      { onSuccess: () => setShowOrgForm(false) }
    )
  }

  if (isLoading) {
    return (
      <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-800/60 rounded w-1/3" />
          <div className="h-20 bg-slate-800/40 rounded" />
          <div className="h-20 bg-slate-800/40 rounded" />
        </div>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
          <FileText className="h-6 w-6 text-red-400/50" />
          <p className="text-[10px] font-mono text-red-400 uppercase tracking-wider">
            Failed to load notes
          </p>
          <p className="text-[9px] text-muted-foreground/60 font-mono max-w-xs">
            An error occurred while fetching notes. Please try again later.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-widest">
            Organization Notes
          </h3>
          {rollup && (
            <Badge
              variant="outline"
              className="text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-2 py-0"
            >
              {rollup.total_note_count} Total
            </Badge>
          )}
        </div>
      </div>

      {/* Organization-Level Notes */}
      <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[10px] font-bold font-mono text-slate-300 uppercase tracking-widest">
              Organization-Level Notes
            </span>
            <Badge
              variant="outline"
              className="text-[7px] font-mono border-slate-600 bg-slate-800/40 text-slate-400 px-1.5 py-0"
            >
              {rollup?.direct_notes.length || 0}
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={() => setShowOrgForm(!showOrgForm)}
            className="h-6 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-[9px] font-mono uppercase tracking-wider px-3 gap-1"
          >
            <Plus className="h-2.5 w-2.5" />
            Add Note
          </Button>
        </div>
        <div className="p-4 space-y-2">
          {showOrgForm && (
            <InlineNoteForm
              onSubmit={handleOrgNoteSubmit}
              onCancel={() => setShowOrgForm(false)}
              isSubmitting={createNote.isPending}
            />
          )}
          {rollup?.direct_notes.length === 0 && !showOrgForm ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
              <FileText className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                No organization-level notes
              </p>
              <p className="text-[9px] text-muted-foreground/60 font-mono max-w-xs">
                Add notes directly to the organization for company-wide context
              </p>
            </div>
          ) : (
            rollup?.direct_notes.map((note) => <NoteCard key={note.id} note={note} customerId={customerId} />)
          )}
        </div>
      </Card>

      {/* Facility Notes Rollup */}
      <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold font-mono text-slate-300 uppercase tracking-widest">
            Facility Notes Rollup
          </span>
          <Badge
            variant="outline"
            className="text-[7px] font-mono border-slate-600 bg-slate-800/40 text-slate-400 px-1.5 py-0"
          >
            {rollup?.locations.length || 0} Facilities
          </Badge>
        </div>
        <div className="p-4 space-y-3">
          {rollup?.locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
              <MapPin className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                No facilities registered
              </p>
              <p className="text-[9px] text-muted-foreground/60 font-mono max-w-xs">
                Add locations in the Locations tab to attach facility-level notes
              </p>
            </div>
          ) : (
            rollup?.locations.map((loc) => (
              <LocationNotesSection key={loc.location_id} rollup={loc} customerId={customerId} />
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
