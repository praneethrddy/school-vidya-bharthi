'use client'

import { Clock4 } from 'lucide-react'
import { format } from 'date-fns'
import type { AdmissionTimelineItem } from '@/types/admissions'

interface AdmissionTimelineProps {
  timeline: AdmissionTimelineItem[]
}

function formatStatusTransition(item: AdmissionTimelineItem): string {
  if (!item.from_status) {
    return `Status set to ${item.to_status}`
  }

  return `${item.from_status} -> ${item.to_status}`
}

export function AdmissionTimeline({ timeline }: AdmissionTimelineProps) {
  if (timeline.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        No status history available yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {timeline.map((item) => (
        <div key={item.id} className="rounded-md border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock4 className="h-4 w-4 text-muted-foreground" />
            {formatStatusTransition(item)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {format(new Date(item.created_at), 'PPP p')}
          </p>
          {item.remarks ? <p className="mt-2 text-sm">{item.remarks}</p> : null}
        </div>
      ))}
    </div>
  )
}
