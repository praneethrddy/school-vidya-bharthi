import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getPermissionsForRole } from '@/lib/permissions'
import {
  getAdminDashboardData,
  isAdminDashboardRole,
  resolveAdminDashboardSchoolId,
} from '@/lib/admin-dashboard'
import { logger } from '@/lib/logger'
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?callbackUrl=%2Fadmin%2Fdashboard')
  }

  if (!isAdminDashboardRole(session.user.role)) {
    redirect('/dashboard')
  }

  const schoolId = await resolveAdminDashboardSchoolId(session.user.schoolId, session.user.role)
  if (!schoolId) {
    redirect('/login')
  }

  const permissions = await getPermissionsForRole(schoolId, session.user.role)

  let initialData = null
  let initialError: string | null = null

  try {
    initialData = await getAdminDashboardData({
      schoolId,
      userId: session.user.id,
      role: session.user.role,
      permissions,
    })
  } catch (error) {
    logger.error({ error, schoolId }, 'Failed to preload admin dashboard')
    initialError = 'Dashboard data could not be loaded.'
  }

  return (
    <AdminDashboardClient
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      initialData={initialData}
      initialError={initialError}
    />
  )
}
