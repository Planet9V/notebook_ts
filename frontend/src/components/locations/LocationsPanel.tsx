'use client'

import { useState, useMemo } from 'react'
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from '@/lib/hooks/use-locations'
import { Location } from '@/lib/types/location'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  MapPin,
  Building,
  Plus,
  Pencil,
  Trash2,
  X,
  Compass,
  FileText,
  Globe2,
  Mail,
  Phone,
} from 'lucide-react'
import { CISA_SECTORS } from '@/app/(dashboard)/customers/[id]/data'
import { useContacts } from '@/lib/hooks/use-contacts'

interface LocationsPanelProps {
  customerId: string
  onNavigateToContacts?: (contactId?: string) => void
}

export function LocationsPanel({ customerId, onNavigateToContacts }: LocationsPanelProps) {
  const { data: locations = [], isLoading } = useLocations(customerId)
  const { data: contacts = [] } = useContacts(customerId)
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()
  const deleteLocation = useDeleteLocation()

  // Form Modal state
  const [formOpen, setFormOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  
  const [formData, setFormData] = useState({
    organization_name: '',
    facility_name: '',
    facility_type: '',
    sectors: [] as string[],
    address: '',
    country: 'US',
    zip_code: '',
    latitude: '',
    longitude: '',
    description: '',
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const handleOpenCreate = () => {
    setFormData({
      organization_name: '',
      facility_name: '',
      facility_type: '',
      sectors: [],
      address: '',
      country: 'US',
      zip_code: '',
      latitude: '',
      longitude: '',
      description: '',
    })
    setFormErrors({})
    setEditingLocation(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (loc: Location) => {
    setFormData({
      organization_name: loc.organization_name || '',
      facility_name: loc.facility_name || '',
      facility_type: loc.facility_type || '',
      sectors: loc.sectors || [],
      address: loc.address || '',
      country: loc.country || 'US',
      zip_code: loc.zip_code || '',
      latitude: loc.latitude !== null && loc.latitude !== undefined ? String(loc.latitude) : '',
      longitude: loc.longitude !== null && loc.longitude !== undefined ? String(loc.longitude) : '',
      description: loc.description || '',
    })
    setFormErrors({})
    setEditingLocation(loc)
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingLocation(null)
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const copy = { ...prev }
        delete copy[field]
        return copy
      })
    }
  }

  const handleSectorToggle = (sector: string) => {
    const current = formData.sectors
    if (current.includes(sector)) {
      handleFieldChange('sectors', current.filter((s) => s !== sector))
    } else {
      handleFieldChange('sectors', [...current, sector])
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.facility_name.trim()) {
      errors.facility_name = 'Facility name is required'
    }

    if (formData.latitude) {
      const lat = parseFloat(formData.latitude)
      if (isNaN(lat) || lat < -90.0 || lat > 90.0) {
        errors.latitude = 'Latitude must be a number between -90 and 90'
      }
    }

    if (formData.longitude) {
      const lon = parseFloat(formData.longitude)
      if (isNaN(lon) || lon < -180.0 || lon > 180.0) {
        errors.longitude = 'Longitude must be a number between -180 and 180'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const latVal = formData.latitude ? parseFloat(formData.latitude) : null
    const lonVal = formData.longitude ? parseFloat(formData.longitude) : null

    const payload = {
      customer_id: customerId,
      organization_name: formData.organization_name,
      facility_name: formData.facility_name,
      facility_type: formData.facility_type,
      sectors: formData.sectors,
      address: formData.address,
      country: formData.country,
      zip_code: formData.zip_code,
      latitude: latVal,
      longitude: lonVal,
      description: formData.description,
    }

    if (editingLocation) {
      updateLocation.mutate(
        { id: editingLocation.id, data: payload },
        { onSuccess: () => handleCloseForm() }
      )
    } else {
      createLocation.mutate(payload, {
        onSuccess: () => handleCloseForm(),
      })
    }
  }

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This will unlink associated contacts and clear compliance assessments for this facility.`)) {
      deleteLocation.mutate(id)
    }
  }

  const isPending = createLocation.isPending || updateLocation.isPending

  return (
    <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md animate-in fade-in slide-in-from-bottom duration-300">
      <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
          Facility Locations (CIF Nodes)
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleOpenCreate}
          className="text-cyan-400 hover:text-cyan-300 font-bold font-mono h-7 text-[10px] uppercase"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Location
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 border border-white/5 bg-slate-950/40 rounded-lg space-y-3 animate-pulse">
                <div className="h-4 w-32 bg-slate-800 rounded" />
                <div className="h-3 w-48 bg-slate-800 rounded" />
                <div className="h-3 w-20 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="p-3 rounded-full bg-slate-800/60 border border-white/5">
              <MapPin className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold font-mono tracking-wider uppercase text-muted-foreground">
                No Locations Registered
              </p>
              <p className="text-[10px] text-muted-foreground/75 max-w-[280px] leading-relaxed">
                Add facilities, physical locations, or organizational subdivisions to run location-specific compliance audits.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[10px] uppercase mt-1"
            >
              Add your first location
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc, index) => (
              <div
                key={loc.id}
                className="p-4 border border-white/5 bg-slate-950/45 rounded-lg space-y-3 relative group overflow-hidden animate-in fade-in slide-in-from-bottom duration-300"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                {/* Accent bar */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500/30 group-hover:bg-cyan-500 transition-colors" />

                <div className="pl-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {loc.organization_name && (
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest block">
                          {loc.organization_name}
                        </span>
                      )}
                      <h4 className="font-bold text-slate-200 text-sm font-mono mt-0.5">
                        {loc.facility_name}
                      </h4>
                      {loc.facility_type && (
                        <span className="text-[9px] font-mono text-cyan-400 font-semibold uppercase tracking-wider block mt-0.5">
                          {loc.facility_type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(loc)}
                        className="h-6 w-6 text-muted-foreground hover:text-cyan-400"
                        title="Edit Location"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(loc.id, loc.facility_name)}
                        className="h-6 w-6 text-muted-foreground hover:text-red-400"
                        title="Delete Location"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {loc.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {loc.description}
                    </p>
                  )}

                  <Separator className="bg-white/5" />

                  <div className="space-y-1.5 text-[10px] font-mono text-muted-foreground">
                    {loc.address && (
                      <div className="flex items-start gap-1.5">
                        <Building className="h-3 w-3 mt-0.5 text-slate-500 shrink-0" />
                        <span className="truncate">
                          {loc.address}
                          {loc.zip_code ? `, ${loc.zip_code}` : ''}
                          {loc.country ? ` (${loc.country})` : ''}
                        </span>
                      </div>
                    )}
                    
                    {(loc.latitude !== null || loc.longitude !== null) && (
                      <div className="flex items-center gap-1.5">
                        <Compass className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>
                          Lat: {loc.latitude ?? '—'}, Lon: {loc.longitude ?? '—'}
                        </span>
                      </div>
                    )}
                  </div>

                  {loc.sectors && loc.sectors.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {loc.sectors.map((sec) => (
                        <Badge
                          key={sec}
                          variant="outline"
                          className="text-[8px] font-mono border-slate-800 bg-slate-800/40 text-slate-400 px-1.5 py-0"
                        >
                          {sec}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {(() => {
                    const assocContacts = contacts.filter(
                      (c) => c.location_ids?.includes(loc.id) || c.location_id === loc.id
                    )
                    if (assocContacts.length === 0) return null
                    return (
                      <div className="space-y-1.5 pt-2 border-t border-white/5 animate-in fade-in duration-300">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest block font-bold">
                          Associated Contacts
                        </span>
                        <div className="space-y-2">
                          {assocContacts.map((contact) => (
                            <div key={contact.id} className="text-[10px] space-y-0.5 border-l border-cyan-500/20 pl-2 py-0.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onNavigateToContacts?.(contact.id)}
                                  className="font-bold text-cyan-400 hover:underline text-left hover:text-cyan-300 font-mono transition-colors focus:outline-none"
                                >
                                  {contact.full_name}
                                </button>
                                {contact.title && (
                                  <span className="text-[9px] text-muted-foreground/60 truncate max-w-[120px]" title={contact.title}>
                                    {contact.title}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground/75 font-mono">
                                {contact.email && (
                                  <a href={`mailto:${contact.email}`} className="hover:text-cyan-300 flex items-center gap-1 transition-colors">
                                    <Mail className="h-2.5 w-2.5 shrink-0 text-slate-500" />
                                    <span className="truncate max-w-[140px]">{contact.email}</span>
                                  </a>
                                )}
                                {contact.phone && (
                                  <a href={`tel:${contact.phone}`} className="hover:text-cyan-300 flex items-center gap-1 transition-colors">
                                    <Phone className="h-2.5 w-2.5 shrink-0 text-slate-500" />
                                    <span>{contact.phone}</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-xl shadow-2xl border-white/10 bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/5 bg-slate-950/40 flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {editingLocation ? 'Edit Facility Location' : 'Add Facility Location'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseForm}
                className="h-7 w-7 p-0 hover:bg-slate-800 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
              {/* Org Name / Facility Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={formData.organization_name}
                    onChange={(e) => handleFieldChange('organization_name', e.target.value)}
                    placeholder="Acme Grid Corp"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Facility Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.facility_name}
                    onChange={(e) => handleFieldChange('facility_name', e.target.value)}
                    placeholder="Houston Substation Delta"
                    className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35 ${
                      formErrors.facility_name ? 'border-red-500' : 'border-white/10'
                    }`}
                  />
                  {formErrors.facility_name && (
                    <p className="text-[9px] text-red-400 mt-0.5">{formErrors.facility_name}</p>
                  )}
                </div>
              </div>

              {/* Facility Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Facility Type / Classification
                </label>
                <input
                  type="text"
                  value={formData.facility_type}
                  onChange={(e) => handleFieldChange('facility_type', e.target.value)}
                  placeholder="Substation, Data Center, Water Intake Plant"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                />
              </div>

              {/* Sectors Multi-Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Associated CISA Sectors
                </label>
                <div className="p-3 border border-white/10 bg-slate-950 rounded-lg max-h-32 overflow-y-auto space-y-1.5">
                  {CISA_SECTORS.map((sec) => {
                    const active = formData.sectors.includes(sec)
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleSectorToggle(sec)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition-colors text-[10px] ${
                          active
                            ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/25'
                            : 'hover:bg-white/5 border border-transparent text-slate-300'
                        }`}
                      >
                        <span>{sec}</span>
                        {active && <span className="text-[9px]">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Address / Zip / Country */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="123 Industrial Parkway"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Zip/Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => handleFieldChange('zip_code', e.target.value)}
                    placeholder="77001"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                    placeholder="US"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35"
                  />
                </div>
              </div>

              {/* Latitude / Longitude */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => handleFieldChange('latitude', e.target.value)}
                    placeholder="29.7604"
                    className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35 ${
                      formErrors.latitude ? 'border-red-500' : 'border-white/10'
                    }`}
                  />
                  {formErrors.latitude && (
                    <p className="text-[9px] text-red-400 mt-0.5">{formErrors.latitude}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => handleFieldChange('longitude', e.target.value)}
                    placeholder="-95.3698"
                    className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35 ${
                      formErrors.longitude ? 'border-red-500' : 'border-white/10'
                    }`}
                  />
                  {formErrors.longitude && (
                    <p className="text-[9px] text-red-400 mt-0.5">{formErrors.longitude}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Facility Description / Operational Details
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Primary transmission hub supplying power to the industrial refining sector..."
                  rows={3}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35 resize-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/5 bg-slate-950/10 mt-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseForm}
                  className="font-mono text-xs hover:bg-slate-800 text-muted-foreground uppercase"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase"
                >
                  {isPending ? 'Saving...' : editingLocation ? 'Save Changes' : 'Create Location'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </Card>
  )
}
