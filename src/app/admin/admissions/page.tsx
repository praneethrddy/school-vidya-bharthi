'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AdmissionConvertDialog } from '@/components/admin/admission-convert-dialog'
import { AdmissionDetail } from '@/components/admin/admission-detail'
import { AdmissionForm } from '@/components/admin/admission-form'
import { AdmissionsPipeline } from '@/components/admin/admissions-pipeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermissions } from '@/hooks/use-permissions'
import type {
  AdmissionListItem,
  AdmissionStatus,
} from '@/types/admissions'

interface AdmissionsApiResponse {
  admissions: AdmissionListItem[]
  counts: Record<AdmissionStatus, number>
  current_academic_year_id: string | null
  filters?: {
    classes: Array<{ id: string; name: string; section: string | null; label: string }>
    academic_years: Array<{ id: string; name: string; is_current: boolean }>
  }
}

const initialCounts: Record<AdmissionStatus, number> = {
  APPLIED: 0,
  SHORTLISTED: 0,
  TESTING: 0,
  ADMITTED: 0,
  REJECTED: 0,
  WAITLIST: 0,
}

export default function AdminAdmissionsPage() {
  const { can, role, loading: permissionsLoading } = usePermissions()

  const [admissions, setAdmissions] = useState<AdmissionListItem[]>([])
  const [counts, setCounts] = useState<Record<AdmissionStatus, number>>(initialCounts)
  const [loading, setLoading] = useState(true)

  const [activeStatus, setActiveStatus] = useState<AdmissionStatus>('APPLIED')
  const [statusPending, setStatusPending] = useState<{ admissionId: string; status: AdmissionStatus } | null>(null)
  const [convertingAdmissionId, setConvertingAdmissionId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [academicYearId, setAcademicYearId] = useState('ALL')
  const [autoYearInitialized, setAutoYearInitialized] = useState(false)
  const [classFilter, setClassFilter] = useState('ALL')

  const [classOptions, setClassOptions] = useState<Array<{ id: string; label: string }>>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<
    Array<{ id: string; name: string; is_current: boolean }>
  >([])

  const [formOpen, setFormOpen] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailAdmissionId, setDetailAdmissionId] = useState<string | null>(null)

  const [convertOpen, setConvertOpen] = useState(false)
  const [convertTargetId, setConvertTargetId] = useState<string | null>(null)
  const [convertTargetName, setConvertTargetName] = useState<string | null>(null)

  const canView = can('ADMISSIONS.view')
  const canCreate = can('ADMISSIONS.create')
  const canProcess = can('ADMISSIONS.process')
  const canShortlist = can('ADMISSIONS.shortlist')
  const canScheduleTest = can('ADMISSIONS.schedule_test')
  const canAdmit = can('ADMISSIONS.admit')
  const canReject = can('ADMISSIONS.reject')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [search])

  const classLabelFilter = useMemo(() => {
    if (classFilter === 'ALL') {
      return ''
    }

    const match = classOptions.find((option) => option.id === classFilter)
    return match?.label || ''
  }, [classFilter, classOptions])

  const loadAdmissions = useCallback(async () => {
    if (!canView) {
      setLoading(false)
      setAdmissions([])
      setCounts(initialCounts)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: activeStatus,
        limit: '100',
      })

      if (debouncedSearch) params.set('search', debouncedSearch)
      if (academicYearId !== 'ALL') params.set('academic_year_id', academicYearId)
      if (classLabelFilter) params.set('applying_for_class', classLabelFilter)

      const response = await fetch(`/api/admissions?${params.toString()}`, {
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to load admissions')
      }

      const data = payload?.data as AdmissionsApiResponse
      setAdmissions(data?.admissions || [])
      setCounts(data?.counts || initialCounts)

      const nextClassOptions = (data?.filters?.classes || []).map((item) => ({
        id: item.id,
        label: item.label,
      }))

      console.log('ADMISSIONS API RESP:', {
        autoYearInitialized,
        academicYearId,
        current_academic_year_id: data?.current_academic_year_id,
        classesCount: data?.filters?.classes?.length,
        classes: data?.filters?.classes,
      })

      setClassOptions(nextClassOptions)
      setAcademicYearOptions(data?.filters?.academic_years || [])

      if (!autoYearInitialized && academicYearId === 'ALL' && data?.current_academic_year_id) {
        setAcademicYearId(data.current_academic_year_id)
        setAutoYearInitialized(true)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load admissions'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [
    canView,
    activeStatus,
    debouncedSearch,
    academicYearId,
    classLabelFilter,
    autoYearInitialized,
  ])

  useEffect(() => {
    if (permissionsLoading) {
      return
    }

    void loadAdmissions()
  }, [permissionsLoading, loadAdmissions])

  const handleStatusChange = useCallback(async (admissionId: string, nextStatus: AdmissionStatus) => {
    setStatusPending({ admissionId, status: nextStatus })

    try {
      const response = await fetch(`/api/admissions/${admissionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to update status')
      }

      toast.success(`Status changed to ${nextStatus}`)
      await loadAdmissions()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status'
      toast.error(message)
    } finally {
      setStatusPending(null)
    }
  }, [loadAdmissions])

  const handleView = (admission: AdmissionListItem) => {
    setDetailAdmissionId(admission.id)
    setDetailOpen(true)
  }

  const handleOpenConvert = (admission: AdmissionListItem) => {
    setConvertTargetId(admission.id)
    setConvertTargetName(admission.applicant_name)
    setConvertOpen(true)
    setConvertingAdmissionId(admission.id)
  }

  const handleRequestConvertFromDetail = (admissionId: string, applicantName: string) => {
    setConvertTargetId(admissionId)
    setConvertTargetName(applicantName)
    setConvertOpen(true)
    setConvertingAdmissionId(admissionId)
  }

  const handleConverted = useCallback(async () => {
    await loadAdmissions()
    setConvertingAdmissionId(null)
    setConvertTargetId(null)
    setConvertTargetName(null)
  }, [loadAdmissions])

  if (permissionsLoading) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Admissions</h1>
        <p className="text-sm text-muted-foreground">Loading module...</p>
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Admissions</h1>
        <p className="text-sm text-muted-foreground">You do not have permission to view admissions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admissions</h1>
          <p className="text-sm text-muted-foreground">
            Track applications through APPLIED, SHORTLISTED, TESTING, and final decision stages.
          </p>
        </div>

        {canCreate ? (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Application
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="admission-search">Search</Label>
          <Input
            id="admission-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Applicant name or parent phone"
          />
        </div>

        <div className="space-y-2">
          <Label>Academic Year</Label>
          <Select value={academicYearId} onValueChange={setAcademicYearId}>
            <SelectTrigger>
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All years</SelectItem>
              {academicYearOptions.map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Applying For Class</Label>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All classes</SelectItem>
              {classOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AdmissionsPipeline
        admissions={admissions}
        counts={counts}
        activeStatus={activeStatus}
        loading={loading}
        role={role}
        canProcess={canProcess}
        canShortlist={canShortlist}
        canScheduleTest={canScheduleTest}
        canAdmit={canAdmit}
        canReject={canReject}
        statusPending={statusPending}
        convertingAdmissionId={convertingAdmissionId}
        onStatusTabChange={setActiveStatus}
        onView={handleView}
        onStatusChange={async (admission, nextStatus) => {
          await handleStatusChange(admission.id, nextStatus)
        }}
        onConvert={handleOpenConvert}
      />

      <AdmissionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        classOptions={classOptions}
        onCreated={loadAdmissions}
      />

      <AdmissionDetail
        open={detailOpen}
        admissionId={detailAdmissionId}
        role={role}
        canProcess={canProcess}
        canShortlist={canShortlist}
        canScheduleTest={canScheduleTest}
        canAdmit={canAdmit}
        canReject={canReject}
        statusPending={statusPending}
        convertingAdmissionId={convertingAdmissionId}
        onOpenChange={setDetailOpen}
        onStatusChange={handleStatusChange}
        onRequestConvert={handleRequestConvertFromDetail}
        onDataChanged={loadAdmissions}
      />

      <AdmissionConvertDialog
        open={convertOpen}
        admissionId={convertTargetId}
        applicantName={convertTargetName}
        onOpenChange={(open) => {
          setConvertOpen(open)
          if (!open) {
            setConvertingAdmissionId(null)
            setConvertTargetId(null)
            setConvertTargetName(null)
          }
        }}
        onConverted={handleConverted}
      />
    </div>
  )
}
