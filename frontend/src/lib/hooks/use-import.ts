import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '@/lib/api/customers'
import { CUSTOMER_QUERY_KEYS } from '@/lib/hooks/use-customers'
import { useToast } from '@/lib/hooks/use-toast'
import {
  ImportPreviewResponse,
  ImportOptions,
  ImportExecuteRequest,
  ImportResultResponse,
} from '@/lib/types/import'

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'results'

export interface ImportState {
  step: ImportStep
  file: File | null
  preview: ImportPreviewResponse | null
  mapping: Record<string, string>
  options: ImportOptions
  result: ImportResultResponse | null
  error: string | null
}

const DEFAULT_OPTIONS: ImportOptions = {
  create_notebooks: true,
  notebook_stage: 'bulk_import',
  default_customer_type: 'prospect',
  default_tier: 'smb',
  default_lead_source: 'csv_import',
  duplicate_strategy: 'skip',
  tags: [],
}

export function useImport() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [state, setState] = useState<ImportState>({
    step: 'upload',
    file: null,
    preview: null,
    mapping: {},
    options: { ...DEFAULT_OPTIONS },
    result: null,
    error: null,
  })

  /* ── Mutations ─────────────────────────────────────────────────── */

  const previewMutation = useMutation({
    mutationFn: (file: File) => customersApi.importPreview(file),
    onSuccess: (data) => {
      setState((prev) => ({
        ...prev,
        step: 'mapping',
        preview: data,
        mapping: data.suggested_mapping,
        error: null,
      }))
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Failed to parse file'
      setState((prev) => ({ ...prev, error: msg }))
      toast({ title: 'Import Error', description: msg, variant: 'destructive' })
    },
  })

  const executeMutation = useMutation({
    mutationFn: ({ file, request }: { file: File; request: ImportExecuteRequest }) =>
      customersApi.importExecute(file, request),
    onSuccess: (data) => {
      setState((prev) => ({ ...prev, step: 'results', result: data, error: null }))
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all })
      toast({
        title: 'Import Complete',
        description: `Created ${data.customers_created} customers, ${data.contacts_created} contacts`,
      })
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Import failed'
      setState((prev) => ({ ...prev, step: 'mapping', error: msg }))
      toast({ title: 'Import Error', description: msg, variant: 'destructive' })
    },
  })

  /* ── Actions ───────────────────────────────────────────────────── */

  const setFile = useCallback((file: File) => {
    setState((prev) => ({ ...prev, file, error: null }))
    previewMutation.mutate(file)
  }, [])

  const updateMapping = useCallback((columnHeader: string, targetField: string) => {
    setState((prev) => ({
      ...prev,
      mapping: { ...prev.mapping, [columnHeader]: targetField },
    }))
  }, [])

  const removeMapping = useCallback((columnHeader: string) => {
    setState((prev) => {
      const newMapping = { ...prev.mapping }
      delete newMapping[columnHeader]
      return { ...prev, mapping: newMapping }
    })
  }, [])

  const updateOptions = useCallback((updates: Partial<ImportOptions>) => {
    setState((prev) => ({
      ...prev,
      options: { ...prev.options, ...updates },
    }))
  }, [])

  const goToPreview = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'preview' }))
  }, [])

  const goBackToMapping = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'mapping' }))
  }, [])

  const executeImport = useCallback(() => {
    if (!state.file || !state.preview) return
    setState((prev) => ({ ...prev, step: 'importing' }))
    executeMutation.mutate({
      file: state.file,
      request: {
        file_name: state.preview.file_name,
        column_mapping: state.mapping,
        options: state.options,
      },
    })
  }, [state.file, state.preview, state.mapping, state.options])

  const reset = useCallback(() => {
    setState({
      step: 'upload',
      file: null,
      preview: null,
      mapping: {},
      options: { ...DEFAULT_OPTIONS },
      result: null,
      error: null,
    })
  }, [])

  return {
    state,
    isPreviewLoading: previewMutation.isPending,
    isImporting: executeMutation.isPending,
    setFile,
    updateMapping,
    removeMapping,
    updateOptions,
    goToPreview,
    goBackToMapping,
    executeImport,
    reset,
  }
}
