import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-helpers'
import { computeGrade, GradingScheme } from '@/lib/grading'

const editGradeSchema = z.object({
  marks_obtained: z.number().min(0).nullable().optional(),
  remarks: z.string().optional().nullable(),
})

type Params = { id: string }

export async function PATCH(request: NextRequest, { params }: { params: Promise<Params> }) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  // Auth: GRADES.edit permission
  const canEdit = await hasPermission(schoolId, u.role, 'GRADES.edit')
  const isPrincipal = u.role === 'PRINCIPAL' || u.role === 'SUPER_ADMIN'
  if (!canEdit && !isPrincipal) return forbiddenResponse('Missing GRADES.edit permission')

  const { id } = await params

  try {
    const bodyText = await request.text()
    const parsed = editGradeSchema.safeParse(JSON.parse(bodyText))
    if (!parsed.success) return errorResponse('VALIDATION_ERROR', 'Invalid data', 400)

    const { marks_obtained, remarks } = parsed.data

    const existingGrade = await prisma.grade.findUnique({
      where: { id, school_id: schoolId },
      include: {
        exam: {
          include: { exam_subjects: true }
        }
      }
    })

    if (!existingGrade) return errorResponse('NOT_FOUND', 'Grade not found', 404)

    const examSubject = existingGrade.exam.exam_subjects.find(es => es.subject_id === existingGrade.subject_id)
    if (!examSubject) return errorResponse('NOT_FOUND', 'Exam subject reference lost', 404)

    if (marks_obtained !== undefined && marks_obtained !== null && marks_obtained > examSubject.max_marks) {
       return errorResponse('VALIDATION_ERROR', `Marks out of range (max ${examSubject.max_marks})`, 400)
    }

    const settings = await prisma.schoolSetting.findFirst({
       where: { school_id: schoolId, setting_key: 'grading_scheme' }
    })
    const schemeValue = (settings?.setting_value || 'PERCENTAGE') as GradingScheme

    const staff = await prisma.staff.findFirst({ where: { user_id: u.id, school_id: schoolId } })
    
    // We compute the new grade if marks are changed or kept
    const finalMarks = marks_obtained !== undefined ? marks_obtained : (existingGrade.marks_obtained ? existingGrade.marks_obtained.toNumber() : null)
    const exactGrade = finalMarks !== null 
       ? computeGrade(finalMarks, examSubject.max_marks, schemeValue)
       : null

    const updated = await prisma.grade.update({
      where: { id },
      data: {
        marks_obtained: marks_obtained !== undefined ? marks_obtained : undefined,
        remarks: remarks !== undefined ? remarks : undefined,
        grade: exactGrade,
        entered_by: staff?.id ? staff.id : existingGrade.entered_by // only update enterer if it was changed? The spec says update marks/remarks. Let's keep existing enterer or update it. Let's update since this person changed it.
      }
    })

    await createAuditLog({
      school_id: schoolId,
      user_id: u.id,
      action: 'UPDATE',
      entity_type: 'GRADE',
      entity_id: id,
      old_value: existingGrade,
      new_value: updated
    })

    return successResponse(updated)

  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to update grade', 500)
  }
}
