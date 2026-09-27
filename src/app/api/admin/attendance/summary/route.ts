import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  // Only ATTENDANCE.view_all can see this summary
  const canViewAll = await hasPermission(schoolId, u.role, 'ATTENDANCE.view_all')
  if (!canViewAll) return forbiddenResponse('Missing ATTENDANCE.view_all permission')

  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const academicYearId = searchParams.get('academic_year_id')

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return errorResponse('INVALID_DATE', 'Invalid date format')
  }

  const classesQuery: any = {
    school_id: schoolId
  }
  if (academicYearId) {
    classesQuery.academic_year_id = academicYearId
  }

  // Fetch all classes
  const classes = await prisma.class.findMany({
    where: classesQuery,
    select: {
      id: true,
      name: true,
      section: true,
      _count: {
        select: { students: { where: { is_active: true } } }
      }
    },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  })

  // Fetch attendance records for this date
  const records = await prisma.attendance.findMany({
    where: { school_id: schoolId, date: date },
    include: {
      marker: {
        select: { first_name: true, last_name: true }
      }
    }
  })

  // Group records by class_id
  const classAttendance = new Map<string, typeof records>()
  for (const r of records) {
    if (!classAttendance.has(r.class_id)) {
      classAttendance.set(r.class_id, [])
    }
    classAttendance.get(r.class_id)!.push(r)
  }

  let schoolTotalStudents = 0
  let schoolPresent = 0
  let schoolAbsent = 0
  let classesMarked = 0
  let classesNotMarked = 0

  const classesResult = classes.map(cls => {
    let present = 0, absent = 0, late = 0, half_day = 0
    let isMarked = false
    let markedBy: string | null = null
    let markedAt: Date | null = null

    const clsRecords = classAttendance.get(cls.id) || []
    if (clsRecords.length > 0) {
      isMarked = true
      classesMarked++
      
      const firstRecordWithMarker = clsRecords.find(r => r.marker)
      if (firstRecordWithMarker && firstRecordWithMarker.marker) {
        markedBy = `${firstRecordWithMarker.marker.first_name} ${firstRecordWithMarker.marker.last_name}`
      }
      markedAt = clsRecords.reduce((max, r) => r.updated_at > max ? r.updated_at : max, clsRecords[0].updated_at)

      for (const r of clsRecords) {
        if (r.status === 'PRESENT') present++
        else if (r.status === 'ABSENT') absent++
        else if (r.status === 'LATE') late++
        else if (r.status === 'HALF_DAY') half_day++
      }
    } else {
      classesNotMarked++
    }

    const totalStudents = cls._count.students
    schoolTotalStudents += totalStudents
    schoolPresent += present + late + half_day // Counting late & half_day as "not full absent" but this is subjective. Wait, let's strictly do present. 
    // Usually presence = PRESENT + LATE + HALF_DAY. But for percentage maybe just PRESENT?
    schoolAbsent += absent

    return {
      class_id: cls.id,
      class_name: `${cls.name} ${cls.section || ''}`.trim(),
      total_students: totalStudents,
      present,
      absent,
      late,
      half_day,
      is_marked: isMarked,
      marked_by: markedBy,
      marked_at: markedAt ? markedAt.toISOString() : null
    }
  })

  // Recalculate strictly PRESENT for schoolPresent or just use simple total
  // P + L + H goes into "Attendance". We'll just define schoolPresent as exactly P
  const schoolTotalPresentAndLate = classesResult.reduce((sum, c) => sum + c.present + c.late + c.half_day, 0)
  const percentage = schoolTotalStudents > 0 ? Math.round((schoolTotalPresentAndLate / schoolTotalStudents) * 100) : 0

  return successResponse({
    date: dateStr,
    classes: classesResult,
    school_total: {
      total_students: schoolTotalStudents,
      present: classesResult.reduce((s, c) => s + c.present, 0),
      absent: classesResult.reduce((s, c) => s + c.absent, 0),
      percentage,
      classes_marked: classesMarked,
      classes_not_marked: classesNotMarked
    }
  })
}
