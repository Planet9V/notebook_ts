'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Settings2, Mail, Users, ChevronRight } from 'lucide-react'
import { Customer, CISA_SECTORS, COMPLIANCE_FRAMEWORKS, SECTOR_FRAMEWORK_MAP } from '../data'
import { useContacts } from '@/lib/hooks/use-contacts'

interface ProfileTabProps {
  customer: Customer
  isEditingSettings: boolean
  setIsEditingSettings: (v: boolean) => void
  editPrimarySector: string
  setEditPrimarySector: (v: string) => void
  editSectors: string[]
  setEditSectors: (v: string[]) => void
  editFrameworks: string[]
  setEditFrameworks: (v: string[]) => void
  handleSaveSettings: () => void
  onNavigateToContacts?: (contactId?: string) => void
}

export function ProfileTab({
  customer,
  isEditingSettings,
  setIsEditingSettings,
  editPrimarySector,
  setEditPrimarySector,
  editSectors,
  setEditSectors,
  editFrameworks,
  setEditFrameworks,
  handleSaveSettings,
  onNavigateToContacts,
}: ProfileTabProps) {
  // Use first-class contact table instead of embedded customer.contacts[]
  const customerId = customer.id || ''
  const { data: contacts, isLoading: contactsLoading } = useContacts(customerId)
  const contactCount = contacts?.length ?? 0
  const previewContacts = contacts?.slice(0, 3) ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
      <div className="lg:col-span-2 space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
        <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md">
          <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Corporate Profile</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setIsEditingSettings(!isEditingSettings)} className="text-cyan-400 hover:text-cyan-300 font-bold font-mono h-7 text-[10px] uppercase">
              <Settings2 className="h-3.5 w-3.5 mr-1" />
              {isEditingSettings ? 'Cancel Edit' : 'Edit Sectors & Standards'}
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4 font-sans text-xs text-muted-foreground/90 leading-relaxed">
            
            {isEditingSettings ? (
              <div className="space-y-4 font-mono text-xs">
                {/* Sector Settings */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-200 block">Primary Sector</label>
                  <select 
                    value={editPrimarySector} 
                    onChange={(e) => setEditPrimarySector(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-200 font-mono text-xs"
                  >
                    {CISA_SECTORS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Multi Select Sectors */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-200 block">Mapped CISA Infrastructure Sectors (Multi-select)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-slate-950/50 border border-white/5 rounded-lg max-h-48 overflow-y-auto">
                    {CISA_SECTORS.map(s => {
                      const isChecked = editSectors.includes(s)
                      return (
                        <label key={s} className="flex items-center gap-2 cursor-pointer hover:text-slate-100 transition-all py-1 select-none">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditSectors(editSectors.filter(sec => sec !== s))
                              } else {
                                setEditSectors([...editSectors, s])
                              }
                            }}
                            className="rounded bg-slate-900 border-white/10 text-cyan-500 focus:ring-0 focus:ring-offset-0 animate-none"
                          />
                          <span>{s}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Auto-Suggested Frameworks based on Sectors */}
                {(() => {
                  const suggested = new Set<string>()
                  editSectors.forEach(s => {
                    (SECTOR_FRAMEWORK_MAP[s] || []).forEach(f => suggested.add(f))
                  })
                  const suggestedArr = Array.from(suggested)
                  const unsuggestedCount = editFrameworks.filter(f => !suggested.has(f)).length
                  return suggestedArr.length > 0 ? (
                    <div className="p-3 border border-cyan-500/20 bg-cyan-500/5 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-cyan-400 block text-[10px] uppercase tracking-widest">⚡ Auto-Suggested Frameworks from Selected Sectors</label>
                        <button
                          type="button"
                          onClick={() => {
                            const merged = new Set([...editFrameworks, ...suggestedArr])
                            setEditFrameworks(Array.from(merged))
                          }}
                          className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider px-2 py-1 border border-cyan-500/20 rounded hover:bg-cyan-500/10 transition-all"
                        >
                          Apply All Suggestions
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedArr.map(fwId => {
                          const fwDef = COMPLIANCE_FRAMEWORKS.find(f => f.id === fwId)
                          const isAlreadySelected = editFrameworks.includes(fwId)
                          return (
                            <button
                              key={fwId}
                              type="button"
                              onClick={() => {
                                if (isAlreadySelected) {
                                  setEditFrameworks(editFrameworks.filter(id => id !== fwId))
                                } else {
                                  setEditFrameworks([...editFrameworks, fwId])
                                }
                              }}
                              className={`px-2 py-1 rounded text-[9px] font-mono font-bold transition-all ${
                                isAlreadySelected
                                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                                  : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30'
                              }`}
                            >
                              {isAlreadySelected ? '✓ ' : '+ '}{fwDef?.name || fwId}
                            </button>
                          )
                        })}
                      </div>
                      {unsuggestedCount > 0 && (
                        <p className="text-[9px] text-muted-foreground italic">+ {unsuggestedCount} additional framework(s) manually selected</p>
                      )}
                    </div>
                  ) : null
                })()}

                {/* Multi Select Compliance Frameworks */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-200 block">Assigned CSET Frameworks</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-slate-950/50 border border-white/5 rounded-lg max-h-48 overflow-y-auto">
                    {COMPLIANCE_FRAMEWORKS.map(fw => {
                      const isChecked = editFrameworks.includes(fw.id)
                      // Highlight if sector-recommended
                      const isRecommended = editSectors.some(s => (SECTOR_FRAMEWORK_MAP[s] || []).includes(fw.id))
                      return (
                        <label key={fw.id} className={`flex items-center gap-2 cursor-pointer hover:text-slate-100 transition-all py-1 select-none ${isRecommended && !isChecked ? 'text-cyan-400/60' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditFrameworks(editFrameworks.filter(id => id !== fw.id))
                              } else {
                                setEditFrameworks([...editFrameworks, fw.id])
                              }
                            }}
                            className="rounded bg-slate-900 border-white/10 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                          />
                          <span className="truncate">{fw.name}{isRecommended ? ' ★' : ''}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <Button onClick={handleSaveSettings} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase w-full py-2">
                  Commit Settings &amp; Setup Assessments
                </Button>
              </div>
            ) : (
              <div className="space-y-3 font-sans">
                <p>{customer.description || 'No corporate description file has been uploaded for this client yet.'}</p>
                <Separator className="bg-white/5 my-4" />
                <div className="font-mono text-[10.5px] space-y-2">
                  <span className="font-bold text-slate-300 block uppercase tracking-wider">Sector Coverage Profile</span>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.sectors && customer.sectors.length > 0 ? (
                      customer.sectors.map(s => (
                        <Badge key={s} variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-bold">
                          {s.toUpperCase()}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">No sectors assigned.</span>
                    )}
                  </div>
                </div>
                
                <div className="font-mono text-[10.5px] space-y-2 mt-4">
                  <span className="font-bold text-slate-300 block uppercase tracking-wider">Active Standard Scopes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.assigned_frameworks && customer.assigned_frameworks.length > 0 ? (
                      customer.assigned_frameworks.map(fw => (
                        <Badge key={fw} variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-bold">
                          {fw}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">No standard frameworks assigned.</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="lg:col-span-1 space-y-4 animate-in fade-in slide-in-from-bottom duration-300" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        {/* Unified Stakeholder Contacts — data from contact table, not embedded array */}
        <Card className="shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md">
          <CardHeader className="pb-2 border-b border-white/5 bg-slate-950/20 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Stakeholder Contacts
                {contactCount > 0 && (
                  <Badge variant="outline" className="text-[8px] border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-bold ml-1">
                    {contactCount}
                  </Badge>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {contactsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="p-3 border border-white/5 bg-slate-950/40 rounded-lg space-y-2">
                    <div className="h-3.5 w-28 rounded bg-slate-700/50 animate-pulse" />
                    <div className="h-2.5 w-20 rounded bg-slate-700/50 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : contactCount === 0 ? (
              <div className="flex flex-col items-center py-6 text-center space-y-2">
                <Users className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-[10px] text-muted-foreground italic">No stakeholders registered for this corporate client.</p>
                {onNavigateToContacts && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onNavigateToContacts()}
                    className="text-cyan-400 hover:text-cyan-300 font-bold font-mono h-7 text-[10px] uppercase mt-1"
                  >
                    Add contacts →
                  </Button>
                )}
              </div>
            ) : (
              <>
                {previewContacts.map((contact) => (
                  <div key={contact.id} className="p-3 border border-white/5 bg-slate-950/40 rounded-lg space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500/20" />
                    <div className="pl-1 space-y-1">
                      {onNavigateToContacts ? (
                        <button
                          onClick={() => onNavigateToContacts(contact.id)}
                          className="font-bold text-slate-200 hover:text-cyan-400 hover:underline text-left focus:outline-none transition-colors"
                        >
                          {contact.full_name}
                        </button>
                      ) : (
                        <p className="font-bold text-slate-200">{contact.full_name}</p>
                      )}
                      {contact.title && (
                        <p className="text-[10px] text-muted-foreground">{contact.title}</p>
                      )}
                      
                      {(contact.customer_name || contact.location_name || (contact.location_names && contact.location_names.length > 0)) && (
                        <div className="text-[9.5px] text-cyan-400/90 font-mono mt-1 space-y-0.5">
                          {contact.customer_name && (
                            <p className="truncate"><span className="text-muted-foreground/60">Company:</span> {contact.customer_name}</p>
                          )}
                          {contact.location_names && contact.location_names.length > 0 ? (
                            <p className="truncate"><span className="text-muted-foreground/60">Locations:</span> {contact.location_names.join(', ')}</p>
                          ) : contact.location_name ? (
                            <p className="truncate"><span className="text-muted-foreground/60">Location:</span> {contact.location_name}</p>
                          ) : null}
                        </div>
                      )}

                      <Separator className="bg-white/5 my-2" />
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-[9.5px] text-cyan-400 hover:underline flex items-center gap-1.5 font-mono select-all">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {contactCount > 3 && onNavigateToContacts && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onNavigateToContacts()}
                    className="w-full text-cyan-400 hover:text-cyan-300 font-bold font-mono h-7 text-[10px] uppercase border border-white/5 hover:border-cyan-500/20 transition-all"
                  >
                    View all {contactCount} contacts
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
                {contactCount <= 3 && onNavigateToContacts && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onNavigateToContacts()}
                    className="w-full text-muted-foreground hover:text-cyan-300 font-mono h-6 text-[9px] uppercase"
                  >
                    Manage contacts →
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
