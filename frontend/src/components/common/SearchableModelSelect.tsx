'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface ModelOption {
  id: string
  name: string
  provider: string
  context_length?: number | null
  pricing_prompt?: string | null
  pricing_completion?: string | null
  modality?: string | null
  description?: string | null
}

interface SearchableModelSelectProps {
  models: ModelOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  /** If true, show a clear (X) button when a value is selected */
  clearable?: boolean
  /** Group models by provider */
  groupByProvider?: boolean
  /** Sort order for models */
  sortBy?: 'name' | 'provider'
}

// Format context length for display
function formatContextLength(ctx: number | null | undefined): string | null {
  if (!ctx) return null
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(ctx % 1_000_000 === 0 ? 0 : 1)}M`
  if (ctx >= 1_000) return `${Math.round(ctx / 1_000)}K`
  return `${ctx}`
}

// Format pricing for display (per million tokens)
function formatPricing(prompt: string | null | undefined, completion: string | null | undefined): string | null {
  if (!prompt && !completion) return null
  const p = prompt ? parseFloat(prompt) : 0
  const c = completion ? parseFloat(completion) : 0
  if (p === 0 && c === 0) return 'FREE'
  if (p < 0) return null // special values like -1
  const perMillion = p * 1_000_000
  if (perMillion < 0.01) return '<$0.01/M'
  if (perMillion < 1) return `$${perMillion.toFixed(2)}/M`
  if (perMillion < 10) return `$${perMillion.toFixed(1)}/M`
  return `$${Math.round(perMillion)}/M`
}

export function SearchableModelSelect({
  models,
  value,
  onValueChange,
  placeholder = 'Select a model',
  emptyText = 'No models found.',
  className,
  triggerClassName,
  disabled = false,
  clearable = false,
  groupByProvider = true,
  sortBy = 'name',
}: SearchableModelSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedModel = React.useMemo(
    () => models.find((m) => m.id === value),
    [models, value]
  )

  // Group and sort models
  const groupedModels = React.useMemo(() => {
    const sorted = [...models].sort((a, b) => {
      if (sortBy === 'provider') {
        const provComp = a.provider.localeCompare(b.provider)
        return provComp !== 0 ? provComp : a.name.localeCompare(b.name)
      }
      return a.name.localeCompare(b.name)
    })

    if (!groupByProvider) {
      return { '': sorted }
    }

    const groups: Record<string, ModelOption[]> = {}
    for (const model of sorted) {
      const key = model.provider
      if (!groups[key]) groups[key] = []
      groups[key].push(model)
    }
    return groups
  }, [models, groupByProvider, sortBy])

  const providerKeys = React.useMemo(
    () => Object.keys(groupedModels).sort(),
    [groupedModels]
  )

  // Build trigger display
  const selectedCtx = selectedModel ? formatContextLength(selectedModel.context_length) : null
  const selectedPrice = selectedModel ? formatPricing(selectedModel.pricing_prompt, selectedModel.pricing_completion) : null

  return (
    <div className={cn('flex gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'h-9 w-full justify-between text-xs font-normal',
              !selectedModel && 'text-muted-foreground',
              triggerClassName
            )}
          >
            {selectedModel ? (
              <span className="flex items-center gap-2 truncate min-w-0">
                <span className="truncate">{selectedModel.name}</span>
                <span className="flex items-center gap-1 shrink-0">
                  {selectedCtx && (
                    <span className="text-[9px] px-1 py-0 rounded bg-muted text-muted-foreground">
                      {selectedCtx}
                    </span>
                  )}
                  {selectedPrice && (
                    <span className={cn(
                      "text-[9px] px-1 py-0 rounded",
                      selectedPrice === 'FREE'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {selectedPrice}
                    </span>
                  )}
                </span>
              </span>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 z-[60]"
          align="start"
          sideOffset={4}
        >
          <Command
            filter={(value, search) => {
              // Custom filter: search in model name, provider, and description
              const model = models.find((m) => m.id.toLowerCase() === value.toLowerCase())
              if (!model) return 0
              const haystack = `${model.name} ${model.provider} ${model.description || ''} ${model.modality || ''}`.toLowerCase()
              const terms = search.toLowerCase().split(/\s+/)
              return terms.every((term) => haystack.includes(term)) ? 1 : 0
            }}
          >
            <CommandInput placeholder="Search models..." className="h-8 text-xs" />
            <CommandList className="max-h-[320px]">
              <CommandEmpty className="py-4 text-xs">{emptyText}</CommandEmpty>
              {providerKeys.map((provider) => {
                const providerModels = groupedModels[provider]
                if (!providerModels?.length) return null

                return (
                  <CommandGroup
                    key={provider || 'all'}
                    heading={
                      provider ? (
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider font-semibold">
                            {provider}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            ({providerModels.length})
                          </span>
                        </span>
                      ) : undefined
                    }
                  >
                    {providerModels.map((model) => {
                      const ctx = formatContextLength(model.context_length)
                      const price = formatPricing(model.pricing_prompt, model.pricing_completion)

                      return (
                        <CommandItem
                          key={model.id}
                          value={model.id}
                          onSelect={() => {
                            onValueChange(model.id)
                            setOpen(false)
                          }}
                          className="text-xs py-1.5"
                        >
                          <Check
                            className={cn(
                              'mr-1.5 h-3 w-3 shrink-0',
                              value === model.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <span className="truncate flex-1 min-w-0">{model.name}</span>
                          <span className="flex items-center gap-1 ml-1 shrink-0">
                            {ctx && (
                              <span className="text-[9px] px-1 rounded bg-muted/50 text-muted-foreground">
                                {ctx}
                              </span>
                            )}
                            {price && (
                              <span className={cn(
                                "text-[9px] px-1 rounded",
                                price === 'FREE'
                                  ? 'bg-green-100/50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-muted/50 text-muted-foreground'
                              )}>
                                {price}
                              </span>
                            )}
                            {!groupByProvider && (
                              <span className="text-[10px] text-muted-foreground">
                                {model.provider}
                              </span>
                            )}
                          </span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {clearable && value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onValueChange('')}
          className="h-9 w-9 shrink-0"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
