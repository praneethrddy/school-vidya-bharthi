import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

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
    const queryStudentId = url.searchParams.get('student_id')

    const targetStudentId = await getTargetStudentId(userId, schoolId, role, queryStudentId)

    const cacheKey = `attendance:summary:${targetStudentId}`
    try {
      const cached = await redis.get(cacheKey)
      if (cached) return NextResponse.json(JSON.parse(cached))
    } catch (e) {
      console.warn('Redis read error:', e)
    }

    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
      include: { class: true }
    })

    if (!student || !student.academic_year_id) {
      return NextResponse.json({ 
        percentage: 0, present: 0, absent: 0, late: 0, half_day: 0, total_days: 0 
      })
    }

    const academicYear = await prisma.academicYear.findUnique({
      where: { id: student.academic_year_id }
    })

    if (!academicYear) {
      return NextResponse.json({ 
        percentage: 0, present: 0, absent: 0, late: 0, half_day: 0, total_days: 0 
      })
    }

    const records = await prisma.attendance.findMany({
      where: {
        school_id: schoolId,
        student_id: targetStudentId,
        date: {
          gte: academicYear.start_date,
          lte: academicYear.end_date
        }
      },
      select: { status: true }
    })

    const present = records.filter(r => r.status === 'PRESENT').length
    const absent = records.filter(r => r.status === 'ABSENT').length
    const late = records.filter(r => r.status === 'LATE').length
    const half_day = records.filter(r => r.status === 'HALF_DAY').length
    const total_days = records.length // Simplified: total distinct days attended/marked
    
    let percentage = 0
    if (total_days > 0) {
      percentage = Number((((present + late + half_day) / total_days) * 100).toFixed(1))
    }

    const summaryData = {
      percentage,
      present,
      absent,
      late,
      half_day,
      total_days
    }

    try {
      await redis.set(cacheKey, JSON.stringify(summaryData), 3600) // TTL 1 hour
    } catch (e) {
      console.warn('Redis write error:', e)
    }

    return NextResponse.json(summaryData)
  } catch (error: any) {
    if (error.message === 'Forbidden' || error.message === 'Unauthorized to view this student') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Attendance Summary API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
