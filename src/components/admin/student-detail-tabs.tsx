'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Save, UserPlus } from 'lucide-react'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ParentLinkDialog } from '@/components/admin/parent-link-dialog'
import type {
  AcademicYearOption,
  ClassOption,
  StudentDetailResponsePayload,
} from '@/types/student-management'

interface StudentDetailTabsProps {
  studentId: string
  classes: ClassOption[]
  academicYears: AcademicYearOption[]
  canEdit: boolean
  canDelete: boolean
  initialTab?: string
  initialEditMode?: boolean
}

interface DraftState {
  first_name: string
  last_name: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | ''
  date_of_birth: string
  blood_group: string
  phone: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  class_id: string
  academic_year_id: string
  admission_date: string
  roll_number: string
  is_active: boolean
}

function toDateInput(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  return value.slice(0, 10)
}

function toDisplayDate(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toDisplayDateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const emptyDraft: DraftState = {
  first_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  blood_group: '',
  phone: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  class_id: '',
  academic_year_id: '',
  admission_date: '',
  roll_number: '',
  is_active: true,
}

export function StudentDetailTabs({
  studentId,
  classes,
  academicYears,
  canEdit,
  canDelete,
  initialTab = 'overview',
  initialEditMode = false,
}: StudentDetailTabsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [linkParentOpen, setLinkParentOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [editMode, setEditMode] = useState(initialEditMode)
  const [payload, setPayload] = useState<StudentDetailResponsePayload | null>(null)
  const [draft, setDraft] = useState<DraftState>(emptyDraft)

  const classOption = useMemo(
    () => classes.find((entry) => entry.id === draft.class_id),
    [classes, draft.class_id]
  )

  useEffect(() => {
    if (classOption && !draft.academic_year_id) {
      setDraft((current) => ({
        ...current,
        academic_year_id: classOption.academic_year_id,
      }))
    }
  }, [classOption, draft.academic_year_id])

  const hydrateDraft = (nextPayload: StudentDetailResponsePayload) => {
    const student = nextPayload.student
    setDraft({
      first_name: student.first_name,
      last_name: student.last_name,
      gender: student.gender ?? '',
      date_of_birth: toDateInput(student.date_of_birth),
      blood_group: student.blood_group ?? '',
      phone: student.phone ?? '',
      address: student.address ?? '',
      emergency_contact_name: student.emergency_contact_name ?? '',
      emergency_contact_phone: student.emergency_contact_phone ?? '',
      class_id: student.class_id ?? '',
      academic_year_id: student.academic_year_id ?? '',
      admission_date: toDateInput(student.admission_date),
      roll_number: student.roll_number ?? '',
      is_active: student.is_active,
    })
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/students/${studentId}`, { cache: 'no-store' })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to load student details')
      }
      const nextPayload = result?.data as StudentDetailResponsePayload
      setPayload(nextPayload)
      hydrateDraft(nextPayload)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load student details'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [studentId])

  const handleSave = async () => {
    if (!payload) {
      return
    }

    if (!draft.first_name || !draft.last_name || !draft.date_of_birth) {
      toast.error('First name, last name, and date of birth are required')
      return
    }

    if (!draft.class_id) {
      toast.error('Class assignment is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: draft.first_name,
          last_name: draft.last_name,
          gender: draft.gender || null,
          date_of_birth: draft.date_of_birth,
          blood_group: draft.blood_group || null,
          phone: draft.phone || null,
          address: draft.address || null,
          emergency_contact_name: draft.emergency_contact_name || null,
          emergency_contact_phone: draft.emergency_contact_phone || null,
          class_id: draft.class_id,
          academic_year_id: draft.academic_year_id || undefined,
          admission_date: draft.admission_date || undefined,
          roll_number: draft.roll_number || null,
          is_active: draft.is_active,
        }),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to save student updates')
      }

      toast.success('Student updated successfully')
      setEditMode(false)
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save student updates'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    setDeactivating(true)
    try {
      const response = await fetch(`/api/students/${studentId}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to deactivate student')
      }
      toast.success(result?.data?.message || 'Student deactivated')
      router.push('/admin/students')
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to deactivate student'
      toast.error(message)
    } finally {
      setDeactivating(false)
    }
  }

  if (loading || !payload) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const { student, summaries, activity } = payload

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Student Profile</h1>
          <p className="text-sm text-muted-foreground">
            {student.name} • Admission No: {student.admission_number}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <Button
              variant={editMode ? 'outline' : 'default'}
              onClick={() => {
                if (editMode) {
                  hydrateDraft(payload)
                }
                setEditMode((current) => !current)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {editMode ? 'Cancel Edit' : 'Edit'}
            </Button>
          ) : null}

          {editMode ? (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          ) : null}

          {canDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deactivating}>
                  Deactivate Student
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate {student.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to deactivate {student.name}? This will also deactivate
                    their login account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeactivate}>
                    {deactivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Deactivate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 md:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parents">Parents</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal & Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editMode ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={draft.first_name}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, first_name: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={draft.last_name}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, last_name: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={draft.date_of_birth}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, date_of_birth: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={draft.gender || 'UNSET'}
                      onValueChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          gender: value === 'UNSET' ? '' : (value as DraftState['gender']),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNSET">Not specified</SelectItem>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Class</Label>
                    <Select
                      value={draft.class_id || 'UNSET'}
                      onValueChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          class_id: value === 'UNSET' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNSET">Select class</SelectItem>
                        {classes.map((classEntry) => (
                          <SelectItem key={classEntry.id} value={classEntry.id}>
                            {classEntry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Academic Year</Label>
                    <Select
                      value={draft.academic_year_id || 'UNSET'}
                      onValueChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          academic_year_id: value === 'UNSET' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNSET">Select year</SelectItem>
                        {academicYears.map((yearEntry) => (
                          <SelectItem key={yearEntry.id} value={yearEntry.id}>
                            {yearEntry.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Blood Group</Label>
                    <Input
                      value={draft.blood_group}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, blood_group: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Roll Number</Label>
                    <Input
                      value={draft.roll_number}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, roll_number: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Admission Date</Label>
                    <Input
                      type="date"
                      value={draft.admission_date}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, admission_date: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={draft.is_active ? 'ACTIVE' : 'INACTIVE'}
                      onValueChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          is_active: value === 'ACTIVE',
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={draft.phone}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Emergency Contact Name</Label>
                    <Input
                      value={draft.emergency_contact_name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          emergency_contact_name: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Emergency Contact Phone</Label>
                    <Input
                      value={draft.emergency_contact_phone}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          emergency_contact_phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Address</Label>
                    <Textarea
                      rows={3}
                      value={draft.address}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, address: event.target.value }))
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Name:</span> {student.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Gender:</span> {student.gender || '-'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Date of Birth:</span>{' '}
                    {toDisplayDate(student.date_of_birth)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Blood Group:</span>{' '}
                    {student.blood_group || '-'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Class:</span>{' '}
                    {student.class
                      ? `${student.class.name}${student.class.section ? ` - ${student.class.section}` : ''}`
                      : '-'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Academic Year:</span>{' '}
                    {student.academic_year?.name || '-'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Roll Number:</span>{' '}
                    {student.roll_number || '-'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Admission Date:</span>{' '}
                    {toDisplayDate(student.admission_date)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span> {student.phone || '-'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Emergency Contact:</span>{' '}
                    {student.emergency_contact_name || '-'} / {student.emergency_contact_phone || '-'}
                  </p>
                  <div className="md:col-span-2">
                    <p>
                      <span className="text-muted-foreground">Address:</span> {student.address || '-'}
                    </p>
                  </div>
                  <p>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    {student.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Portal Account:</span>{' '}
                    {student.user ? student.user.email : 'Not created'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Linked Parents</CardTitle>
              {canEdit ? (
                <Button size="sm" onClick={() => setLinkParentOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Link Parent
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {student.parents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No parent linked yet.</p>
              ) : (
                <div className="space-y-2">
                  {student.parents.map((parent) => (
                    <div key={parent.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{parent.name}</p>
                        {parent.is_primary ? <Badge variant="success">Primary</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {parent.relation || 'Relation not set'}
                        {parent.email ? ` • ${parent.email}` : ''}
                        {parent.phone ? ` • ${parent.phone}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Records</p>
                <p className="text-xl font-semibold">{summaries.attendance.total_records}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Present</p>
                <p className="text-xl font-semibold">{summaries.attendance.present}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Absent</p>
                <p className="text-xl font-semibold">{summaries.attendance.absent}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Late</p>
                <p className="text-xl font-semibold">{summaries.attendance.late}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Half Day</p>
                <p className="text-xl font-semibold">{summaries.attendance.half_day}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Holiday</p>
                <p className="text-xl font-semibold">{summaries.attendance.holiday}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Performance Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Grade Entries</p>
                <p className="text-xl font-semibold">{summaries.grades.records}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Exams Covered</p>
                <p className="text-xl font-semibold">{summaries.grades.exams}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Average Marks</p>
                <p className="text-xl font-semibold">{summaries.grades.average_marks.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Payments</p>
                  <p className="text-xl font-semibold">{summaries.fees.payment_count}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Paid (INR)</p>
                  <p className="text-xl font-semibold">{summaries.fees.total_paid.toFixed(2)}</p>
                </div>
              </div>
              {summaries.fees.latest_payment ? (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Latest Payment</p>
                  <p className="text-muted-foreground">
                    {toDisplayDate(summaries.fees.latest_payment.payment_date)} • Receipt{' '}
                    {summaries.fees.latest_payment.receipt_number} • INR{' '}
                    {summaries.fees.latest_payment.amount_paid.toFixed(2)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No fee payments recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit logs available for this student.</p>
              ) : (
                <div className="space-y-2">
                  {activity.map((entry) => (
                    <div key={entry.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{entry.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.actor_email} ({entry.actor_role})
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{toDisplayDateTime(entry.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ParentLinkDialog
        studentId={studentId}
        open={linkParentOpen}
        onOpenChange={setLinkParentOpen}
        onLinked={loadData}
      />
    </div>
  )
}
