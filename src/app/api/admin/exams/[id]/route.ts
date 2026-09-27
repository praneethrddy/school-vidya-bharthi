import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-helpers'

const updateExamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  subjects: z.array(
    z.object({
      id: z.string().uuid().optional(), // Existing subject tie
      subject_id: z.string().uuid(),
      max_marks: z.number().positive(),
      passing_marks: z.number().min(0),
      exam_date: z.string().optional().nullable(),
    })
  ).optional()
})

type Params = { id: string }

export async function GET(request: NextRequest, { params }: { params: Promise<Params> }) {
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

  const { id } = await params

  const exam = await prisma.exam.findUnique({
    where: { id, school_id: schoolId },
    include: {
      class: { select: { id: true, name: true, section: true } },
      term: { select: { id: true, name: true } },
      academic_year: { select: { id: true, name: true } },
      exam_subjects: {
        include: {
          subject: { select: { id: true, name: true, code: true } }
        }
      }
    }
  })

  if (!exam) return errorResponse('NOT_FOUND', 'Exam not found', 404)

  return successResponse(exam)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<Params> }) {
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

  const { id } = await params

  try {
    const bodyText = await request.text()
    if (!bodyText) return errorResponse('INVALID_BODY', 'Empty request body')
    
    let body
    try {
      body = JSON.parse(bodyText)
    } catch {
      return errorResponse('INVALID_JSON', 'Malformed JSON body')
    }

    const parsed = updateExamSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid data', 400)
    }

    const existing = await prisma.exam.findUnique({
      where: { id, school_id: schoolId },
      include: { exam_subjects: true }
    })

    if (!existing) return errorResponse('NOT_FOUND', 'Exam not found', 404)

    const data = parsed.data

    const updatedExam = await prisma.$transaction(async (tx) => {
      // If subjects are provided, we need to carefully sync them
      if (data.subjects) {
        const incomingSubjectIds = data.subjects.filter(s => s.id).map(s => s.id)
        const existingSubjectIds = existing.exam_subjects.map(es => es.id)

        const toDeleteIds = existingSubjectIds.filter(x => !incomingSubjectIds.includes(x))
        if (toDeleteIds.length > 0) {
          await tx.examSubject.deleteMany({
            where: { id: { in: toDeleteIds }, exam_id: id, school_id: schoolId }
          })
        }

        for (const s of data.subjects) {
          if (s.id) {
            await tx.examSubject.update({
              where: { id: s.id },
              data: {
                max_marks: s.max_marks,
                passing_marks: s.passing_marks,
                exam_date: s.exam_date ? new Date(s.exam_date) : null
              }
            })
          } else {
            await tx.examSubject.create({
              data: {
                exam_id: id,
                school_id: schoolId,
                subject_id: s.subject_id,
                max_marks: s.max_marks,
                passing_marks: s.passing_marks,
                exam_date: s.exam_date ? new Date(s.exam_date) : null
              }
            })
          }
        }
      }

      return tx.exam.update({
        where: { id, school_id: schoolId },
        data: {
          name: data.name !== undefined ? data.name : undefined,
          start_date: data.start_date !== undefined ? (data.start_date ? new Date(data.start_date) : null) : undefined,
          end_date: data.end_date !== undefined ? (data.end_date ? new Date(data.end_date) : null) : undefined,
        },
        include: { exam_subjects: true }
      })
    })

    await createAuditLog({
      school_id: schoolId,
      user_id: u.id,
      action: 'UPDATE',
      entity_type: 'EXAM',
      entity_id: id,
      old_value: existing,
      new_value: updatedExam
    })

    return successResponse(updatedExam)

  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to update exam', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<Params> }) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const isPrincipal = u.role === 'PRINCIPAL' || u.role === 'SUPER_ADMIN'
  if (!isPrincipal) {
    return forbiddenResponse('Only Principal can delete exams')
  }

  const { id } = await params

  try {
    const existing = await prisma.exam.findUnique({
      where: { id, school_id: schoolId }
    })
    
    if (!existing) return errorResponse('NOT_FOUND', 'Exam not found', 404)

    await prisma.$transaction([
      prisma.grade.deleteMany({ where: { exam_id: id, school_id: schoolId } }),
      prisma.examSubject.deleteMany({ where: { exam_id: id, school_id: schoolId } }),
      prisma.exam.delete({ where: { id, school_id: schoolId } })
    ])

    await createAuditLog({
      school_id: schoolId,
      user_id: u.id,
      action: 'DELETE',
      entity_type: 'EXAM',
      entity_id: id,
      old_value: existing
    })

    return successResponse({ deleted: true })

  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to delete exam', 500)
  }
}
