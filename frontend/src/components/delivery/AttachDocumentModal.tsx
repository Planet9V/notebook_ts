'use client'

import { useState } from 'react'
import { useCustomer } from '@/lib/hooks/use-customers'
import { useLocation } from '@/lib/hooks/use-locations'
import { useUploadProvenance } from '@/lib/hooks/use-research-memory'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  FileUp,
  X,
  Loader2,
  Building,
  MapPin,
  Tag,
  BookOpen,
} from 'lucide-react'

interface AttachDocumentModalProps {
  open: boolean
  onClose: () => void
  customerId: string
  locationId?: string | null
}

const CATEGORIES = [
  { value: 'diagrams', label: 'Engineering Diagrams (P&IDs, SLDs)' },
  { value: 'compliance', label: 'Compliance & Audit Documentation' },
  { value: 'operations', label: 'Operations & SOP Runbooks' },
  { value: 'financials', label: 'Financials & CAPEX Estimates' },
]

export function AttachDocumentModal({
  open,
  onClose,
  customerId,
  locationId,
}: AttachDocumentModalProps) {
  const { data: customer } = useCustomer(customerId, open)
  const { data: location } = useLocation(locationId || '', open && !!locationId)
  const uploadMutation = useUploadProvenance()

  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('diagrams')
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [publicationYear, setPublicationYear] = useState(new Date().getFullYear().toString())
  const [publisher, setPublisher] = useState('')
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      
      // Auto-populate title from file name
      if (!title) {
        const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "") // strip extension
        setTitle(cleanName.replace(/[_-]/g, ' '))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file to upload')
      return
    }

    setError('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('customer_id', customerId)
    if (locationId) {
      formData.append('location_id', locationId)
    }
    formData.append('category', category)
    formData.append('description', description)
    formData.append('title', title || file.name)
    if (author) formData.append('author', author)
    if (publicationYear) formData.append('publication_year', publicationYear)
    if (publisher) formData.append('publisher', publisher)

    uploadMutation.mutate(formData, {
      onSuccess: () => {
        // Reset form and close
        setFile(null)
        setDescription('')
        setTitle('')
        setAuthor('')
        setPublicationYear(new Date().getFullYear().toString())
        setPublisher('')
        onClose()
      },
      onError: (err: any) => {
        setError(err?.response?.data?.detail || 'Ingestion pipeline failed. Check server logs.')
      }
    })
  }

  const isPending = uploadMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-white/10 text-slate-200 font-mono text-xs overflow-hidden flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b border-white/5 bg-slate-950/40 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 font-mono">
            <FileUp className="h-4.5 w-4.5 text-cyan-400" />
            Ingest Provenance Document
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isPending}
            className="h-7 w-7 p-0 hover:bg-slate-800 text-slate-400 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Linked Scope Display */}
          <div className="p-3 bg-slate-950/60 border border-white/5 rounded-lg space-y-2">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
              Attachment Destination Scope
            </span>
            <div className="flex flex-col gap-1.5 text-[10px] text-slate-400">
              <div className="flex items-center gap-2">
                <Building className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Organization: <strong className="text-slate-200">{customer?.name || customerId}</strong></span>
              </div>
              {locationId && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>Facility Node: <strong className="text-slate-200">{location?.facility_name || locationId}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* File Picker */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Select File *</Label>
            <div className="flex items-center justify-center w-full">
              <label
                className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-950/40 transition-colors ${
                  file ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/10 bg-slate-950/20'
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                  <FileUp className={`h-8 w-8 mb-2 ${file ? 'text-cyan-400' : 'text-slate-600'}`} />
                  <p className="text-[10px] text-slate-400 font-mono text-center px-4">
                    {file ? (
                      <span className="text-cyan-400 font-bold block truncate max-w-[400px]">{file.name}</span>
                    ) : (
                      'Click to browse files (.pdf, .pub, .doc, .xlsx, .png...)'
                    )}
                  </p>
                  {file && (
                    <span className="text-[9px] text-slate-500 mt-1 font-mono">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isPending}
                />
              </label>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-1">
              <Tag className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Document Metadata</span>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase">Document Title</Label>
              <Input
                type="text"
                placeholder="e.g. Primary Substation Network Topology"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
                className="bg-slate-950 border-white/10 focus-visible:ring-cyan-500/35 h-9"
              />
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase">Document Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isPending}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/35 h-9"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value} className="bg-slate-900">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Author / Year / Publisher */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">Author/Issuer</Label>
                <Input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  disabled={isPending}
                  className="bg-slate-950 border-white/10 focus-visible:ring-cyan-500/35 h-9"
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">Publication Year</Label>
                <Input
                  type="number"
                  placeholder="2026"
                  value={publicationYear}
                  onChange={(e) => setPublicationYear(e.target.value)}
                  disabled={isPending}
                  className="bg-slate-950 border-white/10 focus-visible:ring-cyan-500/35 h-9"
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">Publisher/Source</Label>
                <Input
                  type="text"
                  placeholder="e.g. Internal"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  disabled={isPending}
                  className="bg-slate-950 border-white/10 focus-visible:ring-cyan-500/35 h-9"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase">Functional Description</Label>
              <Textarea
                placeholder="Describe the engineering layout, purpose, or compliance relevance of this artifact..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                rows={3}
                className="bg-slate-950 border-white/10 focus-visible:ring-cyan-500/35 resize-none font-mono"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg">
              {error}
            </div>
          )}
        </form>

        <DialogFooter className="p-4 border-t border-white/5 bg-slate-950/30 flex items-center justify-end gap-3 mt-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className="hover:bg-slate-800 text-slate-400 hover:text-slate-100 font-mono text-xs uppercase"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Ingesting...
              </>
            ) : (
              'Start Ingestion'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
