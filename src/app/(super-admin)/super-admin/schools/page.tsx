import { SchoolTable } from '@/components/super-admin/school-table'
import { listPlatformSchools } from '@/lib/saas'

export default async function SuperAdminSchoolsPage() {
  const schools = await listPlatformSchools()

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          Tenant Schools
        </h2>
        <p className="text-sm text-slate-600">
          Search across all onboarded schools, inspect activity, and suspend or reactivate tenants.
        </p>
      </div>

      <SchoolTable initialSchools={schools} />
    </div>
  )
}
