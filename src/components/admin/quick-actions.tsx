'use client'

import Link from 'next/link'
import { BellRing, ChevronRight, ClipboardCheck, IndianRupee, UserPlus } from 'lucide-react'
import type { DashboardQuickAction } from '@/lib/admin-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface QuickActionsProps {
  actions: DashboardQuickAction[]
}

const iconMap = {
  attendance: ClipboardCheck,
  fees: IndianRupee,
  students: UserPlus,
  announcements: BellRing,
}

export function QuickActions({ actions }: QuickActionsProps) {
  if (actions.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Jump straight into the tasks this role can perform.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = iconMap[action.icon]
          return (
            <Button
              key={action.key}
              asChild
              variant="outline"
              className="h-auto justify-between rounded-2xl px-4 py-4 text-left"
            >
              <Link href={action.href}>
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border bg-muted/40 p-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}

