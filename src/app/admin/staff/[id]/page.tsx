import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getPermissionsForRole } from '@/lib/permissions'
import { StaffDetailClient } from '@/components/admin/staff-detail-client'

interface StaffDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function AdminStaffDetailPage({
  params,
  searchParams,
}: StaffDetailPageProps) {
  const { id } = await params
  const query = await searchParams

  const session = await auth()
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/admin/staff/${id}`)}`)
  }

  const role = session.user.role
  const schoolId = session.user.schoolId

  if (!schoolId) {
    redirect('/portal/forbidden')
  }

  const permissions = await getPermissionsForRole(schoolId, role)
  const canView = role === 'PRINCIPAL' || role === 'SUPER_ADMIN' || permissions.includes('STAFF.view')
  if (!canView) {
    redirect('/portal/forbidden')
  }

  return (
    <StaffDetailClient
      staffId={id}
      canEdit={role === 'PRINCIPAL' || role === 'SUPER_ADMIN' || permissions.includes('STAFF.edit')}
      canDelete={role === 'PRINCIPAL' || role === 'SUPER_ADMIN'}
      canManageAccounts={
        role === 'PRINCIPAL' || role === 'SUPER_ADMIN' || permissions.includes('STAFF.edit')
      }
      initialEditMode={query.edit === 'true'}
    />
  )
}

