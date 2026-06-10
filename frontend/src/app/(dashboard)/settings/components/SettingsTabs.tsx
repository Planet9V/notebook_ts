'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useAnalytics } from '@/lib/hooks/use-analytics'

export function SettingsTabs() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { trackEvent } = useAnalytics()

  const tabs = useMemo(() => [
    { name: t('settings.tabGeneral', 'General'), href: '/settings' },
    { name: t('settings.tabApiKeys', 'API Keys & Models'), href: '/settings/api-keys' },
    { name: t('settings.tabPipeline', 'Pipeline'), href: '/settings/pipeline' },
    { name: t('settings.tabPublications', 'Publications'), href: '/settings/publications' },
    { name: 'Voice AI', href: '/settings/voice' },
    { name: 'Style Guides', href: '/settings/styleguides' },
    { name: 'Containers', href: '/settings/containers' },
    { name: 'System Logs', href: '/settings/logs' },
  ], [t])

  useEffect(() => {
    const activeTab = tabs.find((tab) => pathname === tab.href)
    if (activeTab) {
      trackEvent('workspace_tab_changed', {
        workspace: 'settings',
        tab_name: activeTab.name,
      })
    }
  }, [pathname, trackEvent, tabs])

  return (
    <div className="flex items-center gap-1 border-b border-sidebar-border/20 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 -mb-[2px] shrink-0",
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
  )
}
