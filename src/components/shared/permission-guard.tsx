'use client'

import { usePermissions } from '@/hooks/use-permissions'

interface PermissionGuardProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingFallback?: React.ReactNode
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
  loadingFallback = null,
}: PermissionGuardProps) {
  const { can, loading } = usePermissions()

  if (loading) return <>{loadingFallback}</>
  if (!can(permission)) return <>{fallback}</>

  return <>{children}</>
}
