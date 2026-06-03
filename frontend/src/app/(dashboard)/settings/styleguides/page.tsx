'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Palette,
  Type,
  Layout,
  FileText,
  Sparkles,
  Download,
  X,
} from 'lucide-react'
import { useStyleguides, useCreateStyleguide, useUpdateStyleguide, useDeleteStyleguide } from '@/lib/hooks/use-styleguides'
import { StyleGuide, StyleGuideCreate, GUIDE_TYPES, PAGE_SIZES, HEADING_STYLES, COLOR_SCHEMES } from '@/lib/types/styleguide'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DataPageSkeleton } from '@/components/common/DataPageSkeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const EMPTY_FORM: StyleGuideCreate = {
  name: '',
  description: '',
  guide_type: 'report',
  title_font: 'Inter',
  body_font: 'Inter',
  title_size: '24pt',
  heading_size: '18pt',
  subheading_size: '14pt',
  body_size: '11pt',
  line_spacing: '1.5',
  logo_url: '',
  strapline: '',
  primary_color: '#1a73e8',
  secondary_color: '#34a853',
  accent_color: '#fbbc04',
  page_size: 'letter',
  page_orientation: 'portrait',
  margin_top: '1in',
  margin_bottom: '1in',
  margin_left: '1in',
  margin_right: '1in',
  heading_style: 'bold',
  color_scheme: 'dark',
  include_toc: true,
  include_page_numbers: true,
}

