import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CopilotState {
  isOpen: boolean
  toggleOpen: () => void
  setOpen: (open: boolean) => void
}

export const useCopilotStore = create<CopilotState>()(
  persist(
    (set) => ({
      isOpen: false,
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (open) => set({ isOpen: open }),
    }),
    {
      name: 'copilot-sidebar-storage',
    }
  )
)
