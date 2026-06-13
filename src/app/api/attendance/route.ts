import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { startOfMonth, endOfMonth, parseISO, isValid, format } from 'date-fns'

async function getTargetStudentId(userId: string, schoolId: string, role: string, queryStudentId: string | null) {
  let targetStudentId: string | undefined

  if (role === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { user_id: userId, school_id: schoolId }
    })
    if (!student) throw new Error('Student record not found')
    targetStudentId = student.id
  } else if (role === 'PARENT') {
    const parent = await prisma.parent.findFirst({
      where: { user_id: userId, school_id: schoolId }
    })
    if (!parent) throw new Error('Parent record not found')

    if (queryStudentId) {
      const relationship = await prisma.studentParent.findFirst({
        where: { parent_id: parent.id, student_id: queryStudentId, school_id: schoolId }
      })
      if (!relationship) throw new Error('Unauthorized to view this student')
      targetStudentId = queryStudentId
    } else {
      const firstChild = await prisma.studentParent.findFirst({
        where: { parent_id: parent.id, school_id: schoolId },
        orderBy: { created_at: 'asc' }
      })
      if (!firstChild) throw new Error('No linked children found')
      targetStudentId = firstChild.student_id
    }
  } else {
    throw new Error('Forbidden')
  }

  return targetStudentId
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role, schoolId, id: userId } = session.user
    if (!schoolId) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const url = new URL(req.url)
    const monthParam = url.searchParams.get('month')
    const queryStudentId = url.searchParams.get('student_id')
    // const academicYearId = url.searchParams.get('academic_year_id') // Optional

    if (!monthParam) {
      return NextResponse.json({ error: 'Missing month parameter (YYYY-MM)' }, { status: 400 })
    }

    const targetDate = parseISO(`${monthParam}-01`)
    if (!isValid(targetDate)) {
      return NextResponse.json({ error: 'Invalid month parameter format' }, { status: 400 })
    }

    const start = startOfMonth(targetDate)
    const end = endOfMonth(targetDate)

    const targetStudentId = await getTargetStudentId(userId, schoolId, role, queryStudentId)

    const cacheKey = `attendance:monthly:${targetStudentId}:${monthParam}`
    try {
      const cached = await redis.get(cacheKey)
      if (cached) return NextResponse.json(JSON.parse(cached))
    } catch (e) {
      console.warn('Redis read error:', e)
    }

    const records = await prisma.attendance.findMany({
      where: {
        school_id: schoolId,
        student_id: targetStudentId,
        date: {
          gte: start,
          lte: end
        }
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        status: true,
        remarks: true
      }
    })

    const settings = await prisma.schoolSetting.findUnique({
      where: { school_id_setting_key: { school_id: schoolId, setting_key: 'working_days' } }
    })
    
    // Default to MON-SAT if not found
    const workingDaysStr = settings?.setting_value || 'MON,TUE,WED,THU,FRI,SAT'
    const workingDays = workingDaysStr.split(',')
    
    // Calculate naive total working days for the month based on settings
    let total_working_days = 0;
    const current = new Date(start)
    const dayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    while (current <= end) {
      if (workingDays.includes(dayMap[current.getDay()])) {
        // Assume working day, unless it's explicitly a holiday, but we don't have a holiday calendar right now
        total_working_days++;
      }
      current.setDate(current.getDate() + 1)
    }

    const summary = {
      total_working_days,
      present: records.filter(r => r.status === 'PRESENT').length,
      absent: records.filter(r => r.status === 'ABSENT').length,
      late: records.filter(r => r.status === 'LATE').length,
      half_day: records.filter(r => r.status === 'HALF_DAY').length,
      holidays: records.filter(r => r.status === 'HOLIDAY').length,
      percentage: 0
    }

    if (summary.total_working_days > 0) {
      summary.percentage = Number((((summary.present + summary.late + summary.half_day) / summary.total_working_days) * 100).toFixed(1))
    }

    const responseData = {
      records: records.map(r => ({
        date: format(r.date, 'yyyy-MM-dd'),
        status: r.status,
        remarks: r.remarks
      })),
      summary
    }

    try {
      await redis.set(cacheKey, JSON.stringify(responseData), 3600) // TTL 1 hour
    } catch (e) {
      console.warn('Redis write error:', e)
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    if (error.message === 'Forbidden' || error.message === 'Unauthorized to view this student') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Attendance API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
