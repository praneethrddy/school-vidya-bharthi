'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissionStore } from '@/store/permission-store'
import { toast } from 'sonner'

export function usePermissions() {
  const permissions = usePermissionStore((state) => state.permissions)
  const role = usePermissionStore((state) => state.role)
  const loading = usePermissionStore((state) => state.loading)
  const initialized = usePermissionStore((state) => state.initialized)
  const setPermissionPayload = usePermissionStore((state) => state.setPermissionPayload)
  const setLoading = usePermissionStore((state) => state.setLoading)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/permissions/my', { cache: 'no-store' })
      if (!response.ok) {
        if (response.status === 401) {
          setPermissionPayload({ permissions: [], role: null })
          return
        }
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error?.message || 'Failed to load permissions')
      }

      const payload = await response.json()
      const nextPermissions = payload?.data?.permissions || []
      const nextRole = payload?.data?.role || null
      setPermissionPayload({ permissions: nextPermissions, role: nextRole })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load permissions'
      toast.error(message)
      setPermissionPayload({ permissions: [], role: null })
    } finally {
      setLoading(false)
    }
  }, [setLoading, setPermissionPayload])

  useEffect(() => {
    if (!initialized && !loading) {
      void refresh()
    }
  }, [initialized, loading, refresh])

  const can = useCallback(
    (permissionCode: string): boolean => {
      if (role === 'SUPER_ADMIN' || role === 'PRINCIPAL') {
        return true
      }
      return permissions.includes(permissionCode)
    },
    [role, permissions]
  )

  return {
    can,
    loading,
    role,
    permissions,
    refresh,
  }
}

export function usePermissionGuard(permissionCode: string) {
  const router = useRouter()
  const { can, loading } = usePermissions()
  const hasPermission = can(permissionCode)

  useEffect(() => {
    if (!loading && !hasPermission) {
      router.replace('/portal/forbidden')
    }
  }, [hasPermission, loading, router])

  return {
    hasPermission,
    loading,
  }
}
