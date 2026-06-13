import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const canViewAll = await hasPermission(schoolId, u.role, 'ATTENDANCE.view_all')
  const canViewOwn = await hasPermission(schoolId, u.role, 'ATTENDANCE.view_own_class')
  if (!canViewAll && !canViewOwn) {
    return forbiddenResponse('Missing ATTENDANCE view permissions')
  }

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('class_id')
  const dateStr = searchParams.get('date')

  if (!classId || !dateStr) {
    return errorResponse('INVALID_PARAMS', 'class_id and date are required')
  }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return errorResponse('INVALID_DATE', 'Invalid date format')
  }
  
  if (!canViewAll && canViewOwn) {
    const staff = await prisma.staff.findFirst({ where: { user_id: u.id, school_id: schoolId } })
    if (!staff) return forbiddenResponse('Not a recognized staff member')

    const cls = await prisma.class.findFirst({
      where: { id: classId, school_id: schoolId }
    })
    
    if (!cls) return errorResponse('NOT_FOUND', 'Class not found', 404)

    const isClassTeacher = cls.class_teacher_id === staff.id
    if (!isClassTeacher) {
      const isSubjectTeacher = await prisma.subjectAssignment.findFirst({
        where: {
          school_id: schoolId,
          staff_id: staff.id,
          subject: { class_id: classId }
        }
      })
      if (!isSubjectTeacher) {
         return forbiddenResponse('You are not assigned to this class')
      }
    }
  }

  const cls = await prisma.class.findFirst({
    where: { id: classId, school_id: schoolId },
    select: { id: true, name: true, section: true, _count: { select: { students: { where: { is_active: true } } } } }
  })
  if (!cls) return errorResponse('NOT_FOUND', 'Class not found', 404)

  const students = await prisma.student.findMany({
    where: { school_id: schoolId, class_id: classId, is_active: true },
    select: { id: true, first_name: true, last_name: true, roll_number: true, photo_url: true },
    orderBy: [{ roll_number: 'asc' }, { first_name: 'asc' }]
  })

  const records = await prisma.attendance.findMany({
    where: { school_id: schoolId, class_id: classId, date: date }
  })
  
  const recordMap = new Map(records.map(r => [r.student_id, r]))

  const isMarked = records.length > 0

  let present = 0, absent = 0, late = 0, half_day = 0, not_marked = 0

  const studentRecords = students.map(s => {
    const r = recordMap.get(s.id)
    const status = r?.status || null
    if (status === 'PRESENT') present++
    else if (status === 'ABSENT') absent++
    else if (status === 'LATE') late++
    else if (status === 'HALF_DAY') half_day++
    else not_marked++

    return {
      student_id: s.id,
      student_name: `${s.first_name} ${s.last_name}`,
      roll_number: s.roll_number || '',
      photo_url: s.photo_url,
      status: status,
      remarks: r?.remarks || null,
      id: r?.id || null,
    }
  })

  return successResponse({
    class: {
      id: cls.id,
      name: cls.name,
      section: cls.section,
      total_students: cls._count.students
    },
    date: dateStr,
    is_marked: isMarked,
    records: studentRecords,
    summary: { present, absent, late, half_day, not_marked }
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const canMark = await hasPermission(schoolId, u.role, 'ATTENDANCE.mark')
  if (!canMark) return forbiddenResponse('Missing ATTENDANCE.mark permission')

  const body = await request.json()
  const { class_id, date, records } = body

  if (!class_id || !date || !Array.isArray(records)) {
    return errorResponse('INVALID_PARAMS', 'Missing class_id, date, or records array')
  }

  const attendanceDate = new Date(date)
  if (isNaN(attendanceDate.getTime())) {
    return errorResponse('INVALID_DATE', 'Invalid date format')
  }

  const today = new Date()
  today.setHours(0,0,0,0)
  if (attendanceDate > today) {
    return errorResponse('FUTURE_DATE', 'Cannot mark attendance for future dates')
  }

  const staff = await prisma.staff.findFirst({ where: { user_id: u.id, school_id: schoolId } })
  const markedBy = staff?.id || null

  let results: any[] = []

  try {
    results = await prisma.$transaction(async (tx) => {
      const changes: any[] = []

      for (const rec of records) {
        if (!rec.student_id || !rec.status) continue

        const existing = await tx.attendance.findUnique({
          where: {
            school_id_student_id_date: {
              school_id: schoolId,
              student_id: rec.student_id,
              date: attendanceDate,
            },
          },
        })

        const newData = {
          school_id: schoolId,
          student_id: rec.student_id,
          class_id: class_id,
          date: attendanceDate,
          status: rec.status,
          remarks: rec.remarks || null,
          marked_by: markedBy,
        }

        if (existing) {
          if (existing.status !== rec.status || existing.remarks !== rec.remarks) {
            await tx.attendance.update({
              where: { id: existing.id },
              data: { status: rec.status, remarks: rec.remarks, marked_by: markedBy },
            })
            changes.push({ id: existing.id, old: existing, new: newData })
          }
        } else {
          const cr = await tx.attendance.create({ data: newData })
          changes.push({ id: cr.id, old: null, new: newData })
        }
      }

      return changes
    })
  } catch (transactionError: any) {
    if (transactionError?.code === 'P2002') {
      return errorResponse(
        'DUPLICATE_ATTENDANCE',
        'Attendance was already marked for one or more selected students',
        409
      )
    }

    throw transactionError
  }

  for (const change of results) {
     await createAuditLog({
        school_id: schoolId,
        user_id: u.id,
        action: change.old ? 'UPDATE' : 'CREATE',
        entity_type: 'ATTENDANCE',
        entity_id: change.id,
        old_value: change.old || undefined,
        new_value: change.new || undefined
     })
  }

  return successResponse({ message: 'Attendance marked successfully', updated_count: results.length })
}
