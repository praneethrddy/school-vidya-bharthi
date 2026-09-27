'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AdmissionConvertDialogProps {
  open: boolean
  admissionId: string | null
  applicantName: string | null
  onOpenChange: (open: boolean) => void
  onConverted: () => Promise<void> | void
}

export function AdmissionConvertDialog({
  open,
  admissionId,
  applicantName,
  onOpenChange,
  onConverted,
}: AdmissionConvertDialogProps) {
  const [submitting, setSubmitting] = useState(false)

  const handleConvert = async () => {
    if (!admissionId) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/admissions/${admissionId}/convert`, {
        method: 'POST',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to convert applicant')
      }

      toast.success(payload?.data?.message || 'Applicant converted to student')
      await onConverted()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to convert applicant'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert To Student</DialogTitle>
          <DialogDescription>
            This will create a student and parent record for {applicantName || 'this applicant'}.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Make sure admission status is <strong>ADMITTED</strong> and class capacity is available.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={submitting || !admissionId}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
