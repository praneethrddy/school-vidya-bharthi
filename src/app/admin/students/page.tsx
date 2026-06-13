'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
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
import { StudentFilters } from '@/components/admin/student-filters'
import { StudentForm } from '@/components/admin/student-form'
import { StudentTable } from '@/components/admin/student-table'
import { EmptyState } from '@/components/shared/empty-state'
import { usePermissions } from '@/hooks/use-permissions'
import type {
  AcademicYearOption,
  ClassOption,
  SortBy,
  SortOrder,
  StudentListItem,
} from '@/types/student-management'

interface StudentListResponse {
  students: StudentListItem[]
  pagination: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
  filters: {
    classes: ClassOption[]
    academic_years: AcademicYearOption[]
  }
  search_note: string
}

function buildQueryString(options: {
  search: string
  classId: string
  gender: 'ALL' | 'MALE' | 'FEMALE' | 'OTHER'
  status: 'ALL' | 'ACTIVE' | 'INACTIVE'
  page: number
  limit: number
  sortBy: SortBy
  sortOrder: SortOrder
}) {
  const params = new URLSearchParams()
  if (options.search) params.set('search', options.search)
  if (options.classId && options.classId !== 'ALL') params.set('class_id', options.classId)
  if (options.gender !== 'ALL') params.set('gender', options.gender)
  if (options.status === 'ACTIVE') params.set('is_active', 'true')
  if (options.status === 'INACTIVE') params.set('is_active', 'false')
  params.set('page', String(options.page))
  params.set('limit', String(options.limit))
  params.set('sort_by', options.sortBy)
  params.set('sort_order', options.sortOrder)
  return params.toString()
}

export default function AdminStudentsPage() {
  const router = useRouter()
  const { can, role, loading: permissionsLoading } = usePermissions()

  const [students, setStudents] = useState<StudentListItem[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [classId, setClassId] = useState('ALL')
  const [gender, setGender] = useState<'ALL' | 'MALE' | 'FEMALE' | 'OTHER'>('ALL')
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StudentListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canView = can('STUDENTS.view')
  const canCreate = can('STUDENTS.create')
  const canEdit = can('STUDENTS.edit')
  const canDelete = role === 'PRINCIPAL' || role === 'SUPER_ADMIN'

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    if (permissionsLoading || !canView) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const loadStudents = async () => {
      setLoading(true)
      try {
        const query = buildQueryString({
          search: debouncedSearch,
          classId,
          gender,
          status,
          page,
          limit,
          sortBy,
          sortOrder,
        })

        const response = await fetch(`/api/students?${query}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(result?.error?.message || 'Failed to load students')
        }

        const data = result?.data as StudentListResponse
        setStudents(data.students || [])
        setTotal(data.pagination?.total || 0)
        setClasses(data.filters?.classes || [])
        setAcademicYears(data.filters?.academic_years || [])
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return
        }
        const message = error instanceof Error ? error.message : 'Failed to load students'
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    void loadStudents()
    return () => controller.abort()
  }, [canView, classId, debouncedSearch, gender, limit, page, permissionsLoading, sortBy, sortOrder, status])

  const refreshStudents = async () => {
    const query = buildQueryString({
      search: debouncedSearch,
      classId,
      gender,
      status,
      page,
      limit,
      sortBy,
      sortOrder,
    })
    const response = await fetch(`/api/students?${query}`, { cache: 'no-store' })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.error?.message || 'Failed to refresh students')
    }
    const data = result?.data as StudentListResponse
    setStudents(data.students || [])
    setTotal(data.pagination?.total || 0)
    setClasses(data.filters?.classes || [])
    setAcademicYears(data.filters?.academic_years || [])
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/students/${deleteTarget.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Failed to deactivate student')
      }
      toast.success(result?.data?.message || 'Student deactivated')
      setDeleteTarget(null)
      await refreshStudents()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate student'
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  if (!permissionsLoading && !canView) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Student Management</h1>
        <p className="text-muted-foreground">You do not have permission to view student records.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Student Management</h1>
        <p className="text-sm text-muted-foreground">
          Add, search, filter, and manage student records across classes.
        </p>
      </div>

      <StudentFilters
        search={search}
        classId={classId}
        gender={gender}
        status={status}
        classes={classes}
        canCreate={canCreate}
        onSearchChange={setSearch}
        onClassChange={(value) => {
          setClassId(value)
          setPage(1)
        }}
        onGenderChange={(value) => {
          setGender(value)
          setPage(1)
        }}
        onStatusChange={(value) => {
          setStatus(value)
          setPage(1)
        }}
        onAddStudent={() => setFormOpen(true)}
        onExport={() => toast.info('CSV/Excel export will be added in Feature 26')}
      />

      {!loading && students.length === 0 ? (
        <div className="rounded-lg border border-dashed">
          <EmptyState
            icon={Users}
            title="No students found"
            description="Add your first student to start managing admissions, class assignment, and parent linkage."
            className="min-h-[260px]"
          />
          {canCreate ? (
            <div className="flex justify-center pb-6">
              <Button onClick={() => setFormOpen(true)}>Add your first student</Button>
            </div>
          ) : null}
        </div>
      ) : (
        <StudentTable
          students={students}
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
          onView={(id) => router.push(`/admin/students/${id}`)}
          onEdit={(id) => router.push(`/admin/students/${id}?tab=overview&edit=true`)}
          onDelete={(id) => {
            const target = students.find((student) => student.id === id) || null
            setDeleteTarget(target)
          }}
        />
      )}

      <StudentForm
        open={formOpen}
        mode="create"
        classes={classes}
        academicYears={academicYears}
        onOpenChange={setFormOpen}
        onSaved={async () => {
          try {
            await refreshStudents()
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to refresh students'
            toast.error(message)
          }
        }}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Student?</AlertDialogTitle>
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
