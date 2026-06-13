'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  CONFIGURABLE_ROLES,
  PERMISSION_MODULE_ORDER,
  ROLE_PERMISSION_DEFAULTS,
  type ConfigurableRole,
} from '@/lib/permission-config'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  RotateCcw,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

interface PermissionItem {
  id: string
  code: string
  module: string
  action: string
  name: string
  description: string | null
  is_principal_only: boolean
  is_granted: boolean
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function createGrantedMap(items: PermissionItem[]): Record<string, boolean> {
  return items.reduce<Record<string, boolean>>((accumulator, item) => {
    accumulator[item.id] = item.is_granted
    return accumulator
  }, {})
}

export function PermissionManagementPanel() {
  const [selectedRole, setSelectedRole] = useState<ConfigurableRole>('STAFF_ADMIN')
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [originalGrantedMap, setOriginalGrantedMap] = useState<Record<string, boolean>>({})
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groupedPermissions = useMemo(() => {
    const grouped = permissions.reduce<Record<string, PermissionItem[]>>((accumulator, permission) => {
      if (!accumulator[permission.module]) {
        accumulator[permission.module] = []
      }
      accumulator[permission.module].push(permission)
      return accumulator
    }, {})

    return [...PERMISSION_MODULE_ORDER]
      .filter((module) => (grouped[module] || []).length > 0)
      .map((module) => ({
        module,
        permissions: grouped[module].sort((a, b) => a.name.localeCompare(b.name)),
      }))
  }, [permissions])

  const hasUnsavedChanges = useMemo(() => {
    return permissions.some((permission) => {
      return (originalGrantedMap[permission.id] || false) !== permission.is_granted
    })
  }, [originalGrantedMap, permissions])

  const loadPermissions = useCallback(async (role: ConfigurableRole) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/permissions?role=${role}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to load permissions')
      }

      const nextPermissions = (payload?.data?.permissions || []) as PermissionItem[]
      setPermissions(nextPermissions)
      setOriginalGrantedMap(createGrantedMap(nextPermissions))
      setExpandedModules(
        nextPermissions.reduce<Record<string, boolean>>((accumulator, permission) => {
          if (!(permission.module in accumulator)) {
            accumulator[permission.module] = true
          }
          return accumulator
        }, {})
      )
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load permissions'
      setError(message)
      toast.error(message)
      setPermissions([])
      setOriginalGrantedMap({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPermissions(selectedRole)
  }, [loadPermissions, selectedRole])

  const togglePermission = (permissionId: string, checked: boolean) => {
    setPermissions((current) =>
      current.map((permission) =>
        permission.id === permissionId ? { ...permission, is_granted: checked } : permission
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          permissions: permissions.map((permission) => ({
            permission_id: permission.id,
            granted: permission.is_granted,
          })),
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to save permissions')
      }

      const updatedPermissions = (payload?.data?.permissions || []) as PermissionItem[]
      setPermissions(updatedPermissions)
      setOriginalGrantedMap(createGrantedMap(updatedPermissions))
      toast.success('Permissions updated successfully')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save permissions'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefaults = () => {
    const defaults = new Set(ROLE_PERMISSION_DEFAULTS[selectedRole])
    setPermissions((current) =>
      current.map((permission) => ({
        ...permission,
        is_granted: permission.is_principal_only ? false : defaults.has(permission.code),
      }))
    )
    toast.success(`Reset ${titleCase(selectedRole)} to default permissions`)
  }

  const toggleModule = (module: string) => {
    setExpandedModules((current) => ({
      ...current,
      [module]: !current[module],
    }))
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Permission Management</h1>
        <p className="text-sm text-muted-foreground">
          Configure which actions each staff role can perform in this school.
        </p>
        {hasUnsavedChanges ? <Badge variant="warning">Unsaved changes</Badge> : null}
      </div>

      <Tabs value={selectedRole} onValueChange={(value) => setSelectedRole(value as ConfigurableRole)}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-4">
          {CONFIGURABLE_ROLES.map((role) => (
            <TabsTrigger key={role} value={role} className="py-2 text-xs md:text-sm">
              {titleCase(role)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load permissions</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-44" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading ? (
        <TooltipProvider>
          <div className="space-y-4">
            {groupedPermissions.map((moduleGroup) => {
              const isExpanded = expandedModules[moduleGroup.module] ?? true
              return (
                <Card key={moduleGroup.module}>
                  <CardHeader className="pb-3">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between text-left"
                      onClick={() => toggleModule(moduleGroup.module)}
                    >
                      <CardTitle className="text-lg">{titleCase(moduleGroup.module)}</CardTitle>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{moduleGroup.permissions.length} permissions</span>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </button>
                  </CardHeader>
                  <CardContent className={cn('space-y-2', !isExpanded && 'hidden')}>
                    {moduleGroup.permissions.map((permission) => {
                      return (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{permission.name}</span>
                              {permission.is_principal_only ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex">
                                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    This permission is reserved for Principal only
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {permission.description || permission.code}
                            </p>
                          </div>
                          <Switch
                            checked={permission.is_granted}
                            disabled={saving || permission.is_principal_only}
                            onCheckedChange={(checked) => togglePermission(permission.id, checked)}
                            aria-label={`Toggle ${permission.code}`}
                          />
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TooltipProvider>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-4 md:flex-row md:justify-end">
          <Button variant="outline" disabled={saving || loading} onClick={handleResetToDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !hasUnsavedChanges}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
