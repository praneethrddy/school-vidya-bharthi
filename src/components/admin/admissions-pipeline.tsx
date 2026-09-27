'use client'

import { UserPlus } from 'lucide-react'
import { AdmissionCard } from '@/components/admin/admission-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AdmissionListItem, AdmissionStatus } from '@/types/admissions'

const statusTabs: AdmissionStatus[] = [
  'APPLIED',
  'SHORTLISTED',
  'TESTING',
  'ADMITTED',
  'REJECTED',
  'WAITLIST',
]

interface AdmissionsPipelineProps {
  admissions: AdmissionListItem[]
  counts: Record<AdmissionStatus, number>
  activeStatus: AdmissionStatus
  loading: boolean
  role: string | null
  canProcess: boolean
  canShortlist: boolean
  canScheduleTest: boolean
  canAdmit: boolean
  canReject: boolean
  statusPending: { admissionId: string; status: AdmissionStatus } | null
  convertingAdmissionId: string | null
  onStatusTabChange: (status: AdmissionStatus) => void
  onView: (admission: AdmissionListItem) => void
  onStatusChange: (admission: AdmissionListItem, nextStatus: AdmissionStatus) => Promise<void> | void
  onConvert: (admission: AdmissionListItem) => void
}

export function AdmissionsPipeline({
  admissions,
  counts,
  activeStatus,
  loading,
  role,
  canProcess,
  canShortlist,
  canScheduleTest,
  canAdmit,
  canReject,
  statusPending,
  convertingAdmissionId,
  onStatusTabChange,
  onView,
  onStatusChange,
  onConvert,
}: AdmissionsPipelineProps) {
  const totalApplications = statusTabs.reduce((sum, status) => sum + (counts[status] || 0), 0)

  return (
    <Tabs value={activeStatus} onValueChange={(value) => onStatusTabChange(value as AdmissionStatus)}>
      <TabsList className="grid h-auto w-full grid-cols-2 gap-2 p-1 md:grid-cols-6">
        {statusTabs.map((status) => (
          <TabsTrigger
            key={status}
            value={status}
            className="flex items-center justify-between gap-2 px-3 py-2"
          >
            <span className="text-xs sm:text-sm">{status}</span>
            <Badge variant="secondary">{counts[status] || 0}</Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {statusTabs.map((status) => {
        const records = admissions.filter((admission) => admission.status === status)

        return (
          <TabsContent key={status} value={status} className="mt-4">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`admission-skeleton-${index}`} className="rounded-lg border p-4 space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-8 w-40" />
                  </div>
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="rounded-lg border border-dashed">
                <EmptyState
                  icon={UserPlus}
                  title={
                    totalApplications === 0
                      ? 'No applications received for this academic year'
                      : `No ${status.toLowerCase()} applications`
                  }
                  description={
                    totalApplications === 0
                      ? 'Use Add Application to start the admissions workflow.'
                      : 'Try another status tab or adjust your filters.'
                  }
                  className="min-h-[260px]"
                />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {records.map((admission) => (
                  <AdmissionCard
                    key={admission.id}
                    admission={admission}
                    role={role}
                    canProcess={canProcess}
                    canShortlist={canShortlist}
                    canScheduleTest={canScheduleTest}
                    canAdmit={canAdmit}
                    canReject={canReject}
                    statusLoading={
                      statusPending?.admissionId === admission.id ? statusPending.status : null
                    }
                    converting={convertingAdmissionId === admission.id}
                    onView={onView}
                    onStatusChange={onStatusChange}
                    onConvert={onConvert}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
