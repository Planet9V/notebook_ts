'use client'

import { AppSidebar } from './AppSidebar'
import { SetupBanner } from './SetupBanner'
import { VoiceChatPanel } from '@/components/voice/VoiceChatPanel'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip-to-content link for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <main
        id="main-content"
        role="main"
        aria-label="Main content"
        className="flex-1 flex flex-col min-h-0 overflow-hidden tetrel-page-enter"
      >
        <SetupBanner />
        <Breadcrumbs className="px-6 pt-3" />
        {children}
      </main>
      <VoiceChatPanel />
    </div>
  )
}
