import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const [canRecordPayment, canConcession, canViewReports] = await Promise.all([
    hasPermission(user.schoolId, user.role, 'FEES.record_payment'),
    hasPermission(user.schoolId, user.role, 'FEES.create_concession_request'),
    hasPermission(user.schoolId, user.role, 'FEES.view_reports'),
  ])

  if (!canRecordPayment && !canConcession && !canViewReports) {
    return forbiddenResponse('Missing fee module permissions')
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''
  const classId = searchParams.get('class_id')
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 10)))

  const students = await prisma.student.findMany({
    where: {
      school_id: user.schoolId,
      is_active: true,
      ...(classId ? { class_id: classId } : {}),
      ...(query
        ? {
            OR: [
              { first_name: { contains: query, mode: 'insensitive' } },
              { last_name: { contains: query, mode: 'insensitive' } },
              { admission_number: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      class: {
        select: {
          name: true,
          section: true,
        },
      },
    },
    take: limit,
    orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
  })

  return successResponse(
    students.map((student) => ({
      id: student.id,
      name: `${student.first_name} ${student.last_name}`.trim(),
      admission_number: student.admission_number,
      class_name: `${student.class?.name || 'N/A'} ${student.class?.section || ''}`.trim(),
      class_id: student.class_id,
      academic_year_id: student.academic_year_id,
    }))
  )
}
