'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AdmissionStatus } from '@/types/admissions'

interface AdmissionStatusActionsProps {
  status: AdmissionStatus
  role: string | null
  canProcess: boolean
  canShortlist: boolean
  canScheduleTest: boolean
  canAdmit: boolean
  canReject: boolean
  onStatusChange: (nextStatus: AdmissionStatus) => Promise<void> | void
  onConvert?: () => void
  statusLoading?: AdmissionStatus | null
  converting?: boolean
}

function isPrincipalRole(role: string | null): boolean {
  return role === 'PRINCIPAL' || role === 'SUPER_ADMIN'
}

export function AdmissionStatusActions({
  status,
  role,
  canProcess,
  canShortlist,
  canScheduleTest,
  canAdmit,
  canReject,
  onStatusChange,
  onConvert,
  statusLoading,
  converting,
}: AdmissionStatusActionsProps) {
  const principalRole = isPrincipalRole(role)

  const renderButton = (
    label: string,
    nextStatus: AdmissionStatus,
    disabled: boolean,
    variant: 'default' | 'outline' | 'destructive' = 'default'
  ) => (
    <Button
      key={`${status}-${nextStatus}`}
      size="sm"
      variant={variant}
      disabled={disabled}
      onClick={() => onStatusChange(nextStatus)}
      className="h-8"
    >
      {statusLoading === nextStatus ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
      {label}
    </Button>
  )

  if (status === 'APPLIED') {
    return (
      <div className="flex flex-wrap gap-2">
        {renderButton(
          'Shortlist',
          'SHORTLISTED',
          !canProcess || !canShortlist || statusLoading !== null
        )}
      </div>
    )
  }

  if (status === 'SHORTLISTED') {
    return (
      <div className="flex flex-wrap gap-2">
        {renderButton(
          'Schedule Test',
          'TESTING',
          !canProcess || !canScheduleTest || statusLoading !== null
        )}
      </div>
    )
  }

  if (status === 'TESTING') {
    return (
      <div className="flex flex-wrap gap-2">
        {renderButton(
          'Waitlist',
          'WAITLIST',
          !canProcess || statusLoading !== null,
          'outline'
        )}
        {renderButton(
          'Admit',
          'ADMITTED',
          !principalRole || !canAdmit || statusLoading !== null
        )}
        {renderButton(
          'Reject',
          'REJECTED',
          !principalRole || !canReject || statusLoading !== null,
          'destructive'
        )}
      </div>
    )
  }

  if (status === 'WAITLIST') {
    return (
      <div className="flex flex-wrap gap-2">
        {renderButton(
          'Admit',
          'ADMITTED',
          !principalRole || !canAdmit || statusLoading !== null
        )}
        {renderButton(
          'Reject',
          'REJECTED',
          !principalRole || !canReject || statusLoading !== null,
          'destructive'
        )}
      </div>
    )
  }

  if (status === 'ADMITTED') {
    return (
      <Button size="sm" onClick={onConvert} disabled={converting || !onConvert} className="h-8">
        {converting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
        Convert to Student
      </Button>
    )
  }

  return null
}
