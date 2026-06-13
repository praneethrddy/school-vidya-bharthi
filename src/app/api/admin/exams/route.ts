import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-helpers'

const createExamSchema = z.object({
  name: z.string().min(1, 'Exam name is required').max(100),
  class_id: z.string().uuid(),
  term_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  subjects: z.array(
    z.object({
      subject_id: z.string().uuid(),
      max_marks: z.number().positive().default(100),
      passing_marks: z.number().min(0).default(35),
      exam_date: z.string().optional().nullable(),
    })
  ).min(1, 'At least one subject is required'),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const canViewAll = await hasPermission(schoolId, u.role, 'GRADES.view_all')
  const canViewOwn = await hasPermission(schoolId, u.role, 'GRADES.view_own_subject')
  
  if (!canViewAll && !canViewOwn) {
    return forbiddenResponse('Missing GRADES view permissions')
  }

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('class_id')
  const termId = searchParams.get('term_id')
  const academicYearId = searchParams.get('academic_year_id')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const whereClause: any = { school_id: schoolId }
  if (classId) whereClause.class_id = classId
  if (termId) whereClause.term_id = termId
  if (academicYearId) whereClause.academic_year_id = academicYearId

  const skip = (page - 1) * limit

  const [exams, totalCount] = await Promise.all([
    prisma.exam.findMany({
      where: whereClause,
      include: {
        class: { select: { name: true, section: true } },
        term: { select: { name: true } },
        _count: {
          select: { exam_subjects: true, grades: true }
        }
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.exam.count({ where: whereClause })
  ])

  // Map to desired response
  const mappedExams = exams.map(exam => ({
    id: exam.id,
    name: exam.name,
    class_name: `${exam.class.name} ${exam.class.section || ''}`.trim(),
    term_name: exam.term.name,
    start_date: exam.start_date,
    end_date: exam.end_date,
    subjects_count: exam._count.exam_subjects,
    grades_entered_count: exam._count.grades
  }))

  return successResponse({
    data: mappedExams,
    meta: {
      page,
      limit,
      total: totalCount,
      total_pages: Math.ceil(totalCount / limit)
    }
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const canEnter = await hasPermission(schoolId, u.role, 'GRADES.enter')
  const isPrincipal = u.role === 'PRINCIPAL' || u.role === 'SUPER_ADMIN'
  
  if (!canEnter && !isPrincipal) {
    return forbiddenResponse('Missing GRADES.enter permission')
  }

  try {
    const bodyText = await request.text()
    if (!bodyText) return errorResponse('INVALID_BODY', 'Empty request body')
    
    let body
    try {
      body = JSON.parse(bodyText)
    } catch {
      return errorResponse('INVALID_JSON', 'Malformed JSON body')
    }

    const parsed = createExamSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid data', 400)
    }

    const { name, class_id, term_id, academic_year_id, start_date, end_date, subjects } = parsed.data

    // 1. Check uniqueness
    const existing = await prisma.exam.findFirst({
      where: { school_id: schoolId, class_id, term_id, name }
    })

    if (existing) {
      return errorResponse('CONFLICT', 'An exam with this name already exists for this class and term', 409)
    }

    // 2. Wrap in transaction
    const createdExam = await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          school_id: schoolId,
          name,
          class_id,
          term_id,
          academic_year_id,
          start_date: start_date ? new Date(start_date) : null,
          end_date: end_date ? new Date(end_date) : null,
          exam_subjects: {
            create: subjects.map(s => ({
              school_id: schoolId,
              subject_id: s.subject_id,
              max_marks: s.max_marks,
              passing_marks: s.passing_marks,
              exam_date: s.exam_date ? new Date(s.exam_date) : null
            }))
          }
        },
        include: { exam_subjects: true }
      })

      return exam
    })

    // 3. Audit Logging
    await createAuditLog({
      school_id: schoolId,
      user_id: u.id,
      action: 'CREATE',
      entity_type: 'EXAM',
      entity_id: createdExam.id,
      new_value: createdExam
    })

    return successResponse(createdExam)

  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to create exam', 500)
  }
}
