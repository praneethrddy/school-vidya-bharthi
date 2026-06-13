'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface ConcessionRequestItem {
  id: string
  student_name: string
  class_name: string
  category_name: string
  concession_type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  concession_value: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requested_by_email: string
  created_at: string
}

interface ConcessionApprovalProps {
  concessions: ConcessionRequestItem[]
  loading?: boolean
  canApprove: boolean
  onDecision: (id: string, action: 'APPROVED' | 'REJECTED') => Promise<void>
}

function statusVariant(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'destructive'
  return 'warning'
}

function concessionLabel(item: ConcessionRequestItem) {
  if (item.concession_type === 'PERCENTAGE') {
    return `${item.concession_value}%`
  }
  return `₹${item.concession_value}`
}

export function ConcessionApproval({
  concessions,
  loading,
  canApprove,
  onDecision,
}: ConcessionApprovalProps) {
  const pending = concessions.filter((item) => item.status === 'PENDING')
  const history = concessions.filter((item) => item.status !== 'PENDING')

  const handleDecision = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      await onDecision(id, action)
      toast.success(`Concession ${action.toLowerCase()}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update concession'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>
            Principal approval queue for fee concession requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading concessions...</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending concession requests.</p>
          ) : (
            pending.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {item.student_name} <span className="text-muted-foreground">({item.class_name})</span>
                    </p>
                    <p className="text-sm text-muted-foreground">Category: {item.category_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested by: {item.requested_by_email}
                    </p>
                    <p className="text-sm text-muted-foreground">Value: {concessionLabel(item)}</p>
                    <p className="text-sm">Reason: {item.reason}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    {canApprove ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecision(item.id, 'APPROVED')}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecision(item.id, 'REJECTED')}
                        >
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decision History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading concession history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved or rejected requests yet.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {item.student_name} • {item.category_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {concessionLabel(item)} • {new Date(item.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
