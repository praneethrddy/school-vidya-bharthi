'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, History } from 'lucide-react'
import type { DashboardRecentActivityItem } from '@/lib/admin-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ActivityFeedProps {
  activity: DashboardRecentActivityItem[]
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest audit events recorded across the school.</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/reports">
            View audit log
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            No activity has been recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {activity.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="mt-0.5 rounded-full border bg-muted/40 p-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 border-b pb-4 last:border-b-0 last:pb-0">
                  <p className="font-medium">
                    {item.action} <span className="text-muted-foreground">on {item.entity_type}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.user_name} •{' '}
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

