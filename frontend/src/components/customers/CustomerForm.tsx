'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Building,
  MapPin,
  Phone,
  DollarSign,
  Tags,
  Globe,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react'
import { useCreateCustomer, useUpdateCustomer } from '@/lib/hooks/use-customers'
import { Customer, CustomerCreate, CustomerUpdate } from '@/lib/types/customer'

interface CustomerFormProps {
  /** Existing customer for edit mode; omit for create mode. */
  customer?: Customer
  /** Called after successful submit or when the user cancels. */
  onClose: () => void
}

/* ------------------------------------------------------------------ */
/* Design-system input helpers                                        */
/* ------------------------------------------------------------------ */

const inputCls =
  'w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35 font-mono'

const labelCls = 'text-[10px] font-bold text-muted-foreground uppercase font-mono'

const sectionHeaderCls =
  'flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest font-mono w-full py-2 cursor-pointer hover:text-foreground transition-colors select-none'

/* ------------------------------------------------------------------ */
/* Form section wrapper with collapsible behaviour                    */
/* ------------------------------------------------------------------ */

function FormSection({
  icon: Icon,
  title,
  color,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType
  title: string
  color: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className={sectionHeaderCls}>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <span className={color}>{title}</span>
          <span className="flex-1" />
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pb-3 animate-in fade-in slide-in-from-top-1 duration-200">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ------------------------------------------------------------------ */
/* CustomerForm                                                       */
/* ------------------------------------------------------------------ */

export default function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const isEdit = !!customer
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()

  /* ---- Local form state ---- */
  const [form, setForm] = useState<CustomerCreate>({
    name: '',
    website: '',
    description: '',
    industry: 'Energy',
    primary_sector: '',
    sectors: [],
    assigned_frameworks: [],
    contacts: [],
    // Address
    street_address: '',
    street_address_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    // Communication
    phone: '',
    phone_alt: '',
    fax: '',
    email: '',
    // Sales
    salesperson: '',
    lead_source: '',
    annual_revenue: null,
    employee_count: null,
    // Classification
    customer_type: 'prospect',
    tier: 'smb',
    status: 'active',
    // Engagement
    last_contact_date: null,
    next_followup: null,
    engagement_score: 0,
    // Social
    linkedin_url: '',
    twitter_url: '',
    facebook_url: '',
    // Metadata
    tags: [],
    internal_notes: '',
    import_batch_id: null,
    import_source: null,
  })

  const [tagInput, setTagInput] = useState('')

  /* Pre-fill form when editing */
  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        website: customer.website || '',
        description: customer.description || '',
        industry: customer.industry || 'Energy',
        primary_sector: customer.primary_sector || '',
        sectors: customer.sectors || [],
        assigned_frameworks: customer.assigned_frameworks || [],
        contacts: customer.contacts || [],
        street_address: customer.street_address || '',
        street_address_2: customer.street_address_2 || '',
        city: customer.city || '',
        state: customer.state || '',
        postal_code: customer.postal_code || '',
        country: customer.country || 'US',
        phone: customer.phone || '',
        phone_alt: customer.phone_alt || '',
        fax: customer.fax || '',
        email: customer.email || '',
        salesperson: customer.salesperson || '',
        lead_source: customer.lead_source || '',
        annual_revenue: customer.annual_revenue,
        employee_count: customer.employee_count,
        customer_type: customer.customer_type || 'prospect',
        tier: customer.tier || 'smb',
        status: customer.status || 'active',
        last_contact_date: customer.last_contact_date,
        next_followup: customer.next_followup,
        engagement_score: customer.engagement_score || 0,
        linkedin_url: customer.linkedin_url || '',
        twitter_url: customer.twitter_url || '',
        facebook_url: customer.facebook_url || '',
        tags: customer.tags || [],
        internal_notes: customer.internal_notes || '',
        import_batch_id: customer.import_batch_id,
        import_source: customer.import_source,
      })
    }
  }, [customer])

  /* ---- Field setter helper ---- */
  const set = <K extends keyof CustomerCreate>(key: K, value: CustomerCreate[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  /* ---- Tag management ---- */
  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !(form.tags || []).includes(tag)) {
      set('tags', [...(form.tags || []), tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    set(
      'tags',
      (form.tags || []).filter((t) => t !== tag)
    )
  }

  /* ---- Submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    if (isEdit && customer) {
      const updateData: CustomerUpdate = { ...form }
      updateMutation.mutate(
        { id: customer.id.replace('customer:', ''), data: updateData },
        { onSuccess: onClose }
      )
    } else {
      createMutation.mutate(form, { onSuccess: onClose })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl shadow-2xl border-white/10 bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-slate-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Building className="h-4.5 w-4.5 text-cyan-400" />
            <span className="text-sm font-bold font-mono tracking-wider uppercase text-foreground">
              {isEdit ? 'Edit Customer' : 'Register Corporate Customer'}
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

        {/* Scrollable form body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-1 text-xs font-mono"
        >
          {/* ═══════ Core Fields (always open) ═══════ */}
          <FormSection icon={Building} title="Company Information" color="text-cyan-400" defaultOpen>
            <div className="space-y-1.5">
              <label className={labelCls}>Company Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Acme Industrial Utilities"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Industry Sector</label>
                <select
                  value={form.industry || ''}
                  onChange={(e) => set('industry', e.target.value)}
                  className={inputCls}
                >
                  <option value="Energy">Energy & Power</option>
                  <option value="Water">Water & Wastewater</option>
                  <option value="Transport">Transportation & Logistics</option>
                  <option value="Defense">Defense & Aerospace</option>
                  <option value="Nuclear">Nuclear Operations</option>
                  <option value="Chemical">Chemical & Biotech</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Financial">Financial Services</option>
                  <option value="Technology">Technology</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Website Domain</label>
                <input
                  type="url"
                  value={form.website || ''}
                  onChange={(e) => set('website', e.target.value)}
                  placeholder="https://acmeutility.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="info@acme.com"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Phone</label>
                <input
                  type="tel"
                  value={form.phone || ''}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Company Profile / Description</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Critical infrastructure grid details and operation profiles..."
                className={`${inputCls} leading-relaxed`}
                rows={2}
              />
            </div>
          </FormSection>

          <Separator className="bg-white/5" />

          {/* ═══════ Address ═══════ */}
          <FormSection icon={MapPin} title="Address" color="text-blue-400">
            <div className="space-y-1.5">
              <label className={labelCls}>Street Address</label>
              <input
                type="text"
                value={form.street_address || ''}
                onChange={(e) => set('street_address', e.target.value)}
                placeholder="123 Industrial Blvd"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Street Address 2</label>
              <input
                type="text"
                value={form.street_address_2 || ''}
                onChange={(e) => set('street_address_2', e.target.value)}
                placeholder="Suite 400"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  value={form.city || ''}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="Houston"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>State / Province</label>
                <input
                  type="text"
                  value={form.state || ''}
                  onChange={(e) => set('state', e.target.value)}
                  placeholder="TX"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Postal Code</label>
                <input
                  type="text"
                  value={form.postal_code || ''}
                  onChange={(e) => set('postal_code', e.target.value)}
                  placeholder="77001"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Country</label>
              <input
                type="text"
                value={form.country || 'US'}
                onChange={(e) => set('country', e.target.value)}
                placeholder="US"
                className={inputCls}
              />
            </div>
          </FormSection>

          <Separator className="bg-white/5" />

          {/* ═══════ Communication ═══════ */}
          <FormSection icon={Phone} title="Communication" color="text-green-400">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Alternate Phone</label>
                <input
                  type="tel"
                  value={form.phone_alt || ''}
                  onChange={(e) => set('phone_alt', e.target.value)}
                  placeholder="+1 (555) 000-0001"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Fax</label>
                <input
                  type="tel"
                  value={form.fax || ''}
                  onChange={(e) => set('fax', e.target.value)}
                  placeholder="+1 (555) 000-0002"
                  className={inputCls}
                />
              </div>
            </div>
          </FormSection>

          <Separator className="bg-white/5" />

          {/* ═══════ Sales / Ownership ═══════ */}
          <FormSection icon={DollarSign} title="Sales & Ownership" color="text-amber-400">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Salesperson</label>
                <input
                  type="text"
                  value={form.salesperson || ''}
                  onChange={(e) => set('salesperson', e.target.value)}
                  placeholder="John Smith"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Lead Source</label>
                <input
                  type="text"
                  value={form.lead_source || ''}
                  onChange={(e) => set('lead_source', e.target.value)}
                  placeholder="Conference, Referral, Cold Outreach..."
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Annual Revenue ($)</label>
                <input
                  type="number"
                  value={form.annual_revenue ?? ''}
                  onChange={(e) =>
                    set('annual_revenue', e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="1000000"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Employee Count</label>
                <input
                  type="number"
                  value={form.employee_count ?? ''}
                  onChange={(e) =>
                    set('employee_count', e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="500"
                  className={inputCls}
                />
              </div>
            </div>
          </FormSection>

          <Separator className="bg-white/5" />

          {/* ═══════ Classification ═══════ */}
          <FormSection icon={Tags} title="Classification" color="text-purple-400">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Customer Type</label>
                <select
                  value={form.customer_type || 'prospect'}
                  onChange={(e) => set('customer_type', e.target.value)}
                  className={inputCls}
                >
                  <option value="prospect">Prospect</option>
                  <option value="client">Client</option>
                  <option value="partner">Partner</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Tier</label>
                <select
                  value={form.tier || 'smb'}
                  onChange={(e) => set('tier', e.target.value)}
                  className={inputCls}
                >
                  <option value="enterprise">Enterprise</option>
                  <option value="mid_market">Mid-Market</option>
                  <option value="smb">SMB</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Status</label>
                <select
                  value={form.status || 'active'}
                  onChange={(e) => set('status', e.target.value)}
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="churned">Churned</option>
                </select>
              </div>
            </div>
          </FormSection>

          <Separator className="bg-white/5" />

          {/* ═══════ Social ═══════ */}
          <FormSection icon={Globe} title="Social & Web Presence" color="text-sky-400">
            <div className="space-y-1.5">
              <label className={labelCls}>LinkedIn URL</label>
              <input
                type="url"
                value={form.linkedin_url || ''}
                onChange={(e) => set('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/company/acme"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Twitter / X URL</label>
                <input
                  type="url"
                  value={form.twitter_url || ''}
                  onChange={(e) => set('twitter_url', e.target.value)}
                  placeholder="https://x.com/acme"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Facebook URL</label>
                <input
                  type="url"
                  value={form.facebook_url || ''}
                  onChange={(e) => set('facebook_url', e.target.value)}
                  placeholder="https://facebook.com/acme"
                  className={inputCls}
                />
              </div>
            </div>
          </FormSection>

          <Separator className="bg-white/5" />

          {/* ═══════ Tags & Notes ═══════ */}
          <FormSection icon={Tags} title="Tags & Internal Notes" color="text-rose-400">
            <div className="space-y-1.5">
              <label className={labelCls}>Tags</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Add tag and press Enter"
                  className={inputCls}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                  className="border-white/10 text-[10px] font-mono uppercase shrink-0"
                >
                  Add
                </Button>
              </div>
              {(form.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(form.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/60 border border-white/10 text-[10px] text-slate-300 font-mono"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Internal Notes</label>
              <textarea
                value={form.internal_notes || ''}
                onChange={(e) => set('internal_notes', e.target.value)}
                placeholder="Internal-only notes about this customer..."
                className={`${inputCls} leading-relaxed`}
                rows={3}
              />
            </div>
          </FormSection>

          {/* ═══════ Footer ═══════ */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5 mt-4">
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
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  {isEdit ? 'Saving...' : 'Registering...'}
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Confirm Registration'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
