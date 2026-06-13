'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRoundCog } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { StaffFilters } from '@/components/admin/staff-filters'
import { StaffForm, type StaffFormValues } from '@/components/admin/staff-form'
import { StaffTable } from '@/components/admin/staff-table'
import { usePermissions } from '@/hooks/use-permissions'
import type {
  StaffListItem,
  StaffListResponse,
  StaffSortBy,
  StaffSortOrder,
} from '@/types/staff-management'

function buildQueryString(options: {
  search: string
  department: string
  designation: string
  isActiveOnly: boolean
  page: number
  limit: number
  sortBy: StaffSortBy
  sortOrder: StaffSortOrder
}) {
  const params = new URLSearchParams()
  if (options.search.trim()) params.set('search', options.search.trim())
  if (options.department !== 'ALL') params.set('department', options.department)
  if (options.designation !== 'ALL') params.set('designation', options.designation)
  params.set('is_active', options.isActiveOnly ? 'true' : 'all')
  params.set('page', String(options.page))
  params.set('limit', String(options.limit))
  params.set('sort_by', options.sortBy)
  params.set('sort_order', options.sortOrder)
  return params.toString()
}

function toIsoDate(value?: Date) {
  if (!value) {
    return undefined
  }
  return value.toISOString().slice(0, 10)
}

function toNullableString(value?: string) {
  if (value === undefined) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export default function AdminStaffPage() {
  const router = useRouter()
  const { can, role, loading: permissionsLoading } = usePermissions()

  const [rows, setRows] = useState<StaffListItem[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<StaffSortBy>('created_at')
  const [sortOrder, setSortOrder] = useState<StaffSortOrder>('desc')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [department, setDepartment] = useState('ALL')
  const [designation, setDesignation] = useState('ALL')
  const [isActiveOnly, setIsActiveOnly] = useState(true)
  const [departments, setDepartments] = useState<string[]>([])
  const [designations, setDesignations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StaffListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canView = can('STAFF.view')
  const canCreate = can('STAFF.create')
  const canEdit = can('STAFF.edit')
  const canDelete = role === 'PRINCIPAL' || role === 'SUPER_ADMIN'

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const loadStaff = async () => {
    if (!canView || permissionsLoading) {
      setRows([])
      setTotal(0)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const query = buildQueryString({
        search: debouncedSearch,
        department,
        designation,
        isActiveOnly,
        page,
        limit,
        sortBy,
        sortOrder,
      })

      const response = await fetch(`/api/staff?${query}`, { cache: 'no-store' })
      const result = (await response.json().catch(() => null)) as StaffListResponse | { error?: string } | null
      if (!response.ok) {
        throw new Error((result as { error?: string })?.error || 'Failed to load staff list')
      }

      const payload = result as StaffListResponse
      setRows(payload.data || [])
      setTotal(payload.pagination?.total || 0)
      setDepartments(payload.filters?.departments || [])
      setDesignations(payload.filters?.designations || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load staff list'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStaff()
  }, [
    canView,
    debouncedSearch,
    department,
    designation,
    isActiveOnly,
    limit,
    page,
    permissionsLoading,
    sortBy,
    sortOrder,
  ])

  const handleCreateSubmit = async (values: StaffFormValues) => {
    const response = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_code: values.employee_code.trim(),
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        gender: values.gender,
        date_of_birth: toIsoDate(values.date_of_birth),
        phone: toNullableString(values.phone),
        address: toNullableString(values.address),
        designation: toNullableString(values.designation),
        department: toNullableString(values.department),
        date_of_joining: toIsoDate(values.date_of_joining),
        qualification: toNullableString(values.qualification),
        create_account: values.create_account,
        email: values.email?.trim() || undefined,
        role: values.role,
        auto_generate_password: values.auto_generate_password,
        password: values.password,
      }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.error || 'Failed to create staff member')
    }

    toast.success('Staff member created')
    await loadStaff()
    if (!result?.generatedPassword) {
      setAddOpen(false)
    }

    return {
      generatedPassword: result?.generatedPassword ?? null,
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/staff/${deleteTarget.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to deactivate staff')
      }

      toast.success(result?.data?.message || 'Staff deactivated')
      setDeleteTarget(null)
      await loadStaff()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate staff'
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  if (!permissionsLoading && !canView) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">You do not have permission to view staff records.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <StaffFilters
        canCreate={canCreate}
        search={search}
        department={department}
        designation={designation}
        isActiveOnly={isActiveOnly}
        departments={departments}
        designations={designations}
        onSearchChange={setSearch}
        onDepartmentChange={(value) => {
          setDepartment(value)
          setPage(1)
        }}
        onDesignationChange={(value) => {
          setDesignation(value)
          setPage(1)
        }}
        onActiveOnlyChange={(value) => {
          setIsActiveOnly(value)
          setPage(1)
        }}
        onAddStaff={() => setAddOpen(true)}
        onExport={() => toast.info('CSV export will be enabled in analytics feature')}
      />

      {!loading && rows.length === 0 ? (
        <div className="rounded-lg border border-dashed">
          <EmptyState
            icon={UserRoundCog}
            title="No staff records found"
            description="Add your first staff member to start managing subject assignments and staff accounts."
            className="min-h-[260px]"
          />
          {canCreate ? (
            <div className="flex justify-center pb-6">
              <Button onClick={() => setAddOpen(true)}>Add your first staff member</Button>
            </div>
          ) : null}
        </div>
      ) : (
        <StaffTable
          data={rows}
          loading={loading}
          page={page}
          limit={limit}
          total={total}
          sortBy={sortBy}
          sortOrder={sortOrder}
          canEdit={canEdit}
          canDelete={canDelete}
          onSortChange={(nextSortBy, nextSortOrder) => {
            setSortBy(nextSortBy)
            setSortOrder(nextSortOrder)
            setPage(1)
          }}
          onPageChange={setPage}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit)
            setPage(1)
          }}
          onView={(id) => router.push(`/admin/staff/${id}`)}
          onEdit={(id) => router.push(`/admin/staff/${id}?edit=true`)}
          onDelete={(id) => {
            const target = rows.find((row) => row.id === id) || null
            setDeleteTarget(target)
          }}
        />
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <StaffForm
            onSubmit={handleCreateSubmit}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deleteTarget?.name}? This will also deactivate
              their login account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deactivating...' : 'Confirm Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

