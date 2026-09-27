'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdmissionDocuments } from '@/components/admin/admission-documents'
import { AdmissionStatusActions } from '@/components/admin/admission-status-actions'
import { AdmissionTimeline } from '@/components/admin/admission-timeline'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { AdmissionDetail as AdmissionDetailType, AdmissionStatus } from '@/types/admissions'

interface AdmissionDetailProps {
  open: boolean
  admissionId: string | null
  role: string | null
  canProcess: boolean
  canShortlist: boolean
  canScheduleTest: boolean
  canAdmit: boolean
  canReject: boolean
  statusPending: { admissionId: string; status: AdmissionStatus } | null
  convertingAdmissionId: string | null
  onOpenChange: (open: boolean) => void
  onStatusChange: (admissionId: string, nextStatus: AdmissionStatus) => Promise<void>
  onRequestConvert: (admissionId: string, applicantName: string) => void
  onDataChanged: () => Promise<void> | void
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

export function AdmissionDetail({
  open,
  admissionId,
  role,
  canProcess,
  canShortlist,
  canScheduleTest,
  canAdmit,
  canReject,
  statusPending,
  convertingAdmissionId,
  onOpenChange,
  onStatusChange,
  onRequestConvert,
  onDataChanged,
}: AdmissionDetailProps) {
  const [detail, setDetail] = useState<AdmissionDetailType | null>(null)
  const [loading, setLoading] = useState(false)

  const shouldLoad = useMemo(() => open && Boolean(admissionId), [open, admissionId])

  const loadDetail = useCallback(async () => {
    if (!admissionId) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admissions/${admissionId}`, {
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to load admission details')
      }

      setDetail(payload?.data || null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load admission details'
      toast.error(message)
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [admissionId])

  useEffect(() => {
    if (!shouldLoad) {
      return
    }

    void loadDetail()
  }, [shouldLoad, loadDetail])

  const handleStatusChange = async (nextStatus: AdmissionStatus) => {
    if (!admissionId) {
      return
    }

    await onStatusChange(admissionId, nextStatus)
    await Promise.all([loadDetail(), onDataChanged()])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Detail</DialogTitle>
          <DialogDescription>
            Review applicant information, documents, and status history.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading application...
          </div>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground">Application not found.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-4">
              <div>
                <h3 className="text-lg font-semibold">{detail.applicant_name}</h3>
                <p className="text-sm text-muted-foreground">Applying for {detail.applying_for_class}</p>
              </div>
              <Badge variant={statusBadgeVariant(detail.status)}>{detail.status}</Badge>
            </div>

            <AdmissionStatusActions
              status={detail.status}
              role={role}
              canProcess={canProcess}
              canShortlist={canShortlist}
              canScheduleTest={canScheduleTest}
              canAdmit={canAdmit}
              canReject={canReject}
              statusLoading={
                statusPending?.admissionId === detail.id ? statusPending.status : null
              }
              converting={convertingAdmissionId === detail.id}
              onStatusChange={handleStatusChange}
              onConvert={() => onRequestConvert(detail.id, detail.applicant_name)}
            />

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-md border p-4">
                <h4 className="text-sm font-semibold uppercase text-muted-foreground">Applicant</h4>
                <p><strong>Name:</strong> {detail.applicant_name}</p>
                <p><strong>DOB:</strong> {format(new Date(detail.date_of_birth), 'PPP')}</p>
                <p><strong>Gender:</strong> {detail.gender}</p>
                <p><strong>Applying Class:</strong> {detail.applying_for_class}</p>
                <p><strong>Previous School:</strong> {detail.previous_school || '-'}</p>
              </div>

              <div className="space-y-2 rounded-md border p-4">
                <h4 className="text-sm font-semibold uppercase text-muted-foreground">Parent</h4>
                <p><strong>Name:</strong> {detail.parent_name}</p>
                <p><strong>Phone:</strong> {detail.parent_phone}</p>
                <p><strong>Email:</strong> {detail.parent_email || '-'}</p>
                <p><strong>Address:</strong> {detail.address || '-'}</p>
                <p><strong>Applied:</strong> {format(new Date(detail.applied_at), 'PPP p')}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-4">
              <h4 className="text-sm font-semibold uppercase text-muted-foreground">Remarks / Notes</h4>
              <p className="text-sm">{detail.remarks || 'No remarks added yet.'}</p>
            </div>

            <div className="space-y-2 rounded-md border p-4">
              <h4 className="text-sm font-semibold uppercase text-muted-foreground">Documents</h4>
              <AdmissionDocuments
                admissionId={detail.id}
                documents={detail.documents_url || []}
                canUpload={canProcess}
                onUploaded={async () => {
                  await Promise.all([loadDetail(), onDataChanged()])
                }}
              />
            </div>

            <div className="space-y-2 rounded-md border p-4">
              <h4 className="text-sm font-semibold uppercase text-muted-foreground">Status Timeline</h4>
              <AdmissionTimeline timeline={detail.timeline || []} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
