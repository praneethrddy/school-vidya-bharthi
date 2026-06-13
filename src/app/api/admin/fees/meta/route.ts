import { auth } from '@/lib/auth'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const [canViewStructure, canViewReports, canRecordPayment, canConcession] = await Promise.all([
    hasPermission(user.schoolId, user.role, 'FEES.view_structure'),
    hasPermission(user.schoolId, user.role, 'FEES.view_reports'),
    hasPermission(user.schoolId, user.role, 'FEES.record_payment'),
    hasPermission(user.schoolId, user.role, 'FEES.create_concession_request'),
  ])

  if (!canViewStructure && !canViewReports && !canRecordPayment && !canConcession) {
    return forbiddenResponse('Missing fee module permissions')
  }

  const [academicYears, currentYear, categories] = await Promise.all([
    prisma.academicYear.findMany({
      where: { school_id: user.schoolId },
      select: {
        id: true,
        name: true,
        is_current: true,
      },
      orderBy: { start_date: 'desc' },
    }),
    prisma.academicYear.findFirst({
      where: { school_id: user.schoolId, is_current: true },
      select: {
        id: true,
      },
    }),
    prisma.feeCategory.findMany({
      where: { school_id: user.schoolId },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const classes = await prisma.class.findMany({
    where: {
      school_id: user.schoolId,
      ...(currentYear?.id ? { academic_year_id: currentYear.id } : {}),
    },
    select: {
      id: true,
      name: true,
      section: true,
      academic_year_id: true,
    },
    orderBy: [{ name: 'asc' }, { section: 'asc' }],
  })

  return successResponse({
    academic_years: academicYears,
    classes: classes.map((item) => ({
      id: item.id,
      name: `${item.name} ${item.section || ''}`.trim(),
      academic_year_id: item.academic_year_id,
    })),
    categories,
    current_academic_year_id: currentYear?.id || null,
  })
}
