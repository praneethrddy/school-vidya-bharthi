'use client'

import { format } from 'date-fns'
import { CalendarDays, Phone, User } from 'lucide-react'
import { AdmissionStatusActions } from '@/components/admin/admission-status-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdmissionListItem, AdmissionStatus } from '@/types/admissions'

interface AdmissionCardProps {
  admission: AdmissionListItem
  role: string | null
  canProcess: boolean
  canShortlist: boolean
  canScheduleTest: boolean
  canAdmit: boolean
  canReject: boolean
  statusLoading: AdmissionStatus | null
  converting: boolean
  onView: (admission: AdmissionListItem) => void
  onStatusChange: (admission: AdmissionListItem, nextStatus: AdmissionStatus) => Promise<void> | void
  onConvert: (admission: AdmissionListItem) => void
}

function statusBadgeVariant(status: AdmissionStatus):
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'outline' {
  if (status === 'APPLIED') return 'secondary'
  if (status === 'SHORTLISTED') return 'default'
  if (status === 'TESTING') return 'warning'
  if (status === 'ADMITTED') return 'success'
  if (status === 'REJECTED') return 'destructive'
  return 'outline'
}

export function AdmissionCard({
  admission,
  role,
  canProcess,
  canShortlist,
  canScheduleTest,
  canAdmit,
  canReject,
  statusLoading,
  converting,
  onView,
  onStatusChange,
  onConvert,
}: AdmissionCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{admission.applicant_name}</CardTitle>
          <Badge variant={statusBadgeVariant(admission.status)}>{admission.status}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Applying for {admission.applying_for_class}</p>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            DOB: {format(new Date(admission.date_of_birth), 'PPP')}
          </p>
          <p className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Parent: {admission.parent_name}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {admission.parent_phone}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Applied on {format(new Date(admission.applied_at), 'PPP')}
        </p>

        <AdmissionStatusActions
          status={admission.status}
          role={role}
          canProcess={canProcess}
          canShortlist={canShortlist}
          canScheduleTest={canScheduleTest}
          canAdmit={canAdmit}
          canReject={canReject}
          statusLoading={statusLoading}
          converting={converting}
          onStatusChange={(nextStatus) => onStatusChange(admission, nextStatus)}
          onConvert={() => onConvert(admission)}
        />
      </CardContent>

      <CardFooter>
        <Button variant="outline" size="sm" onClick={() => onView(admission)}>
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}
