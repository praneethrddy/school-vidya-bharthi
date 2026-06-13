import { auth } from '@/lib/auth'
import { PermissionGrid } from '@/components/admin/permission-grid'
import { redirect } from 'next/navigation'

export default async function PermissionsPage() {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined

  if (!user) {
    redirect('/login?callbackUrl=%2Fadmin%2Fpermissions')
  }

  if (user.role !== 'PRINCIPAL' && user.role !== 'SUPER_ADMIN') {
    redirect('/portal/forbidden')
  }

  return <PermissionGrid />
}
