'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  ROLE_PERMISSION_DEFAULTS,
  type ConfigurableRole,
} from '@/lib/permission-config'
import { Lock, RotateCcw, Save } from 'lucide-react'

interface PermissionItem {
  id: string
  code: string
  name: string
  description: string | null
  is_principal_only: boolean
  granted_to: string[]
}

interface ModuleRow {
  module: string
  permissions: PermissionItem[]
}

interface PermissionsPayload {
  modules: ModuleRow[]
  configurable_roles: ConfigurableRole[]
}

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }
  return (payload?.success ? payload.data : payload) as T
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function sortIds(ids: string[]): string[] {
  return [...ids].sort((left, right) => left.localeCompare(right))
}

export function PermissionGrid() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [roles, setRoles] = useState<ConfigurableRole[]>([])
  const [selectedRole, setSelectedRole] = useState<ConfigurableRole | null>(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])
  const [baselinePermissionIds, setBaselinePermissionIds] = useState<string[]>([])

  const flattenedPermissions = useMemo(
    () => modules.flatMap((module) => module.permissions),
    [modules]
  )

  const hasUnsavedChanges = useMemo(() => {
    const current = sortIds(selectedPermissionIds).join(',')
    const baseline = sortIds(baselinePermissionIds).join(',')
    return current !== baseline
  }, [baselinePermissionIds, selectedPermissionIds])

  const loadPermissions = async () => {
    setLoading(true)
    try {
      const data = await parseApi<PermissionsPayload>(
        await fetch('/api/settings/permissions', { cache: 'no-store' })
      )
      setModules(data.modules || [])
      setRoles(data.configurable_roles || [])
      setSelectedRole((previous) => previous || data.configurable_roles[0] || null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load permissions'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPermissions()
  }, [])

  useEffect(() => {
    if (!selectedRole) {
      return
    }
    const rolePermissionIds = modules
      .flatMap((module) => module.permissions)
      .filter((permission) => permission.granted_to.includes(selectedRole))
      .map((permission) => permission.id)

    setSelectedPermissionIds(rolePermissionIds)
    setBaselinePermissionIds(rolePermissionIds)
  }, [modules, selectedRole])

  const togglePermission = (permissionId: string, checked: boolean) => {
    setSelectedPermissionIds((current) => {
      if (checked) {
        return [...new Set([...current, permissionId])]
      }
      return current.filter((id) => id !== permissionId)
    })
  }

  const handleSave = async () => {
    if (!selectedRole) {
      return
    }
    setSaving(true)
    try {
      const data = await parseApi<PermissionsPayload & { role: ConfigurableRole }>(
        await fetch('/api/settings/permissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: selectedRole,
            permission_ids: selectedPermissionIds,
          }),
        })
      )

      setModules(data.modules || [])
      toast.success('Role permissions updated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update permissions'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefaults = () => {
    if (!selectedRole) {
      return
    }

    const defaults = new Set(ROLE_PERMISSION_DEFAULTS[selectedRole] || [])
    const ids = flattenedPermissions
      .filter((permission) => defaults.has(permission.code) && !permission.is_principal_only)
      .map((permission) => permission.id)

    setSelectedPermissionIds(ids)
    toast.success(`${titleCase(selectedRole)} reset to default permission set`)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permission Management</CardTitle>
          <CardDescription>Loading permissions...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!selectedRole) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permission Management</CardTitle>
          <CardDescription>No configurable roles available for this school.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Permission Management</h1>
        <p className="text-sm text-muted-foreground">
          Configure access for each staff role. Principal-only permissions remain locked.
        </p>
        {hasUnsavedChanges ? <Badge variant="warning">Unsaved changes</Badge> : null}
      </div>

      <Tabs value={selectedRole} onValueChange={(value) => setSelectedRole(value as ConfigurableRole)}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-4">
          {roles.map((role) => (
            <TabsTrigger key={role} value={role}>
              {titleCase(role)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {modules.map((moduleRow) => (
          <Card key={moduleRow.module}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{titleCase(moduleRow.module)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {moduleRow.permissions.map((permission) => {
                const checked = selectedPermissionIds.includes(permission.id)
                return (
                  <div
                    key={permission.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{permission.name}</p>
                        {permission.is_principal_only ? (
                          <span className="inline-flex items-center text-xs text-amber-600">
                            <Lock className="mr-1 h-3.5 w-3.5" />
                            Principal only
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {permission.description || permission.code}
                      </p>
                    </div>
                    <Checkbox
                      checked={checked}
                      disabled={saving || permission.is_principal_only}
                      onCheckedChange={(value) => togglePermission(permission.id, value === true)}
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleResetToDefaults} disabled={saving}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
