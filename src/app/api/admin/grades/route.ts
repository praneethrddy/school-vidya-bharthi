import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-helpers'
import { computeGrade, isPass, GradingScheme } from '@/lib/grading'
import { Decimal } from 'decimal.js'

const upsertGradesSchema = z.object({
  exam_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  grades: z.array(
    z.object({
      student_id: z.string().uuid(),
      marks_obtained: z.number().min(0).nullable(), // null means clear it
      remarks: z.string().optional().nullable(),
    })
  )
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
  const examId = searchParams.get('exam_id')
  const subjectId = searchParams.get('subject_id')
  
  if (!examId) return errorResponse('INVALID_PARAMS', 'exam_id is required')
  if (!subjectId) return errorResponse('INVALID_PARAMS', 'subject_id is required') // UI logic assumes one subject at a time mostly

  const exam = await prisma.exam.findUnique({
    where: { id: examId, school_id: schoolId },
    include: {
      class: { select: { id: true, name: true, section: true } },
      term: { select: { name: true } },
      exam_subjects: {
        where: { subject_id: subjectId },
        include: { subject: { select: { id: true, name: true } } }
      }
    }
  })

  if (!exam) return errorResponse('NOT_FOUND', 'Exam not found', 404)
  if (exam.exam_subjects.length === 0) return errorResponse('NOT_FOUND', 'Subject not found in this exam', 404)

  const examSubject = exam.exam_subjects[0]

  // Role validation
  if (!canViewAll && canViewOwn) {
    const staff = await prisma.staff.findFirst({ where: { user_id: u.id, school_id: schoolId } })
    if (!staff) return forbiddenResponse('Not recognized as staff')
    
    // Check if staff teaches this subject for this class
    const teaches = await prisma.subjectAssignment.findFirst({
      where: { school_id: schoolId, staff_id: staff.id, subject_id: subjectId }
    })
    
    if (!teaches) return forbiddenResponse('You are not assigned to view/enter grades for this subject')
  }

  // Get active students of this class
  const students = await prisma.student.findMany({
    where: { school_id: schoolId, class_id: exam.class_id, is_active: true },
    select: { id: true, first_name: true, last_name: true, roll_number: true },
    orderBy: [{ roll_number: 'asc'}, { first_name: 'asc' }]
  })

  // Get grades for this exam & subject
  const grades = await prisma.grade.findMany({
    where: { school_id: schoolId, exam_id: examId, subject_id: subjectId },
    include: { enterer: { select: { first_name: true, last_name: true } } }
  })
  const gradeMap = new Map(grades.map(g => [g.student_id, g]))

  let entered = 0
  let passCount = 0
  let failCount = 0
  let totalMarks = 0
  let highest = -1
  let lowest = 999999

  const studentGrades = students.map(s => {
    const g = gradeMap.get(s.id)
    const marks = g?.marks_obtained ? g.marks_obtained.toNumber() : null
    
    if (marks !== null) {
      entered++
      totalMarks += marks
      if (marks > highest) highest = marks
      if (marks < lowest) lowest = marks
      
      if (isPass(marks, examSubject.passing_marks)) passCount++
      else failCount++
    }

    return {
      grade_id: g?.id || null,
      student_id: s.id,
      student_name: `${s.first_name} ${s.last_name}`,
      roll_number: s.roll_number || '',
      marks_obtained: marks,
      grade: g?.grade || null,
      remarks: g?.remarks || null,
      entered_by: g?.enterer ? `${g.enterer.first_name} ${g.enterer.last_name}` : null,
      is_pass: marks !== null ? isPass(marks, examSubject.passing_marks) : null
    }
  })

  const totalStudents = students.length
  
  return successResponse({
    exam: { id: exam.id, name: exam.name, class_name: `${exam.class.name} ${exam.class.section||''}`.trim(), term_name: exam.term.name },
    subject: { id: examSubject.subject_id, name: examSubject.subject.name, max_marks: examSubject.max_marks, passing_marks: examSubject.passing_marks },
    grades: studentGrades,
    summary: {
      total_students: totalStudents,
      entered,
      pending: totalStudents - entered,
      pass_count: passCount,
      fail_count: failCount,
      highest: highest === -1 ? 0 : highest,
      lowest: lowest === 999999 ? 0 : lowest,
      average: entered > 0 ? (totalMarks / entered).toFixed(1) : 0,
      class_pass_percentage: entered > 0 ? ((passCount / entered) * 100).toFixed(1) : 0
    }
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const canEnterAll = await hasPermission(schoolId, u.role, 'GRADES.enter')
  const canEnterOwn = await hasPermission(schoolId, u.role, 'GRADES.view_own_subject') // Assuming enter and view own are somewhat synonymous here, or just limit based on assignment.
  // Actually, wait, planning.md says: 'Auth: GRADES.enter permission'. If GRADES.view_own_subject only: validate teacher is assigned. 
  // Let's assume GRADES.enter combined with GRADES.view_own_subject allows them to enter. If they don't have GRADES.enter at all, reject.
  // Wait, `hasPermission` check. If they have GRADES.enter it might be global or role-based.
  if (!canEnterAll) return forbiddenResponse('Missing GRADES.enter permission')

  try {
    const bodyText = await request.text()
    const parsed = upsertGradesSchema.safeParse(JSON.parse(bodyText))
    if (!parsed.success) return errorResponse('VALIDATION_ERROR', 'Invalid data', 400)

    const { exam_id, subject_id, grades } = parsed.data

    const exam = await prisma.exam.findUnique({
      where: { id: exam_id, school_id: schoolId },
      include: { exam_subjects: { where: { subject_id } } }
    })

    if (!exam || exam.exam_subjects.length === 0) {
      return errorResponse('NOT_FOUND', 'Exam or subject not found', 404)
    }

    const examSubject = exam.exam_subjects[0]

    // Validate own subject logic
    let staffId: string | null = null
    const canViewAll = await hasPermission(schoolId, u.role, 'GRADES.view_all')
    if (!canViewAll && (u.role === 'TEACHER' || canEnterAll)) {
      const staff = await prisma.staff.findFirst({ where: { user_id: u.id, school_id: schoolId } })
      if (!staff) return forbiddenResponse('Not recognized as staff')
      staffId = staff.id
      
      const teaches = await prisma.subjectAssignment.findFirst({
        where: { school_id: schoolId, staff_id: staffId, subject_id }
      })
      if (!teaches) return forbiddenResponse('You are not assigned to enter grades for this subject')
    } else {
       const staff = await prisma.staff.findFirst({ where: { user_id: u.id, school_id: schoolId } })
       staffId = staff?.id || null
    }

    // Get grading scheme from settings
    const settings = await prisma.schoolSetting.findFirst({
      where: { school_id: schoolId, setting_key: 'grading_scheme' }
    })
    const schemeValue = (settings?.setting_value || 'PERCENTAGE') as GradingScheme

    // Validate marks and prepare upserts
    const results = await prisma.$transaction(async (tx) => {
      const changes = []
      for (const item of grades) {
        if (item.marks_obtained !== null && (item.marks_obtained < 0 || item.marks_obtained > examSubject.max_marks)) {
           throw new Error(`Marks ${item.marks_obtained} out of range (0-${examSubject.max_marks})`)
        }

        const exactGrade = item.marks_obtained !== null 
           ? computeGrade(item.marks_obtained, examSubject.max_marks, schemeValue)
           : null

        const existing = await tx.grade.findUnique({
          where: { school_id_student_id_exam_id_subject_id: {
            school_id: schoolId, student_id: item.student_id, exam_id, subject_id
          }}
        })

        const newData = {
          school_id: schoolId,
          student_id: item.student_id,
          exam_id,
          subject_id,
          marks_obtained: item.marks_obtained,
          grade: exactGrade,
          remarks: item.remarks,
          entered_by: staffId
        }

        if (existing) {
          if (item.marks_obtained === null && item.remarks == null) {
            // Delete if totally cleared
            await tx.grade.delete({ where: { id: existing.id } })
            changes.push({ id: existing.id, old: existing, new: null })
          } else {
            await tx.grade.update({
              where: { id: existing.id },
              data: newData
            })
            changes.push({ id: existing.id, old: existing, new: newData })
          }
        } else if (item.marks_obtained !== null || item.remarks) {
          const created = await tx.grade.create({ data: newData })
          changes.push({ id: created.id, old: null, new: newData })
        }
      }
      return changes
    })

    for (const change of results) {
        await createAuditLog({
          school_id: schoolId,
          user_id: u.id,
          action: change.new === null ? 'DELETE' : (change.old ? 'UPDATE' : 'CREATE'),
          entity_type: 'GRADE',
          entity_id: change.id,
          old_value: change.old || undefined,
          new_value: change.new || undefined
        })
    }

    return successResponse({ message: 'Grades saved successfully' })

  } catch (error: any) {
    if (error.message.includes('out of range')) return errorResponse('VALIDATION_ERROR', error.message, 400)
    return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to save grades', 500)
  }
}
