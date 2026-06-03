'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Edit,
  Plus,
  Plug,
  Loader2,
  Check,
  X,
  Key,
  Code,
  Bot,
} from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useTestCredential, useCredential } from '@/lib/hooks/use-credentials'
import { Credential } from '@/lib/api/credentials'
import { Model, ModelDefaults } from '@/lib/types/models'
import { cn } from '@/lib/utils'
import { CredentialFormDialog } from './CredentialFormDialog'
import {
  PROVIDER_DISPLAY_NAMES,
  PROVIDER_DOCS,
} from '../constants'

export interface CompactProviderRowProps {
  provider: string
  credentials: Credential[]
  models: Model[]
  defaults: ModelDefaults | null
  allCredentials: Credential[]
  encryptionReady: boolean
}

// =============================================================================
// Compact Provider Row (single-line table row per provider)
// =============================================================================

export function CompactProviderRow({
  provider,
  credentials,
  models,
  defaults,
  allCredentials,
  encryptionReady,
}: CompactProviderRowProps) {
  const { t } = useTranslation()
  const { testCredential, isPending: isTestPending, testResults } = useTestCredential()
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editCredential, setEditCredential] = useState<Credential | null>(null)
  const { data: fullCredential } = useCredential(editOpen && editCredential ? editCredential.id : '')

  const displayName = PROVIDER_DISPLAY_NAMES[provider] || provider
  const hasCredentials = credentials.length > 0
  const firstCred = credentials[0]

  // Models linked to any credential of this provider
  const providerModels = models.filter(m =>
    credentials.some(c => c.id === m.credential)
  )
  const modelCount = providerModels.length
  const testResult = firstCred ? testResults[firstCred.id] : undefined

  const docsUrl = PROVIDER_DOCS[provider]

  return (
    <>
      <div className={cn(
        'grid grid-cols-[1fr_90px_80px_90px_140px_100px] items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
        hasCredentials
          ? 'bg-card border-sidebar-border/60 hover:border-sidebar-border'
          : 'bg-card/50 border-dashed border-sidebar-border/30 opacity-70 hover:opacity-100'
      )}>
        {/* Provider name */}
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            'w-2 h-2 rounded-full shrink-0',
            hasCredentials ? 'bg-emerald-500' : 'bg-muted-foreground/30'
          )} />
          <span className="font-medium text-sm truncate">{displayName}</span>
        </div>

        {/* Status column */}
        <div>
          {hasCredentials ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] py-0 px-1.5">
              <Check className="h-2.5 w-2.5 mr-0.5" />
              Active
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Key column */}
        <div>
          {hasCredentials && firstCred?.has_api_key ? (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-0.5">
              <Key className="h-2.5 w-2.5" />
              Set
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Models column */}
        <div>
          {modelCount > 0 ? (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-0.5">
              <Bot className="h-2.5 w-2.5" />
              {modelCount}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">0</span>
          )}
        </div>

        {/* Test column */}
        <div className="flex items-center gap-1.5">
          {hasCredentials ? (
            <>
              <Button
                variant="outline" size="sm"
                className="h-6 px-2 text-[10px] gap-1"
                onClick={() => firstCred && testCredential(firstCred.id)}
                disabled={isTestPending || !!firstCred?.decryption_error}
              >
                {isTestPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Plug className="h-3 w-3" />
                }
                Test
              </Button>
              {testResult && (
                testResult.success ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] py-0 px-1.5 gap-0.5 animate-in fade-in duration-300">
                    <Check className="h-2.5 w-2.5" />
                    Pass
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 gap-0.5 animate-in fade-in duration-300">
                    <X className="h-2.5 w-2.5" />
                    Fail
                  </Badge>
                )
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Actions column */}
        <div className="flex items-center gap-0.5 justify-end">
          {hasCredentials ? (
            <Button
              variant="ghost" size="sm"
              className="h-7 w-7 p-0"
              onClick={() => { setEditCredential(firstCred); setEditOpen(true) }}
              disabled={!!firstCred?.decryption_error}
              title={t('common.edit')}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost" size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setAddOpen(true)}
              disabled={!encryptionReady}
              title={t('apiKeys.addConfig')}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="API Docs"
            >
              <Code className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      {editOpen && editCredential && (
        <CredentialFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          provider={provider}
          credential={fullCredential || editCredential}
        />
      )}

      {/* Add dialog */}
      {addOpen && (
        <CredentialFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          provider={provider}
        />
      )}
    </>
  )
}
