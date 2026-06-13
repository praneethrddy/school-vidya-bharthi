import { redirect } from 'next/navigation'
import { StudentDetailTabs } from '@/components/admin/student-detail-tabs'
import { auth } from '@/lib/auth'
import { getPermissionsForRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface StudentDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; edit?: string }>
}

export default async function AdminStudentDetailPage({
  params,
  searchParams,
}: StudentDetailPageProps) {
  const { id } = await params
  const query = await searchParams

  const session = await auth()
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/admin/students/${id}`)}`)
  }

  const role = session.user.role
  const schoolId = session.user.schoolId

  if (!schoolId) {
    redirect('/portal/forbidden')
  }

  const permissions = await getPermissionsForRole(schoolId, role)
  const canView = role === 'PRINCIPAL' || role === 'SUPER_ADMIN' || permissions.includes('STUDENTS.view')
  if (!canView) {
    redirect('/portal/forbidden')
  }

  const [classes, academicYears] = await Promise.all([
    prisma.class.findMany({
      where: {
        school_id: schoolId,
      },
      select: {
        id: true,
        name: true,
        section: true,
        academic_year_id: true,
      },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
    }),
    prisma.academicYear.findMany({
      where: {
        school_id: schoolId,
      },
      select: {
        id: true,
        name: true,
        is_current: true,
      },
      orderBy: [{ start_date: 'desc' }],
    }),
  ])

  return (
    <StudentDetailTabs
      studentId={id}
      classes={classes.map((classEntry) => ({
        id: classEntry.id,
        name: classEntry.name,
        section: classEntry.section,
        label: `${classEntry.name}${classEntry.section ? ` - ${classEntry.section}` : ''}`,
        academic_year_id: classEntry.academic_year_id,
      }))}
      academicYears={academicYears}
      canEdit={role === 'PRINCIPAL' || role === 'SUPER_ADMIN' || permissions.includes('STUDENTS.edit')}
      canDelete={role === 'PRINCIPAL' || role === 'SUPER_ADMIN'}
      initialTab={query.tab || 'overview'}
      initialEditMode={query.edit === 'true'}
    />
  )
}

