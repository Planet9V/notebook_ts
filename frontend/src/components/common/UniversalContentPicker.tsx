'use client'

import { useState, useMemo } from 'react'
import { FileText, Link as LinkIcon, Upload, Search, BookOpen, FileEdit } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotebookResponse, NoteResponse, SourceListResponse } from '@/lib/types/api'

export interface SelectedContentMap {
  notebooks: Record<string, boolean>
  notes: Record<string, 'full' | 'off'>
  sources: Record<string, 'full' | 'insights' | 'off'>
}

interface UniversalContentPickerProps {
  notebooks: NotebookResponse[]
  notes: NoteResponse[]
  sources: SourceListResponse[]
  selectedMap: SelectedContentMap
  onChange: (updated: SelectedContentMap) => void
  isLoading?: boolean
}

export function UniversalContentPicker({
  notebooks,
  notes,
  sources,
  selectedMap,
  onChange,
  isLoading = false,
}: UniversalContentPickerProps) {
  const [activeTab, setActiveTab] = useState<'notebooks' | 'notes' | 'sources'>('notebooks')
  const [filterQuery, setFilterQuery] = useState('')

  const filteredNotebooks = useMemo(() => {
    if (!filterQuery.trim()) return notebooks
    const q = filterQuery.toLowerCase()
    return notebooks.filter(n => n.name.toLowerCase().includes(q))
  }, [notebooks, filterQuery])

  const filteredNotes = useMemo(() => {
    if (!filterQuery.trim()) return notes
    const q = filterQuery.toLowerCase()
    return notes.filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q))
  }, [notes, filterQuery])

  const filteredSources = useMemo(() => {
    if (!filterQuery.trim()) return sources
    const q = filterQuery.toLowerCase()
    return sources.filter(s => (s.title || '').toLowerCase().includes(q))
  }, [sources, filterQuery])

  const toggleNote = (noteId: string) => {
    const current = selectedMap.notes[noteId] || 'off'
    const nextState = current === 'off' ? 'full' : 'off'
    onChange({
      ...selectedMap,
      notes: { ...selectedMap.notes, [noteId]: nextState },
    })
  }

  const toggleSource = (sourceId: string) => {
    const current = selectedMap.sources[sourceId] || 'off'
    const nextState = current === 'off' ? 'full' : 'off'
    onChange({
      ...selectedMap,
      sources: { ...selectedMap.sources, [sourceId]: nextState },
    })
  }

  const toggleNotebook = (notebookId: string) => {
    const current = selectedMap.notebooks[notebookId] || false
    onChange({
      ...selectedMap,
      notebooks: { ...selectedMap.notebooks, [notebookId]: !current },
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter notebooks, research notes, and raw sources..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="pl-9 text-xs h-9 bg-background font-mono"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 text-xs">
          <TabsTrigger value="notebooks" className="text-xs flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Notebooks ({filteredNotebooks.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs flex items-center gap-1.5">
            <FileEdit className="h-3.5 w-3.5" />
            Research Notes ({filteredNotes.length})
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-xs flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Raw Sources ({filteredSources.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notebooks" className="mt-3">
          <ScrollArea className="h-[280px]">
            <div className="space-y-2 pr-3">
              {filteredNotebooks.map((nb) => {
                const isSelected = !!selectedMap.notebooks[nb.id]
                return (
                  <div
                    key={nb.id}
                    onClick={() => toggleNotebook(nb.id)}
                    className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleNotebook(nb.id)} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{nb.name}</p>
                        <p className="text-xs text-muted-foreground">{nb.description || 'Workspace notebook container'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {nb.source_count ?? 0} Sources · {nb.note_count ?? 0} Notes
                    </Badge>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="notes" className="mt-3">
          <ScrollArea className="h-[280px]">
            <div className="space-y-2 pr-3">
              {filteredNotes.map((note) => {
                const isSelected = (selectedMap.notes[note.id] || 'off') !== 'off'
                return (
                  <div
                    key={note.id}
                    onClick={() => toggleNote(note.id)}
                    className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                      isSelected ? 'border-cyan-500 bg-cyan-500/10' : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleNote(note.id)} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{note.title || 'Untitled Research Note'}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {(note.content || '').substring(0, 90)}...
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                      {note.note_type || 'note'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sources" className="mt-3">
          <ScrollArea className="h-[280px]">
            <div className="space-y-2 pr-3">
              {filteredSources.map((source) => {
                const isSelected = (selectedMap.sources[source.id] || 'off') !== 'off'
                return (
                  <div
                    key={source.id}
                    onClick={() => toggleSource(source.id)}
                    className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/10' : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSource(source.id)} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{source.title || 'Untitled Source'}</p>
                        <p className="text-xs text-muted-foreground">
                          {source.asset?.url ? 'Web Link' : source.asset?.file_path ? 'Uploaded File' : 'Raw Text'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={source.embedded ? 'default' : 'outline'} className="text-[10px]">
                      {source.embedded ? 'Indexed' : 'Pending'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
