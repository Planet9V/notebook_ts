'use client'

import { useEffect } from 'react'
import { useBreadcrumbStore } from '@/lib/stores/breadcrumb-store'

/**
 * Sets a human-readable breadcrumb override label for the current [id] page.
 * Automatically clears the label when the component unmounts.
 *
 * @example
 * useBreadcrumbLabel(notebook?.name)
 */
export function useBreadcrumbLabel(label: string | undefined | null) {
  const setOverrideLabel = useBreadcrumbStore((s) => s.setOverrideLabel)

  useEffect(() => {
    if (label) {
      setOverrideLabel(label)
    }
    return () => setOverrideLabel(undefined)
  }, [label, setOverrideLabel])
}
