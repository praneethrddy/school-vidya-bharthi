import { Building2, CreditCard, GraduationCap, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface PlatformMetricsProps {
  analytics: {
    total_schools: number
    active_schools: number
    total_users: number
    total_students: number
    total_mrr: number
  }
}

export function PlatformMetrics({ analytics }: PlatformMetricsProps) {
  const metrics = [
    {
      label: 'Active Schools',
      value: analytics.active_schools.toLocaleString('en-IN'),
      detail: `${analytics.total_schools} total tenants`,
      icon: Building2,
    },
    {
      label: 'Platform Users',
      value: analytics.total_users.toLocaleString('en-IN'),
      detail: `${analytics.total_students.toLocaleString('en-IN')} students`,
      icon: Users,
    },
    {
      label: 'Students',
      value: analytics.total_students.toLocaleString('en-IN'),
      detail: 'All active schools combined',
      icon: GraduationCap,
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrency(analytics.total_mrr),
      detail: 'Collected this month',
      icon: CreditCard,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card key={metric.label} className="rounded-[1.5rem] border-white/70 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-tight text-slate-950">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-slate-600">{metric.detail}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