export default function StyleGuidesPage() {
  const { data: styleguides = [], isLoading } = useStyleguides()
  const createMutation = useCreateStyleguide()
  const updateMutation = useUpdateStyleguide()
  const deleteMutation = useDeleteStyleguide()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<StyleGuideCreate>({ ...EMPTY_FORM })
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  const openEdit = (sg: StyleGuide) => {
    setEditingId(sg.id)
    setForm({
      name: sg.name,
      description: sg.description,
      guide_type: sg.guide_type,
      title_font: sg.title_font,
      body_font: sg.body_font,
      title_size: sg.title_size,
      heading_size: sg.heading_size,
      subheading_size: sg.subheading_size,
      body_size: sg.body_size,
      line_spacing: sg.line_spacing,
      logo_url: sg.logo_url,
      strapline: sg.strapline,
      primary_color: sg.primary_color,
      secondary_color: sg.secondary_color,
      accent_color: sg.accent_color,
      page_size: sg.page_size,
      page_orientation: sg.page_orientation,
      margin_top: sg.margin_top,
      margin_bottom: sg.margin_bottom,
      margin_left: sg.margin_left,
      margin_right: sg.margin_right,
      heading_style: sg.heading_style,
      color_scheme: sg.color_scheme,
      include_toc: sg.include_toc,
      include_page_numbers: sg.include_page_numbers,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name?.trim()) return
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: form })
        toast.success('Style guide updated')
      } else {
        await createMutation.mutateAsync(form)
        toast.success('Style guide created')
      }
      setDialogOpen(false)
    } catch {
      toast.error('Failed to save style guide')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Style guide deleted')
      setDeleteConfirm(null)
    } catch {
      toast.error('Failed to delete style guide')
    }
  }

  const updateForm = (field: keyof StyleGuideCreate, value: StyleGuideCreate[keyof StyleGuideCreate]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Build the HTML preview of a style guide
  const renderPreview = (sg: StyleGuide) => {
    const headingTransform = sg.heading_style === 'caps' ? 'text-transform: uppercase;' : sg.heading_style === 'underline' ? 'text-decoration: underline;' : 'font-weight: bold;'
    const bgColor = sg.color_scheme === 'dark' ? '#1a1a2e' : sg.color_scheme === 'brand' ? sg.primary_color + '08' : '#ffffff'
    const textColor = sg.color_scheme === 'dark' ? '#e0e0e0' : '#1a1a1a'

    return `
<!DOCTYPE html>
<html>
<head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=${sg.title_font?.replace(/\s/g, '+')}:wght@400;600;700&family=${sg.body_font?.replace(/\s/g, '+')}:wght@400;500&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: '${sg.body_font}', sans-serif;
    font-size: ${sg.body_size};
    line-height: ${sg.line_spacing};
    color: ${textColor};
    background: ${bgColor};
    padding: ${sg.margin_top} ${sg.margin_right} ${sg.margin_bottom} ${sg.margin_left};
    max-width: ${sg.page_size === 'letter' ? '8.5in' : sg.page_size === 'a4' ? '210mm' : '8.5in'};
    margin: 0 auto;
  }
  h1 { font-family: '${sg.title_font}', sans-serif; font-size: ${sg.title_size}; color: ${sg.primary_color}; ${headingTransform} margin-bottom: 0.5em; }
  h2 { font-family: '${sg.title_font}', sans-serif; font-size: ${sg.heading_size}; color: ${sg.secondary_color}; ${headingTransform} margin: 1.2em 0 0.4em; }
  h3 { font-family: '${sg.title_font}', sans-serif; font-size: ${sg.subheading_size}; color: ${sg.accent_color}; margin: 1em 0 0.3em; }
  p { margin-bottom: 0.8em; }
  .strapline { font-style: italic; color: ${sg.secondary_color}; margin-bottom: 1.5em; font-size: 1.1em; }
  .toc { border-left: 3px solid ${sg.primary_color}; padding-left: 1em; margin: 1.5em 0; }
  .toc a { display: block; color: ${sg.primary_color}; text-decoration: none; margin: 0.3em 0; }
  .accent-box { background: ${sg.primary_color}15; border: 1px solid ${sg.primary_color}30; border-radius: 8px; padding: 1em; margin: 1em 0; }
  .footer { border-top: 1px solid ${sg.primary_color}30; padding-top: 0.5em; margin-top: 2em; font-size: 0.8em; color: #888; display: flex; justify-content: space-between; }
  ul { padding-left: 1.5em; margin-bottom: 0.8em; }
  li { margin-bottom: 0.3em; }
</style>
</head>
<body>
  <h1>${sg.name || 'Document Title'}</h1>
  ${sg.strapline ? `<p class="strapline">${sg.strapline}</p>` : ''}
  
  ${sg.include_toc ? `
  <div class="toc">
    <strong>Table of Contents</strong>
    <a href="#">1. Executive Summary</a>
    <a href="#">2. Analysis & Findings</a>
    <a href="#">3. Recommendations</a>
    <a href="#">4. Appendix</a>
  </div>` : ''}

  <h2>1. Executive Summary</h2>
  <p>This document demonstrates the visual formatting of the <strong>${sg.name}</strong> style guide. Typography, color palette, and layout rules are applied according to specification.</p>
  
  <div class="accent-box">
    <h3>Key Highlights</h3>
    <ul>
      <li>Title font: <strong>${sg.title_font}</strong> at ${sg.title_size}</li>
      <li>Body font: <strong>${sg.body_font}</strong> at ${sg.body_size}</li>
      <li>Primary color: <span style="color:${sg.primary_color}">${sg.primary_color}</span></li>
      <li>Page: ${sg.page_size} ${sg.page_orientation}</li>
    </ul>
  </div>

  <h2>2. Analysis & Findings</h2>
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
  
  <h3>2.1 Sub-section Example</h3>
  <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.</p>

  <h2>3. Recommendations</h2>
  <ul>
    <li>Implement the primary color palette across all materials</li>
    <li>Use ${sg.title_font} for all headings and display text</li>
    <li>Maintain ${sg.line_spacing} line spacing for optimal readability</li>
    <li>Follow ${sg.heading_style} heading style consistently</li>
  </ul>

  ${sg.include_page_numbers ? `
  <div class="footer">
    <span>${sg.name} — Style Guide Preview</span>
    <span>Page 1 of 1</span>
  </div>` : ''}
</body>
</html>`
  }

  const previewGuide = previewId ? styleguides.find((s) => s.id === previewId) : null

  return (
    <AppShell>
      <div className="container max-w-7xl mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Style Guides
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Define typography, colors, and layout rules for document outputs.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Style Guide
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <DataPageSkeleton layout="cards-grid" count={3} />
        )}

        {/* Empty State */}
        {!isLoading && styleguides.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Palette className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No Style Guides Yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Create your first style guide to define typography, colors, and layout rules for your research outputs.
              </p>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Style Guide
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Style Guide Cards */}
        {!isLoading && styleguides.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {styleguides.map((sg) => (
              <Card key={sg.id} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                {/* Color Strip */}
                <div className="h-2 w-full flex">
                  <div className="flex-1" style={{ background: sg.primary_color }} />
                  <div className="flex-1" style={{ background: sg.secondary_color }} />
                  <div className="flex-1" style={{ background: sg.accent_color }} />
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{sg.name}</CardTitle>
                      {sg.description && (
                        <CardDescription className="mt-1 text-xs line-clamp-2">
                          {sg.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {GUIDE_TYPES.find((t) => t.value === sg.guide_type)?.label || sg.guide_type}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Typography Summary */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Type className="h-3.5 w-3.5" />
                    <span>{sg.title_font} / {sg.body_font}</span>
                  </div>

                  {/* Layout Summary */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Layout className="h-3.5 w-3.5" />
                    <span>{PAGE_SIZES.find((p) => p.value === sg.page_size)?.label || sg.page_size} · {sg.page_orientation}</span>
                  </div>

                  {/* Color Swatches */}
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full border border-border" style={{ background: sg.primary_color }} title="Primary" />
                    <div className="h-5 w-5 rounded-full border border-border" style={{ background: sg.secondary_color }} title="Secondary" />
                    <div className="h-5 w-5 rounded-full border border-border" style={{ background: sg.accent_color }} title="Accent" />
                    <span className="text-[10px] text-muted-foreground ml-1">{sg.color_scheme} mode</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setPreviewId(sg.id)} className="flex-1 gap-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(sg)} className="flex-1 gap-1.5 text-xs">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(sg.id)} className="text-destructive hover:text-destructive gap-1.5 text-xs px-2">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ─── Create/Edit Dialog ─── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Style Guide' : 'Create Style Guide'}</DialogTitle>
              <DialogDescription>
                Configure typography, branding, layout, and content rules.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="mt-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="general" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  General
                </TabsTrigger>
                <TabsTrigger value="typography" className="gap-1.5">
                  <Type className="h-3.5 w-3.5" />
                  Typography
                </TabsTrigger>
                <TabsTrigger value="branding" className="gap-1.5">
                  <Palette className="h-3.5 w-3.5" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="layout" className="gap-1.5">
                  <Layout className="h-3.5 w-3.5" />
                  Layout
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. Enterprise Report" />
                  </div>
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select value={form.guide_type} onValueChange={(v) => updateForm('guide_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GUIDE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description || ''} onChange={(e) => updateForm('description', e.target.value)} placeholder="Describe when to use this style guide..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Strapline / Tagline</Label>
                  <Input value={form.strapline || ''} onChange={(e) => updateForm('strapline', e.target.value)} placeholder="e.g. Powering the future of energy intelligence" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Heading Style</Label>
                    <Select value={form.heading_style} onValueChange={(v) => updateForm('heading_style', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HEADING_STYLES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color Scheme</Label>
                    <Select value={form.color_scheme} onValueChange={(v) => updateForm('color_scheme', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLOR_SCHEMES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.include_toc} onCheckedChange={(v) => updateForm('include_toc', v)} />
                    Include Table of Contents
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.include_page_numbers} onCheckedChange={(v) => updateForm('include_page_numbers', v)} />
                    Include Page Numbers
                  </label>
                </div>
              </TabsContent>

              {/* Typography Tab */}
              <TabsContent value="typography" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title Font</Label>
                    <Input value={form.title_font || ''} onChange={(e) => updateForm('title_font', e.target.value)} placeholder="Inter" />
                  </div>
                  <div className="space-y-2">
                    <Label>Body Font</Label>
                    <Input value={form.body_font || ''} onChange={(e) => updateForm('body_font', e.target.value)} placeholder="Inter" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Title Size</Label>
                    <Input value={form.title_size || ''} onChange={(e) => updateForm('title_size', e.target.value)} placeholder="24pt" className="text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Heading Size</Label>
                    <Input value={form.heading_size || ''} onChange={(e) => updateForm('heading_size', e.target.value)} placeholder="18pt" className="text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Subheading</Label>
                    <Input value={form.subheading_size || ''} onChange={(e) => updateForm('subheading_size', e.target.value)} placeholder="14pt" className="text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Body Size</Label>
                    <Input value={form.body_size || ''} onChange={(e) => updateForm('body_size', e.target.value)} placeholder="11pt" className="text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Line Spacing</Label>
                  <Input value={form.line_spacing || ''} onChange={(e) => updateForm('line_spacing', e.target.value)} placeholder="1.5" className="w-32" />
                </div>

                {/* Typography Preview */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p style={{ fontFamily: form.title_font, fontSize: form.title_size, fontWeight: 'bold' }}>
                      Title Text ({form.title_font} {form.title_size})
                    </p>
                    <p style={{ fontFamily: form.title_font, fontSize: form.heading_size, fontWeight: 600 }}>
                      Heading Text ({form.heading_size})
                    </p>
                    <p style={{ fontFamily: form.title_font, fontSize: form.subheading_size }}>
                      Subheading Text ({form.subheading_size})
                    </p>
                    <p style={{ fontFamily: form.body_font, fontSize: form.body_size, lineHeight: form.line_spacing }}>
                      Body text sample — {form.body_font} at {form.body_size} with {form.line_spacing} line spacing. This is how your document content will appear.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Branding Tab */}
              <TabsContent value="branding" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.primary_color || '#1a73e8'} onChange={(e) => updateForm('primary_color', e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                      <Input value={form.primary_color || ''} onChange={(e) => updateForm('primary_color', e.target.value)} className="text-xs font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.secondary_color || '#34a853'} onChange={(e) => updateForm('secondary_color', e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                      <Input value={form.secondary_color || ''} onChange={(e) => updateForm('secondary_color', e.target.value)} className="text-xs font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.accent_color || '#fbbc04'} onChange={(e) => updateForm('accent_color', e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                      <Input value={form.accent_color || ''} onChange={(e) => updateForm('accent_color', e.target.value)} className="text-xs font-mono" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input value={form.logo_url || ''} onChange={(e) => updateForm('logo_url', e.target.value)} placeholder="https://..." />
                </div>

                {/* Color Preview */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Palette Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-16 w-16 rounded-lg shadow-md" style={{ background: form.primary_color }} />
                        <span className="text-[10px] text-muted-foreground">Primary</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-16 w-16 rounded-lg shadow-md" style={{ background: form.secondary_color }} />
                        <span className="text-[10px] text-muted-foreground">Secondary</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-16 w-16 rounded-lg shadow-md" style={{ background: form.accent_color }} />
                        <span className="text-[10px] text-muted-foreground">Accent</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Layout Tab */}
              <TabsContent value="layout" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Page Size</Label>
                    <Select value={form.page_size} onValueChange={(v) => updateForm('page_size', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Orientation</Label>
                    <Select value={form.page_orientation} onValueChange={(v) => updateForm('page_orientation', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Top Margin</Label>
                    <Input value={form.margin_top || ''} onChange={(e) => updateForm('margin_top', e.target.value)} placeholder="1in" className="text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Bottom</Label>
                    <Input value={form.margin_bottom || ''} onChange={(e) => updateForm('margin_bottom', e.target.value)} placeholder="1in" className="text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Left</Label>
                    <Input value={form.margin_left || ''} onChange={(e) => updateForm('margin_left', e.target.value)} placeholder="1in" className="text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Right</Label>
                    <Input value={form.margin_right || ''} onChange={(e) => updateForm('margin_right', e.target.value)} placeholder="1in" className="text-xs" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={!form.name?.trim() || createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && <LoadingSpinner size="sm" className="mr-2" />}
                {editingId ? 'Save Changes' : 'Create Style Guide'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Preview Dialog ─── */}
        <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  {previewGuide?.name} — Preview
                </DialogTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      if (!previewGuide) return
                      const html = renderPreview(previewGuide)
                      const printWindow = window.open('', '_blank')
                      if (printWindow) {
                        printWindow.document.write(html)
                        printWindow.document.close()
                        setTimeout(() => printWindow.print(), 500)
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Print / PDF
                  </Button>
                </div>
              </div>
              <DialogDescription>
                HTML preview with all style guide rules applied. Use Print/PDF to export.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6">
              {previewGuide && (
                <div className="border rounded-lg overflow-hidden mt-4" style={{ height: '65vh' }}>
                  <iframe
                    srcDoc={renderPreview(previewGuide)}
                    className="w-full h-full"
                    title="Style Guide Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Delete Confirmation ─── */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Style Guide?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The style guide will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
