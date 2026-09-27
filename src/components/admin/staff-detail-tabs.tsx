'use client'

import { Edit } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StaffAccountSection } from './staff-account-section'
import { SubjectAssignment } from './subject-assignment'
import type {
  StaffActivityLogItem,
  StaffAttendanceSummary,
  StaffDetailPayload,
} from '@/types/staff-management'

interface StaffDetailTabsProps {
  staff: StaffDetailPayload['staff']
  assignments: StaffDetailPayload['assignments']
  classesTaught: StaffDetailPayload['classes_taught']
  allClasses: StaffDetailPayload['lookups']['classes']
  allSubjects: StaffDetailPayload['lookups']['subjects']
  academicYears: StaffDetailPayload['lookups']['academic_years']
  attendanceSummary: StaffAttendanceSummary
  activity: StaffActivityLogItem[]
  canEdit: boolean
  canManageAccounts: boolean
  onEditClick: () => void
  onAddAssignment: (subjectId: string, academicYearId: string) => Promise<void>
  onRemoveAssignment: (assignmentId: string) => Promise<void>
  onSetClassTeacher: (classId: string | null) => Promise<void>
  onCreateAccount: (
    email: string,
    role: string
  ) => Promise<{ generatedPassword?: string | null } | void>
  onResetPassword: () => Promise<{ generatedPassword?: string | null } | void>
}

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StaffDetailTabs({
  staff,
  assignments,
  classesTaught,
  allClasses,
  allSubjects,
  academicYears,
  attendanceSummary,
  activity,
  canEdit,
  canManageAccounts,
  onEditClick,
  onAddAssignment,
  onRemoveAssignment,
  onSetClassTeacher,
  onCreateAccount,
  onResetPassword,
}: StaffDetailTabsProps) {
  const initials = `${staff.first_name?.[0] ?? ''}${staff.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary/10">
            {staff.photo_url ? <AvatarImage src={staff.photo_url} alt={staff.first_name} /> : null}
            <AvatarFallback className="text-2xl">{initials || 'ST'}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">
              {staff.first_name} {staff.last_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
              <span>{staff.employee_code || 'No Employee Code'}</span>
              <span>-</span>
              <span>{staff.designation || 'No Designation'}</span>
              <span>-</span>
              <span>{staff.department || 'No Department'}</span>
            </div>
            <div className="mt-2">
              {staff.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
            </div>
          </div>
        </div>

        {canEdit && staff.is_active ? (
          <Button onClick={onEditClick}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[620px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">Gender</div>
                  <div className="text-sm">{staff.gender || '-'}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">Date of Birth</div>
                  <div className="text-sm">{formatDate(staff.date_of_birth)}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">Qualification</div>
                  <div className="text-sm">{staff.qualification || '-'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">Phone</div>
                  <div className="text-sm">{staff.phone || '-'}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">Address</div>
                  <div className="whitespace-pre-wrap text-sm">{staff.address || '-'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Employment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">Date of Joining</div>
                  <div className="text-sm">{formatDate(staff.date_of_joining)}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">Status</div>
                  <div className="text-sm">
                    {staff.is_active ? 'Currently employed' : 'Inactive'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <StaffAccountSection
            user={staff.user}
            canManage={canManageAccounts}
            onCreateAccount={onCreateAccount}
            onResetPassword={onResetPassword}
          />
        </TabsContent>

        <TabsContent value="workload" className="mt-6">
          <SubjectAssignment
            assignments={assignments}
            classesTaught={classesTaught}
            classes={allClasses}
            subjects={allSubjects}
            academicYears={academicYears}
            canEdit={canEdit}
            onAddAssignment={onAddAssignment}
            onRemoveAssignment={onRemoveAssignment}
            onSetClassTeacher={onSetClassTeacher}
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
              <CardDescription>
                Monthly staff attendance marking is managed in Admin Attendance.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Total Records</div>
                <div className="text-2xl font-semibold">{attendanceSummary.total_records}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Present</div>
                <div className="text-2xl font-semibold">{attendanceSummary.present}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Absent</div>
                <div className="text-2xl font-semibold">{attendanceSummary.absent}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Late</div>
                <div className="text-2xl font-semibold">{attendanceSummary.late}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Half Day</div>
                <div className="text-2xl font-semibold">{attendanceSummary.half_day}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Leave</div>
                <div className="text-2xl font-semibold">{attendanceSummary.leave}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Recent audit entries related to this staff member.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No audit logs available for this staff member.
                </div>
              ) : (
                <div className="space-y-2">
                  {activity.map((entry) => (
                    <div key={entry.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">
                          {entry.action} - {entry.entity_type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.actor_email} ({entry.actor_role})
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(entry.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
