'use client'

import { useState } from 'react'
import { useContacts } from '@/lib/hooks/use-contacts'
import { Contact } from '@/lib/types/contact'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Contact2,
  Mail,
  Phone,
  Copy,
  Check,
  Pencil,
  Plus,
  Linkedin,
  User,
} from 'lucide-react'

interface ContactsPanelProps {
  customerId: string
}

function CopyableEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!email) return
    navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!email) return null

  return (
    <div className="flex items-center gap-1.5 group/email">
      <Mail className="h-3 w-3 text-cyan-400 shrink-0" />
      <a
        href={`mailto:${email}`}
        className="text-[10px] font-mono text-cyan-400 hover:underline truncate"
      >
        {email}
      </a>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover/email:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/5"
        title="Copy email"
      >
        {copied ? (
          <Check className="h-2.5 w-2.5 text-emerald-400" />
        ) : (
          <Copy className="h-2.5 w-2.5 text-muted-foreground" />
        )}
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || 'unknown'

  const variants: Record<string, string> = {
    active: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    inactive: 'border-slate-500/20 bg-slate-500/5 text-slate-400',
    lead: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    churned: 'border-red-500/20 bg-red-500/5 text-red-400',
  }

  const className = variants[normalized] || 'border-slate-500/20 bg-slate-500/5 text-slate-400'

  return (
    <Badge variant="outline" className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0 ${className}`}>
      {status || 'Unknown'}
    </Badge>
  )
}

function ContactCard({
  contact,
  onEdit,
}: {
  contact: Contact
  onEdit: (contact: Contact) => void
}) {
  return (
    <div className="p-3 border border-white/5 bg-slate-950/40 rounded-lg space-y-2 relative overflow-hidden group">
      {/* Left accent bar */}
      <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500/20" />

      <div className="pl-1 space-y-2">
        {/* Name & Status Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <p className="font-bold text-slate-200 text-xs font-mono truncate">
              {contact.full_name}
            </p>
            {contact.title && (
              <p className="text-[10px] text-muted-foreground truncate">
                {contact.title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={contact.status} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(contact)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-cyan-400"
              aria-label={`Edit ${contact.full_name}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-1.5 pt-1 border-t border-white/5">
          <CopyableEmail email={contact.email} />

          {contact.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] font-mono text-muted-foreground">
                {contact.phone}
              </span>
            </div>
          )}

          {contact.linkedin_url && (
            <div className="flex items-center gap-1.5">
              <Linkedin className="h-3 w-3 text-muted-foreground shrink-0" />
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-cyan-400 hover:underline truncate"
              >
                LinkedIn Profile
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ContactsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-3 border border-white/5 bg-slate-950/40 rounded-lg space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-3.5 w-28 rounded bg-slate-700/50 animate-pulse" />
              <div className="h-2.5 w-20 rounded bg-slate-700/50 animate-pulse" />
            </div>
            <div className="h-4 w-14 rounded-full bg-slate-700/50 animate-pulse" />
          </div>
          <div className="border-t border-white/5 pt-2 space-y-2">
            <div className="h-2.5 w-36 rounded bg-slate-700/50 animate-pulse" />
            <div className="h-2.5 w-24 rounded bg-slate-700/50 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ContactsPanel({ customerId }: ContactsPanelProps) {
  const { data: contacts, isLoading } = useContacts(customerId)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    // ContactForm will be created by another agent — for now we set state
  }

  const handleCreate = () => {
    setIsCreating(true)
    // ContactForm will be created by another agent — for now we set state
  }

  return (
    <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md">
      <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
          Contacts
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCreate}
          className="text-cyan-400 hover:text-cyan-300 font-bold font-mono h-7 text-[10px] uppercase"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <ContactsSkeleton />
        ) : !contacts || contacts.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="p-3 rounded-full bg-slate-800/60 border border-white/5">
              <Contact2 className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold font-mono tracking-wider uppercase text-muted-foreground">
                No contacts yet
              </p>
              <p className="text-[10px] text-muted-foreground/75 max-w-[240px] leading-relaxed">
                Add stakeholders and key contacts for this customer.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[10px] uppercase mt-1"
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Add your first contact
            </Button>
          </div>
        ) : (
          /* Contact Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
