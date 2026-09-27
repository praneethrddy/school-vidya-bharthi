'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { StaffDetailTabs } from '@/components/admin/staff-detail-tabs'
import { StaffForm, type StaffFormValues } from '@/components/admin/staff-form'
import type { StaffDetailPayload } from '@/types/staff-management'

interface StaffDetailClientProps {
  staffId: string
  canEdit: boolean
  canDelete: boolean
  canManageAccounts: boolean
  initialEditMode?: boolean
}

function toNullableString(value?: string) {
  if (value === undefined) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function toIsoDateString(value?: Date) {
  if (!value) {
    return undefined
  }
  return value.toISOString().slice(0, 10)
}

export function StaffDetailClient({
  staffId,
  canEdit,
  canDelete,
  canManageAccounts,
  initialEditMode = false,
}: StaffDetailClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(initialEditMode)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [payload, setPayload] = useState<StaffDetailPayload | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/staff/${staffId}`, { cache: 'no-store' })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to load staff details')
      }
      setPayload(result.data as StaffDetailPayload)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load staff details'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [staffId])

  const handleEditSubmit = async (values: StaffFormValues) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_code: values.employee_code,
          first_name: values.first_name,
          last_name: values.last_name,
          gender: values.gender ?? null,
          date_of_birth: toIsoDateString(values.date_of_birth) ?? null,
          phone: toNullableString(values.phone),
          address: toNullableString(values.address),
          designation: toNullableString(values.designation),
          department: toNullableString(values.department),
          date_of_joining: toIsoDateString(values.date_of_joining) ?? null,
          qualification: toNullableString(values.qualification),
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update staff profile')
      }

      toast.success('Staff profile updated')
      setEditOpen(false)
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update staff profile'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/staff/${staffId}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to deactivate staff')
      }

      toast.success(result?.data?.message || 'Staff deactivated')
      setDeleteOpen(false)
      router.push('/admin/staff')
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate staff'
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  const handleAddAssignment = async (subjectId: string, academicYearId: string) => {
    const response = await fetch(`/api/staff/${staffId}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: subjectId,
        academic_year_id: academicYearId,
      }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.error || 'Failed to assign subject')
    }
    toast.success('Subject assigned')
    await loadData()
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    const response = await fetch(`/api/staff/${staffId}/subjects`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_id: assignmentId,
      }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.error || 'Failed to remove subject assignment')
    }
    toast.success('Subject assignment removed')
    await loadData()
  }

  const handleSetClassTeacher = async (classId: string | null) => {
    const response = await fetch(`/api/staff/${staffId}/class-teacher`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId,
      }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.error || 'Failed to update class teacher assignment')
    }
    if (classId) {
      toast.success('Class teacher updated')
    } else {
      toast.success('Class teacher assignments removed')
    }
    await loadData()
  }

  const handleCreateAccount = async (email: string, role: string) => {
    const response = await fetch(`/api/staff/${staffId}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        role,
        auto_generate_password: true,
      }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.error || 'Failed to create staff account')
    }
    toast.success('Staff login account created')
    await loadData()
    return { generatedPassword: result?.generatedPassword ?? null }
  }

  const handleResetPassword = async () => {
    const response = await fetch(`/api/staff/${staffId}/account`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auto_generate_password: true,
      }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.error || 'Failed to reset staff password')
    }
    toast.success('Staff password reset completed')
    await loadData()
    return { generatedPassword: result?.generatedPassword ?? null }
  }

  if (loading || !payload) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {canDelete && payload.staff.is_active ? (
        <div className="flex justify-end">
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Deactivate Staff
          </Button>
        </div>
      ) : null}

      <StaffDetailTabs
        staff={payload.staff}
        assignments={payload.assignments}
        classesTaught={payload.classes_taught}
        allClasses={payload.lookups.classes}
        allSubjects={payload.lookups.subjects}
        academicYears={payload.lookups.academic_years}
        attendanceSummary={payload.attendance_summary}
        activity={payload.activity}
        canEdit={canEdit}
        canManageAccounts={canManageAccounts}
        onEditClick={() => setEditOpen(true)}
        onAddAssignment={handleAddAssignment}
        onRemoveAssignment={handleRemoveAssignment}
        onSetClassTeacher={handleSetClassTeacher}
        onCreateAccount={handleCreateAccount}
        onResetPassword={handleResetPassword}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Profile</DialogTitle>
          </DialogHeader>
          <StaffForm
            initialData={{
              employee_code: payload.staff.employee_code ?? '',
              first_name: payload.staff.first_name,
              last_name: payload.staff.last_name,
              gender: payload.staff.gender ?? undefined,
              date_of_birth: payload.staff.date_of_birth
                ? new Date(payload.staff.date_of_birth)
                : undefined,
              phone: payload.staff.phone ?? '',
              address: payload.staff.address ?? '',
              designation: payload.staff.designation ?? '',
              department: payload.staff.department ?? '',
              date_of_joining: payload.staff.date_of_joining
                ? new Date(payload.staff.date_of_joining)
                : undefined,
              qualification: payload.staff.qualification ?? '',
            }}
            isEditMode
            onSubmit={handleEditSubmit}
            onCancel={() => setEditOpen(false)}
          />
          {saving ? (
            <div className="flex items-center justify-end text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving changes...
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {payload.staff.first_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {payload.staff.first_name} {payload.staff.last_name}? This
              also deactivates the linked login account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

