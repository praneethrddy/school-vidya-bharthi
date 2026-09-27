import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getPermissionsForRole } from '@/lib/permissions'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminHeader } from '@/components/layout/admin-header'
import { prisma } from '@/lib/prisma'
import { resolveAdminDashboardSchoolId } from '@/lib/admin-dashboard'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?callbackUrl=%2Fadmin%2Fdashboard')
  }

  if (session.user.role === 'STUDENT' || session.user.role === 'PARENT') {
    redirect('/dashboard')
  }

  const schoolId = await resolveAdminDashboardSchoolId(session.user.schoolId, session.user.role)
  const permissions = await getPermissionsForRole(schoolId, session.user.role)

  const schoolData = schoolId
    ? await prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          name: true,
          academic_years: {
            where: { is_current: true },
            select: { id: true, name: true },
            take: 1,
          },
        },
      })
    : null

  const academicYearId = schoolData?.academic_years[0]?.id
  const currentTerm = academicYearId
    ? await prisma.term.findFirst({
        where: {
          school_id: schoolId as string,
          academic_year_id: academicYearId,
        },
        orderBy: { start_date: 'asc' },
        select: { name: true },
      })
    : null

  const schoolInfo = {
    name: schoolData?.name || 'Vidhya Bharthi High School',
    academicYear: schoolData?.academic_years[0]?.name || 'Current Year',
    term: currentTerm?.name || '',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar
        role={session.user.role}
        permissions={permissions}
        schoolName={schoolInfo.name}
      />
      <div className="flex w-full flex-1 flex-col overflow-hidden">
        <AdminHeader
          user={{
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
          }}
          schoolInfo={schoolInfo}
          permissions={permissions}
        />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
