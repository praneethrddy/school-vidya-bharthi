import { create } from 'zustand'

interface SidebarState {
  isOpen: boolean
  isCollapsed: boolean
  toggle: () => void
  close: () => void
  toggleCollapse: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  isCollapsed: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  close: () => set({ isOpen: false }),
  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}))
