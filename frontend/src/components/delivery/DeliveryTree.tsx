'use client'

import { useState, useMemo } from 'react'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useLocations } from '@/lib/hooks/use-locations'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useResearchItems } from '@/lib/hooks/use-research-items'
import { Location } from '@/lib/types/location'
import { Customer } from '@/lib/types/customer'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building,
  MapPin,
  FileText,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Compass,
  ArrowRight,
  Loader2,
} from 'lucide-react'

interface DeliveryTreeProps {
  onSelectLocation?: (locationId: string | null) => void
  onSelectCustomer?: (customerId: string | null) => void
  activeLocationId?: string | null
  activeCustomerId?: string | null
  onAttachDocument?: (customerId: string, locationId: string) => void
  singleCustomerId?: string
}

export function DeliveryTree({
  onSelectLocation,
  onSelectCustomer,
  activeLocationId,
  activeCustomerId,
  onAttachDocument,
  singleCustomerId,
}: DeliveryTreeProps) {
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers()
  const { data: allLocations = [], isLoading: loadingLocations } = useLocations()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({})

  // Toggle customer expansion
  const toggleCustomer = (customerId: string) => {
    setExpandedCustomers((prev) => ({
      ...prev,
      [customerId]: !prev[customerId],
    }))
  }

  // Filter locations by search term
  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return allLocations
    return allLocations.filter((loc) =>
      loc.facility_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.organization_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [allLocations, searchTerm])

  // Get customers that have locations matching the filter
  const activeCustomers = useMemo(() => {
    let list = customers
    if (singleCustomerId) {
      list = customers.filter((c) => c.id === singleCustomerId)
    }
    if (!searchTerm.trim()) return list
    const matchingCustomerIds = new Set(
      filteredLocations.map((loc) => loc.customer_id).filter(Boolean)
    )
    return list.filter((cust) => matchingCustomerIds.has(cust.id))
  }, [customers, filteredLocations, searchTerm, singleCustomerId])

  // Automatically expand customers if there is a search term active or single customer view
  const isCustomerExpanded = (customerId: string) => {
    if (searchTerm.trim() || singleCustomerId === customerId) return true
    return !!expandedCustomers[customerId]
  }

  const isLoading = loadingCustomers || loadingLocations

  return (
    <div className="flex flex-col h-full bg-slate-950/40 border border-white/5 rounded-xl backdrop-blur-md overflow-hidden font-mono text-xs">
      {/* Header Search */}
      <div className="p-4 border-b border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Project Delivery Hierarchy
          </span>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            type="text"
            placeholder="Search facilities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-slate-900/60 border-white/5 text-xs text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-cyan-500/35 focus-visible:ring-1 focus-visible:ring-offset-0 h-9"
          />
        </div>
      </div>

      {/* Tree Content */}
      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-slate-800/60 rounded w-1/3" />
                <div className="h-3 bg-slate-800/40 rounded w-1/2 ml-4" />
              </div>
            ))}
          </div>
        ) : activeCustomers.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground/60 space-y-2">
            <Building className="h-6 w-6 mx-auto text-muted-foreground/30" />
            <p className="text-[10px] uppercase font-bold tracking-wider">No matching facilities</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeCustomers.map((customer) => {
              const customerLocs = filteredLocations.filter((loc) => loc.customer_id === customer.id)
              const isExpanded = isCustomerExpanded(customer.id)
              const isSelected = activeCustomerId === customer.id

              return (
                <div key={customer.id} className="space-y-1">
                  {/* Customer Row */}
                  <div
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                        : 'hover:bg-white/5 border border-transparent text-slate-300'
                    }`}
                    onClick={() => {
                      onSelectCustomer?.(customer.id)
                      onSelectLocation?.(null)
                      toggleCustomer(customer.id)
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      )}
                      <Building className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="font-bold truncate text-[11px]">{customer.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] border-white/5 text-muted-foreground px-1 h-4">
                      {customerLocs.length}
                    </Badge>
                  </div>

                  {/* Locations list under customer */}
                  {isExpanded && (
                    <div className="pl-4 space-y-1 border-l border-white/5 ml-3.5 pt-1">
                      {customerLocs.length === 0 ? (
                        <p className="text-[9px] text-muted-foreground/40 italic p-1">No facilities listed</p>
                      ) : (
                        customerLocs.map((loc) => (
                          <FacilityNode
                            key={loc.id}
                            location={loc}
                            activeLocationId={activeLocationId}
                            onSelectLocation={onSelectLocation}
                            onAttachDocument={onAttachDocument}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// Facility Sub-Node (Lazy loaded on expand)
function FacilityNode({
  location,
  activeLocationId,
  onSelectLocation,
  onAttachDocument,
}: {
  location: Location
  activeLocationId?: string | null
  onSelectLocation?: (locationId: string | null) => void
  onAttachDocument?: (customerId: string, locationId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  
  // Queries are only enabled when this node is expanded
  const { data: notebooks = [], isLoading: loadingNotebooks } = useNotebooks(
    { location_id: location.id },
    { enabled: expanded }
  )
  const { data: researchItems = [], isLoading: loadingResearch } = useResearchItems(
    { location_id: location.id },
    { enabled: expanded }
  )

  const isSelected = activeLocationId === location.id
  const totalChildren = notebooks.length + researchItems.length

  return (
    <div className="space-y-1">
      {/* Location Row */}
      <div
        className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors group ${
          isSelected
            ? 'bg-cyan-500/5 text-cyan-400 font-bold border border-cyan-500/15'
            : 'hover:bg-white/5 border border-transparent text-slate-400'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onSelectLocation?.(location.id)
          setExpanded(!expanded)
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {expanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-slate-600" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />
          )}
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="truncate text-[10px]">{location.facility_name}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {location.facility_type && (
            <span className="text-[8px] px-1 py-0.5 rounded border border-white/5 text-slate-500 bg-slate-950/20 font-sans uppercase">
              {location.facility_type}
            </span>
          )}
          {onAttachDocument && (
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 rounded hover:bg-slate-800 text-slate-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                if (location.customer_id) {
                  onAttachDocument(location.customer_id, location.id)
                }
              }}
              title="Attach document to facility"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Child Nodes */}
      {expanded && (
        <div className="pl-4 space-y-1 border-l border-white/5 ml-3 pt-0.5">
          {loadingNotebooks || loadingResearch ? (
            <div className="flex items-center gap-1.5 p-1 text-[9px] text-muted-foreground/60">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              <span>Loading details...</span>
            </div>
          ) : totalChildren === 0 ? (
            <p className="text-[8px] text-muted-foreground/30 italic p-1">No linked notebooks or research</p>
          ) : (
            <>
              {/* Render Notebooks */}
              {notebooks.map((nb) => (
                <div
                  key={nb.id}
                  className="flex items-center justify-between p-1 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-3 w-3 shrink-0 text-indigo-400/80" />
                    <span className="truncate text-[9px]">{nb.name}</span>
                  </div>
                  {nb.stage && (
                    <Badge variant="outline" className="text-[8px] border-indigo-500/10 text-indigo-400 bg-indigo-500/5 px-1 py-0 h-3.5 uppercase font-sans">
                      {nb.stage}
                    </Badge>
                  )}
                </div>
              ))}

              {/* Render Research Items */}
              {researchItems.map((ri) => (
                <div
                  key={ri.id}
                  className="flex items-center justify-between p-1 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ClipboardList className="h-3 w-3 shrink-0 text-emerald-400/80" />
                    <span className="truncate text-[9px]">{ri.name}</span>
                  </div>
                  {ri.category && (
                    <Badge variant="outline" className="text-[8px] border-emerald-500/10 text-emerald-400 bg-emerald-500/5 px-1 py-0 h-3.5 uppercase font-sans">
                      {ri.category}
                    </Badge>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
