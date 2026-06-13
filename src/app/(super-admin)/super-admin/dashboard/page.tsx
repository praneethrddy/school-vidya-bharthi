import { PlatformMetrics } from '@/components/super-admin/platform-metrics'
import { SchoolTable } from '@/components/super-admin/school-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPlatformAnalytics, listPlatformSchools } from '@/lib/saas'

export default async function SuperAdminDashboardPage() {
  const [analytics, schools] = await Promise.all([
    getPlatformAnalytics(),
    listPlatformSchools(),
  ])

  return (
    <div className="space-y-6">
      <PlatformMetrics analytics={analytics} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Recent Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <SchoolTable initialSchools={schools.slice(0, 5)} />
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Platform Pulse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: 'Suspended schools',
                value: analytics.suspended_schools,
              },
              {
                label: 'Active tenants',
                value: analytics.active_schools,
              },
              {
                label: 'Students on platform',
                value: analytics.total_students,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {item.value.toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
