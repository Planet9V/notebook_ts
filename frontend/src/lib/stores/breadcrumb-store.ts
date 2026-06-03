'use client'

import { create } from 'zustand'

interface BreadcrumbStore {
  /** Override label for the last (current) breadcrumb segment */
  overrideLabel: string | undefined
  /** Set the override label — call from [id] pages after data loads */
  setOverrideLabel: (label: string | undefined) => void
}

export const useBreadcrumbStore = create<BreadcrumbStore>((set) => ({
  overrideLabel: undefined,
  setOverrideLabel: (label) => set({ overrideLabel: label }),
}))
