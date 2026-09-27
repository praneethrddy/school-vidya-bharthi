import { create } from 'zustand'

interface PermissionState {
  permissions: string[]
  role: string | null
  loading: boolean
  initialized: boolean
  setPermissionPayload: (payload: { permissions: string[]; role: string | null }) => void
  setLoading: (loading: boolean) => void
  hasPermission: (code: string) => boolean
  clearPermissions: () => void
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  role: null,
  loading: false,
  initialized: false,
  setPermissionPayload: ({ permissions, role }) =>
    set({
      permissions,
      role,
      initialized: true,
    }),
  setLoading: (loading) => set({ loading }),
  hasPermission: (code) => get().permissions.includes(code),
  clearPermissions: () =>
    set({
      permissions: [],
      role: null,
      loading: false,
      initialized: false,
    }),
}))
