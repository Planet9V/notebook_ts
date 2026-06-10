'use client'

import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { SettingsForm } from './components/SettingsForm'
import { useSettings } from '@/lib/hooks/use-settings'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { SettingsTabs } from './components/SettingsTabs'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { refetch } = useSettings()

  useEffect(() => {
    document.title = 'Settings | Tetrel'
  }, [])

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">{t('navigation.settings')}</h1>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4.5 w-4.5" />
              </Button>
            </div>

            {/* Sub Navigation Tabs */}
            <SettingsTabs />

            <SettingsForm />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
