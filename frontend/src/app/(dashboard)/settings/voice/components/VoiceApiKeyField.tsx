'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, EyeOff, Save, Loader2, CheckCircle2, Trash2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  useCredentialsByProvider,
  useCreateCredential,
  useUpdateCredential,
  useDeleteCredential,
  useTestCredential,
} from '@/lib/hooks/use-credentials'

interface VoiceApiKeyFieldProps {
  provider: string
  providerLabel: string
  modalities: string[]
  docsUrl?: string
  docsLabel?: string
}

/**
 * Reusable API key field for voice config cards.
 * Integrates with the credential system to save/load/test API keys.
 */
export function VoiceApiKeyField({
  provider,
  providerLabel,
  modalities,
  docsUrl,
  docsLabel,
}: VoiceApiKeyFieldProps) {
  const { data: credentials, isLoading } = useCredentialsByProvider(provider)
  const createCredential = useCreateCredential()
  const updateCredential = useUpdateCredential()
  const deleteCredential = useDeleteCredential()
  const { testCredential, isPending: isTesting, testResults } = useTestCredential()

  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Find the first credential for this provider
  const existingCred = credentials?.[0] ?? null
  const hasKey = existingCred?.has_api_key ?? false
  const testResult = existingCred ? testResults[existingCred.id] : undefined

  // Reset editing state when credential loads
  useEffect(() => {
    if (existingCred && !isEditing) {
      setApiKey('')
    }
  }, [existingCred, isEditing])

  const handleSave = () => {
    if (!apiKey.trim()) return

    if (existingCred) {
      // Update existing credential
      updateCredential.mutate(
        { credentialId: existingCred.id, data: { api_key: apiKey, modalities } },
        {
          onSuccess: () => {
            setApiKey('')
            setIsEditing(false)
          },
        }
      )
    } else {
      // Create new credential
      createCredential.mutate(
        {
          name: `${providerLabel} (Voice)`,
          provider,
          modalities,
          api_key: apiKey,
        },
        {
          onSuccess: () => {
            setApiKey('')
            setIsEditing(false)
          },
        }
      )
    }
  }

  const handleDelete = () => {
    if (!existingCred) return
    deleteCredential.mutate(
      { credentialId: existingCred.id, options: { delete_models: true } },
      {
        onSuccess: () => {
          setApiKey('')
          setIsEditing(false)
        },
      }
    )
  }

  const handleTest = () => {
    if (existingCred) {
      testCredential(existingCred.id)
    }
  }

  const isSaving = createCredential.isPending || updateCredential.isPending
  const isDeleting = deleteCredential.isPending

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">API Key</Label>
        <div className="h-8 bg-sidebar-accent/10 rounded-md animate-pulse" />
      </div>
    )
  }

  // Has existing credential — show status
  if (hasKey && !isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">API Key</Label>
          <Badge
            variant="outline"
            className="text-[10px] border-emerald-500/40 text-emerald-400 gap-1"
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
            Configured
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value="••••••••••••••••"
            readOnly
            type="password"
            className="h-8 text-xs font-mono bg-sidebar-accent/20 flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2"
            onClick={() => setIsEditing(true)}
          >
            Update
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2 text-red-400 hover:text-red-300 hover:border-red-500/40"
                disabled={isDeleting}
                aria-label="Delete API key"
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the {providerLabel} API key and associated model configurations. You will need to re-enter the key to use {providerLabel} services.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
            onClick={handleTest}
            disabled={isTesting}
          >
            {isTesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Test Connection
          </Button>
          {testResult && (
            <span
              className={cn(
                'text-[10px] font-mono',
                testResult.success ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {testResult.success ? '✓ Connected' : `✗ ${testResult.message}`}
            </span>
          )}
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {docsLabel || 'Docs'} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    )
  }

  // No credential or editing — show editable form
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        {providerLabel} API Key
        {isEditing && (
          <button
            onClick={() => { setIsEditing(false); setApiKey('') }}
            className="ml-2 text-[10px] text-muted-foreground hover:text-foreground underline"
          >
            Cancel
          </button>
        )}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type={showKey ? 'text' : 'password'}
            placeholder={`Enter ${providerLabel} API key...`}
            className="h-8 text-xs font-mono pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Button
          size="sm"
          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700"
          onClick={handleSave}
          disabled={!apiKey.trim() || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1" />
              Save
            </>
          )}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {isEditing
          ? 'Enter a new API key to replace the existing one.'
          : `Saved securely (encrypted). Also configurable via Settings → Models & API Keys.`}
      </p>
    </div>
  )
}
