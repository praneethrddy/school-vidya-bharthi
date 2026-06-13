import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPlatformSchoolDetail } from '@/lib/saas'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SuperAdminSchoolDetailPage({ params }: PageProps) {
  const { id } = await params
  const school = await getPlatformSchoolDetail(id)

  if (!school) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              {school.name}
            </h2>
            <Badge variant={school.is_active ? 'success' : 'warning'}>
              {school.is_active ? 'Active' : 'Suspended'}
            </Badge>
          </div>
          <p className="text-sm text-slate-600">
            {school.slug}.schoolos.in {school.custom_domain ? `• ${school.custom_domain}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{school.platform_plan}</Badge>
          <Badge variant="outline">{school.platform_status}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Students', school.counts.students.toLocaleString('en-IN')],
          ['Staff', school.counts.staff.toLocaleString('en-IN')],
          ['Users', school.counts.users.toLocaleString('en-IN')],
          ['Revenue', formatCurrency(school.total_revenue)],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-[1.5rem] border-white/70 bg-white/90">
            <CardContent className="space-y-2 p-6">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Tenant Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              <strong>Principal:</strong> {school.principal?.email || 'Not assigned'}
            </p>
            <p>
              <strong>School Email:</strong> {school.email || 'Not set'}
            </p>
            <p>
              <strong>Phone:</strong> {school.phone || 'Not set'}
            </p>
            <p>
              <strong>Board:</strong> {school.board || 'Not set'}
            </p>
            <p>
              <strong>Joined:</strong> {formatDate(school.created_at)}
            </p>
            <p>
              <strong>Current Academic Year:</strong>{' '}
              {school.current_academic_year?.name || 'Not configured'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Branding & Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Primary</p>
                <div
                  className="mt-3 h-12 rounded-xl"
                  style={{ backgroundColor: school.brand_primary }}
                />
                <p className="mt-2 text-sm font-medium">{school.brand_primary}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Accent</p>
                <div
                  className="mt-3 h-12 rounded-xl"
                  style={{ backgroundColor: school.brand_accent }}
                />
                <p className="mt-2 text-sm font-medium">{school.brand_accent}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Pending admissions</p>
                <p className="mt-2 text-2xl font-semibold">
                  {school.counts.pending_admissions.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Unread notifications</p>
                <p className="mt-2 text-2xl font-semibold">
                  {school.counts.unread_notifications.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
