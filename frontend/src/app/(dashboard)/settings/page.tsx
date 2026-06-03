'use client'

import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { SettingsForm } from './components/SettingsForm'
import { useSettings } from '@/lib/hooks/use-settings'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { refetch } = useSettings()
  const pathname = usePathname()

  useEffect(() => {
    document.title = 'Settings | Tetrel'
  }, [])

  const tabs = [
    { name: t('settings.tabGeneral', 'General Configuration'), href: '/settings' },
    { name: t('settings.tabApiKeys', 'API Keys & Models'), href: '/settings/api-keys' },
    { name: t('settings.tabPipeline', 'Pipeline Automations'), href: '/settings/pipeline' },
  ]

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
            <div className="flex items-center gap-1 border-b border-sidebar-border/20 mb-6">
              {tabs.map((tab) => {
                const active = pathname === tab.href
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 -mb-[2px]",
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.name}
                  </Link>
                )
              })}
            </div>

            <SettingsForm />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
