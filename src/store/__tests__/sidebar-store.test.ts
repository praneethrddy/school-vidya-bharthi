import { beforeEach, describe, expect, it } from 'vitest'
import { useSidebarStore } from '@/store/sidebar-store'

describe('sidebar-store', () => {
  beforeEach(() => {
    useSidebarStore.setState({ isOpen: false, isCollapsed: false })
  })

  it('TEST-STORE-017: Initial state: isOpen=false, isCollapsed=false', () => {
    const state = useSidebarStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.isCollapsed).toBe(false)
  })

  it('TEST-STORE-018: toggle() flips isOpen', () => {
    const initial = useSidebarStore.getState().isOpen
    useSidebarStore.getState().toggle()
    expect(useSidebarStore.getState().isOpen).toBe(!initial)
  })

  it('TEST-STORE-019: toggle() twice → back to original', () => {
    const initial = useSidebarStore.getState().isOpen
    useSidebarStore.getState().toggle()
    useSidebarStore.getState().toggle()
    expect(useSidebarStore.getState().isOpen).toBe(initial)
  })

  it('TEST-STORE-020: close() sets isOpen=false regardless of current state', () => {
    useSidebarStore.setState({ isOpen: true })
    useSidebarStore.getState().close()
    expect(useSidebarStore.getState().isOpen).toBe(false)

    useSidebarStore.setState({ isOpen: false })
    useSidebarStore.getState().close()
    expect(useSidebarStore.getState().isOpen).toBe(false)
  })

  it('TEST-STORE-021: toggleCollapse() flips isCollapsed', () => {
    const initial = useSidebarStore.getState().isCollapsed
    useSidebarStore.getState().toggleCollapse()
    expect(useSidebarStore.getState().isCollapsed).toBe(!initial)
  })

  it('TEST-STORE-022: toggle() and toggleCollapse() are independent', () => {
    useSidebarStore.setState({ isOpen: false, isCollapsed: false })
    useSidebarStore.getState().toggle()
    expect(useSidebarStore.getState().isOpen).toBe(true)
    expect(useSidebarStore.getState().isCollapsed).toBe(false)

    useSidebarStore.getState().toggleCollapse()
    expect(useSidebarStore.getState().isOpen).toBe(true)
    expect(useSidebarStore.getState().isCollapsed).toBe(true)
  })
})
