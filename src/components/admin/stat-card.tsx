'use client'

import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string
  description: string
  icon: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'from-slate-950/5 via-transparent to-transparent text-foreground',
  success: 'from-emerald-500/10 via-transparent to-transparent text-emerald-700 dark:text-emerald-300',
  warning: 'from-amber-500/10 via-transparent to-transparent text-amber-700 dark:text-amber-300',
  danger: 'from-rose-500/10 via-transparent to-transparent text-rose-700 dark:text-rose-300',
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = 'default',
}: StatCardProps) {
  return (
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <CardHeader className={cn('bg-gradient-to-br pb-3', toneStyles[tone])}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <CardTitle className="mt-2 text-3xl font-semibold tracking-tight">{value}</CardTitle>
          </div>
          <div className="rounded-2xl border bg-background/80 p-3 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

