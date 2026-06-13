import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listPlatformSchools } from '@/lib/saas'
import { formatCurrency } from '@/lib/utils'

export default async function SuperAdminBillingPage() {
  const schools = await listPlatformSchools()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          Platform Billing
        </h2>
        <p className="text-sm text-slate-600">
          A platform-side view of plan status and tenant revenue signals. Live gateway controls can
          plug into this surface once billing keys are configured.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {schools.map((school) => (
          <Card key={school.id} className="rounded-[1.5rem] border-white/70 bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-xl">
                <span>{school.name}</span>
                <Badge variant="secondary">{school.platform_plan}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                <strong>Status:</strong> {school.platform_status}
              </p>
              <p>
                <strong>Students:</strong> {school.student_count.toLocaleString('en-IN')}
              </p>
              <p>
                <strong>Collected Revenue:</strong> {formatCurrency(school.total_revenue)}
              </p>
              <p>
                <strong>Custom Domain:</strong> {school.custom_domain || 'Not connected'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
