'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useImport, type ImportStep } from '@/lib/hooks/use-import'
import { PIPELINE_STAGES, STAGE_LABELS } from '@/lib/constants/stages'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WizardContainer, type WizardStep } from '@/components/ui/wizard-container'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Download,
  X,
  RefreshCw,
  FileWarning,
  Users,
  BookOpen,
} from 'lucide-react'

interface ImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WIZARD_STEPS: readonly WizardStep[] = [
  { number: 1, title: 'Upload', description: 'Select CSV or XLSX file' },
  { number: 2, title: 'Map Columns', description: 'Match columns to fields' },
  { number: 3, title: 'Options', description: 'Configure import settings' },
  { number: 4, title: 'Import', description: 'Review and execute' },
] as const

const STEP_TO_NUMBER: Record<ImportStep, number> = {
  upload: 1,
  mapping: 2,
  preview: 3,
  importing: 4,
  results: 4,
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ─── Step 1: File Upload ─────────────────────────────────────────────── */

function UploadStep({
  onFileDrop,
  file,
  isLoading,
  error,
}: {
  onFileDrop: (file: File) => void
  file: File | null
  isLoading: boolean
  error: string | null
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) {
        const f = accepted[0]
        if (f.size > MAX_FILE_SIZE) {
          return // react-dropzone validator handles this
        }
        onFileDrop(f)
      }
    },
    [onFileDrop]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  })

  const sizeError = fileRejections.find((r) =>
    r.errors.some((e) => e.code === 'file-too-large')
  )

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <div
        {...getRootProps()}
        className={`w-full max-w-lg border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-sidebar-border hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        <input {...getInputProps()} />
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Parsing file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isDragActive ? 'Drop file here' : 'Drag & drop your file here'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse · CSV, XLSX, XLS · Max 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File info after selection */}
      {file && !isLoading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 border border-sidebar-border w-full max-w-lg">
          <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)} · {file.type || 'CSV/XLSX'}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-primary border-primary/30">
            <Check className="h-3 w-3 mr-1" /> Parsed
          </Badge>
        </div>
      )}

      {/* Error display */}
      {(error || sizeError) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm w-full max-w-lg">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p>{error || 'File exceeds 10MB limit'}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Step 2: Column Mapping ──────────────────────────────────────────── */

function MappingStep({
  preview,
  mapping,
  onUpdateMapping,
  onRemoveMapping,
}: {
  preview: NonNullable<ReturnType<typeof useImport>['state']['preview']>
  mapping: Record<string, string>
  onUpdateMapping: (col: string, field: string) => void
  onRemoveMapping: (col: string) => void
}) {
  const allFields = [...preview.available_customer_fields, ...preview.available_contact_fields]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Column Mapping</h3>
          <p className="text-xs text-muted-foreground">
            {preview.total_rows} rows detected · Map source columns to target fields
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {Object.keys(mapping).length} / {preview.columns.length} mapped
        </Badge>
      </div>

      <Separator />

      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-2">
        {preview.columns.map((col, idx) => {
          const samples = preview.sample_rows
            .slice(0, 3)
            .map((row) => row[idx] || '')
            .filter(Boolean)

          return (
            <div
              key={col}
              className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center p-3 rounded-lg bg-muted/30 border border-sidebar-border/50 hover:border-sidebar-border transition-colors"
            >
              {/* Source column */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{col}</p>
                {samples.length > 0 && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-mono">
                    {samples.join(' · ')}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

              {/* Target field selector */}
              <Select
                value={mapping[col] || '__skip__'}
                onValueChange={(val) => {
                  if (val === '__skip__') {
                    onRemoveMapping(col)
                  } else {
                    onUpdateMapping(col, val)
                  }
                }}
              >
                <SelectTrigger className="w-full text-xs h-8">
                  <SelectValue placeholder="Skip this column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__skip__">
                    <span className="text-muted-foreground italic">Skip this column</span>
                  </SelectItem>
                  {allFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step 3: Options ─────────────────────────────────────────────────── */

function OptionsStep({
  options,
  onUpdate,
}: {
  options: ReturnType<typeof useImport>['state']['options']
  onUpdate: (updates: Partial<typeof options>) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Import Options</h3>
        <p className="text-xs text-muted-foreground">Configure how imported records are handled</p>
      </div>

      <Separator />

      {/* Create notebooks */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="create-notebooks"
          checked={options.create_notebooks}
          onCheckedChange={(checked) =>
            onUpdate({ create_notebooks: checked === true })
          }
          className="mt-0.5"
        />
        <div>
          <Label htmlFor="create-notebooks" className="text-sm font-medium cursor-pointer">
            Create notebook for each customer
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-create a pipeline notebook for each imported customer
          </p>
        </div>
      </div>

      {/* Default stage */}
      {options.create_notebooks && (
        <div className="grid grid-cols-2 gap-4 pl-7">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Default Stage</Label>
            <Select
              value={options.notebook_stage}
              onValueChange={(val) => onUpdate({ notebook_stage: val })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Separator />

      {/* Duplicate strategy */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Duplicate Handling</Label>
        <RadioGroup
          value={options.duplicate_strategy}
          onValueChange={(val) =>
            onUpdate({ duplicate_strategy: val as 'skip' | 'update' | 'create' })
          }
          className="grid gap-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="skip" id="dup-skip" />
            <Label htmlFor="dup-skip" className="text-xs cursor-pointer">
              Skip duplicates (keep existing)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="update" id="dup-update" />
            <Label htmlFor="dup-update" className="text-xs cursor-pointer">
              Update existing with new data
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="create" id="dup-create" />
            <Label htmlFor="dup-create" className="text-xs cursor-pointer">
              Create duplicates (allow all)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      {/* Default classification */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Customer Type</Label>
          <Select
            value={options.default_customer_type}
            onValueChange={(val) => onUpdate({ default_customer_type: val })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tier</Label>
          <Select
            value={options.default_tier}
            onValueChange={(val) => onUpdate({ default_tier: val })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="mid_market">Mid-Market</SelectItem>
              <SelectItem value="smb">SMB</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label>
          <Input
            className="h-8 text-xs"
            placeholder="e.g. q1-import, utilities"
            value={options.tags.join(', ')}
            onChange={(e) =>
              onUpdate({
                tags: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Step 4: Preview & Execute / Results ─────────────────────────────── */

function PreviewStep({
  state,
  onExecute,
  isImporting,
}: {
  state: ReturnType<typeof useImport>['state']
  onExecute: () => void
  isImporting: boolean
}) {
  const { preview, mapping, options, result } = state
  const mappedCount = Object.keys(mapping).length
  const isResults = state.step === 'results'
  const isRunning = state.step === 'importing'

  // Download errors as CSV
  const downloadErrors = () => {
    if (!result?.errors.length) return
    const header = 'Row,Field,Error,Data\n'
    const rows = result.errors
      .map((e) => `${e.row},"${e.field || ''}","${e.error}","${JSON.stringify(e.data || {})}"`)
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import_errors_${result.batch_id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isRunning) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="p-5 rounded-full bg-primary/10 border border-primary/20">
          <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">Importing records...</p>
          <p className="text-xs text-muted-foreground">
            Processing {preview?.total_rows || 0} rows. This may take a moment.
          </p>
        </div>
        <Progress value={undefined} className="w-64 animate-pulse" />
      </div>
    )
  }

  if (isResults && result) {
    const hasErrors = result.errors.length > 0
    const hasWarnings = result.warnings.length > 0

    return (
      <div className="space-y-5">
        {/* Success header */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <div className="p-2 rounded-full bg-emerald-500/20">
            <Check className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Import Complete</p>
            <p className="text-xs text-muted-foreground">
              Batch ID: <span className="font-mono">{result.batch_id}</span>
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={<Users className="h-4 w-4" />} label="Created" value={result.customers_created} color="text-emerald-400" />
          <StatCard icon={<RefreshCw className="h-4 w-4" />} label="Updated" value={result.customers_updated} color="text-blue-400" />
          <StatCard icon={<X className="h-4 w-4" />} label="Skipped" value={result.customers_skipped} color="text-muted-foreground" />
          <StatCard icon={<BookOpen className="h-4 w-4" />} label="Notebooks" value={result.notebooks_created} color="text-violet-400" />
        </div>

        {result.contacts_created > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Users className="h-3 w-3" />
            {result.contacts_created} contacts created
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {result.warnings.slice(0, 10).map((w, i) => (
                <p key={i} className="text-[10px] text-muted-foreground font-mono">
                  Row {w.row}: {w.warning}
                </p>
              ))}
              {result.warnings.length > 10 && (
                <p className="text-[10px] text-muted-foreground italic">
                  ...and {result.warnings.length - 10} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Errors */}
        {hasErrors && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
                <FileWarning className="h-3.5 w-3.5" />
                {result.errors.length} error{result.errors.length > 1 ? 's' : ''}
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={downloadErrors}>
                <Download className="h-3 w-3 mr-1" /> Download
              </Button>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {result.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-[10px] text-muted-foreground font-mono">
                  Row {e.row}: {e.error}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Default: preview summary before executing
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Review Import</h3>
        <p className="text-xs text-muted-foreground">
          Confirm settings before starting the import
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-muted/30 border border-sidebar-border/50 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">File</p>
          <p className="text-sm font-medium text-foreground">{preview?.file_name}</p>
          <p className="text-xs text-muted-foreground">{preview?.total_rows} rows · {mappedCount} columns mapped</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/30 border border-sidebar-border/50 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Settings</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Duplicates: <span className="text-foreground font-medium">{options.duplicate_strategy}</span></p>
            <p>Notebooks: <span className="text-foreground font-medium">{options.create_notebooks ? 'Yes' : 'No'}</span></p>
            <p>Type: <span className="text-foreground font-medium">{options.default_customer_type}</span></p>
          </div>
        </div>
      </div>

      {/* Mapped columns summary */}
      <div className="p-4 rounded-lg bg-muted/30 border border-sidebar-border/50">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Column Mappings</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(mapping).map(([col, field]) => (
            <Badge key={col} variant="outline" className="text-[10px] font-mono">
              {col} → {field.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <Button onClick={onExecute} disabled={isImporting} size="lg" className="px-8">
          <Upload className="h-4 w-4 mr-2" />
          Start Import ({preview?.total_rows} rows)
        </Button>
      </div>
    </div>
  )
}

/* ─── StatCard helper ─────────────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-sidebar-border/50 text-center space-y-1">
      <div className={`flex justify-center ${color}`}>{icon}</div>
      <p className="text-lg font-bold font-mono text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  )
}

/* ─── Main Wizard ─────────────────────────────────────────────────────── */

export function ImportWizard({ open, onOpenChange }: ImportWizardProps) {
  const {
    state,
    isPreviewLoading,
    isImporting,
    setFile,
    updateMapping,
    removeMapping,
    updateOptions,
    goToPreview,
    goBackToMapping,
    executeImport,
    reset,
  } = useImport()

  const currentStepNumber = STEP_TO_NUMBER[state.step]

  const handleClose = () => {
    onOpenChange(false)
    // Reset after dialog close animation
    setTimeout(reset, 300)
  }

  const handleStepClick = (step: number) => {
    if (step < currentStepNumber) {
      if (step === 1) reset()
      if (step === 2) goBackToMapping()
    }
  }

  // Navigate between options (step 3) and preview (step 4)
  const goToOptions = () => {
    // The hook uses 'preview' for step 3 (options + preview merged)
    // We track options step separately via wizard step number
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Customers
          </DialogTitle>
        </DialogHeader>

        <WizardContainer
          currentStep={currentStepNumber}
          steps={WIZARD_STEPS}
          onStepClick={handleStepClick}
          className="border-0 rounded-none h-[520px]"
        >
          {/* Step 1: Upload */}
          {state.step === 'upload' && (
            <UploadStep
              onFileDrop={setFile}
              file={state.file}
              isLoading={isPreviewLoading}
              error={state.error}
            />
          )}

          {/* Step 2: Mapping */}
          {state.step === 'mapping' && state.preview && (
            <MappingStep
              preview={state.preview}
              mapping={state.mapping}
              onUpdateMapping={updateMapping}
              onRemoveMapping={removeMapping}
            />
          )}

          {/* Step 3: Options — hook uses 'preview' step for both options and preview */}
          {state.step === 'preview' && (
            <OptionsStep options={state.options} onUpdate={updateOptions} />
          )}

          {/* Step 4: Importing / Results */}
          {(state.step === 'importing' || state.step === 'results') && (
            <PreviewStep
              state={state}
              onExecute={executeImport}
              isImporting={isImporting}
            />
          )}
        </WizardContainer>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/30">
          <div>
            {state.step === 'mapping' && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Back
              </Button>
            )}
            {state.step === 'preview' && (
              <Button variant="ghost" size="sm" onClick={goBackToMapping}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Back to Mapping
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {state.step === 'results' && (
              <Button variant="outline" size="sm" onClick={reset}>
                <RefreshCw className="h-3 w-3 mr-1" /> Import Another
              </Button>
            )}
            {state.step === 'mapping' && (
              <Button size="sm" onClick={goToPreview} disabled={Object.keys(state.mapping).length === 0}>
                Options <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
            {state.step === 'preview' && (
              <Button size="sm" onClick={executeImport} disabled={isImporting}>
                <Upload className="h-3 w-3 mr-1" /> Start Import
              </Button>
            )}
            {(state.step === 'results' || state.step === 'upload') && (
              <Button variant="outline" size="sm" onClick={handleClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
