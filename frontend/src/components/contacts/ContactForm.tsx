'use client'

import React, { useState, useEffect } from 'react'
import { Contact, ContactCreate, ContactUpdate } from '@/lib/types/contact'
import { useCreateContact, useUpdateContact } from '@/lib/hooks/use-contacts'
import { useLocations } from '@/lib/hooks/use-locations'
import { useCustomers } from '@/lib/hooks/use-customers'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Contact2, X } from 'lucide-react'

const SENIORITY_OPTIONS = [
  { value: 'c-suite', label: 'C-Suite' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
  { value: 'individual-contributor', label: 'Individual Contributor' },
  { value: 'other', label: 'Other' },
]

interface ContactFormProps {
  contact?: Contact
  customerId?: string
  onClose: () => void
}

export function ContactForm({ contact, customerId, onClose }: ContactFormProps) {
  const isEditMode = !!contact
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()
  const { data: customers = [] } = useCustomers()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const { data: locations = [] } = useLocations(selectedCustomerId || undefined)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    title: '',
    department: '',
    seniority: '',
    linkedin_url: '',
    location_ids: [] as string[],
  })

  // Populate form for edit mode
  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        title: contact.title || '',
        department: contact.department || '',
        seniority: contact.seniority || '',
        linkedin_url: contact.linkedin_url || '',
        location_ids: contact.location_ids || (contact.location_id ? [contact.location_id] : []),
      })
      setSelectedCustomerId(contact.customer_id || '')
    } else {
      setSelectedCustomerId(customerId || '')
    }
  }, [contact, customerId])

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const isPending = createContact.isPending || updateContact.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.first_name || !formData.last_name) return

    const { first_name, last_name, email, phone, mobile, title, department, seniority, linkedin_url, location_ids } = formData

    if (isEditMode && contact) {
      const updateData: ContactUpdate = {
        first_name,
        last_name,
        email,
        phone,
        mobile,
        title,
        department,
        seniority,
        linkedin_url,
        customer_id: selectedCustomerId || null,
        location_ids,
      }
      updateContact.mutate(
        { id: contact.id, data: updateData },
        { onSuccess: () => onClose() }
      )
    } else {
      const createData: ContactCreate = {
        first_name,
        last_name,
        email,
        phone,
        mobile,
        title,
        department,
        seniority,
        linkedin_url,
        customer_id: selectedCustomerId || null,
        location_ids,
      }
      createContact.mutate(createData, { onSuccess: () => onClose() })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg shadow-2xl border-white/10 bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Contact2 className="h-4.5 w-4.5 text-cyan-400" />
            <span className="text-sm font-bold font-mono tracking-wider uppercase text-foreground">
              {isEditMode ? 'Edit Contact' : 'Add Contact'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0 hover:bg-slate-800 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono"
        >
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                placeholder="Jane"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                placeholder="Doe"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="jane.doe@company.com"
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
            />
          </div>

          {/* Phone row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Mobile
              </label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => updateField('mobile', e.target.value)}
                placeholder="+1 (555) 111-1111"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
              />
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Professional info */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
              Professional Details
            </span>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Title / Role
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Director of Security Operations"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  placeholder="Information Security"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Seniority
                </label>
                <select
                  value={formData.seniority}
                  onChange={(e) => updateField('seniority', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/35"
                >
                  <option value="">Select level...</option>
                  {SENIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => updateField('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/janedoe"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Organization / Company
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value)
                  updateField('location_ids', []) // Reset locations when customer changes
                }}
                disabled={!!customerId}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/35 disabled:opacity-50"
              >
                <option value="">No linked organization (Unlinked)</option>
                {customers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Assigned Locations / Facilities
              </label>
              {!selectedCustomerId ? (
                <div className="text-muted-foreground/60 text-[10px] italic border border-white/5 bg-slate-950/40 rounded-lg p-3">
                  Please select an organization first.
                </div>
              ) : locations.length === 0 ? (
                <div className="text-muted-foreground/60 text-[10px] italic border border-white/5 bg-slate-950/40 rounded-lg p-3">
                  No locations found for this organization.
                </div>
              ) : (
                <div className="max-h-[140px] overflow-y-auto border border-white/10 bg-slate-950 rounded-lg p-2.5 space-y-2">
                  {locations.map((loc) => {
                    const isChecked = formData.location_ids.includes(loc.id)
                    return (
                      <label
                        key={loc.id}
                        className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-all duration-200 border ${
                          isChecked
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                            : 'hover:bg-slate-800/40 border-transparent text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...formData.location_ids, loc.id]
                              : formData.location_ids.filter((id) => id !== loc.id)
                            updateField('location_ids', newIds)
                          }}
                          className="mt-0.5 rounded border-white/10 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 focus:outline-none"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold leading-none truncate">
                            {loc.facility_name}
                          </span>
                          {loc.facility_type && (
                            <span className="text-[9px] text-muted-foreground/80 mt-1 font-mono leading-none">
                              Type: {loc.facility_type}
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/5 bg-slate-950/10 mt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="font-mono text-xs hover:bg-slate-800 text-muted-foreground uppercase"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase"
            >
              {isPending
                ? isEditMode
                  ? 'Saving...'
                  : 'Creating...'
                : isEditMode
                  ? 'Save Changes'
                  : 'Create Contact'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
