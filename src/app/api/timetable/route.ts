import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { createAuditLog } from '@/lib/audit'

async function resolveStudent(userId: string, schoolId: string, role: string, queryStudentId: string | null) {
  if (role === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { user_id: userId, school_id: schoolId },
      include: { class: true }
    })
    if (!student) throw new Error('Student record not found')
    return student
  } else if (role === 'PARENT') {
    const parent = await prisma.parent.findFirst({
      where: { user_id: userId, school_id: schoolId }
    })
    if (!parent) throw new Error('Parent record not found')

    if (queryStudentId) {
      const relationship = await prisma.studentParent.findFirst({
        where: { parent_id: parent.id, student_id: queryStudentId, school_id: schoolId },
        include: { student: { include: { class: true } } }
      })
      if (!relationship) throw new Error('Unauthorized to view this student')
      return relationship.student
    } else {
      const firstChild = await prisma.studentParent.findFirst({
        where: { parent_id: parent.id, school_id: schoolId },
        orderBy: { created_at: 'asc' },
        include: { student: { include: { class: true } } }
      })
      if (!firstChild) throw new Error('No linked children found')
      return firstChild.student
    }
  } else if (role === 'TEACHER' || role === 'PRINCIPAL' || role === 'SUPER_ADMIN') {
      return null
  }
  throw new Error('Forbidden')
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
    let classId = url.searchParams.get('class_id')
    let termId = url.searchParams.get('term_id')
    const queryStudentId = url.searchParams.get('student_id')

    if (!classId) {
      try {
        const student = await resolveStudent(userId, schoolId, role, queryStudentId)
        if (student?.class_id) {
          classId = student.class_id
        } else {
           return NextResponse.json({ error: 'Student is not assigned to any class.' }, { status: 400 })
        }
      } catch (e: any) {
         return NextResponse.json({ error: e.message }, { status: 403 })
      }
    }

    if (!classId) {
      return NextResponse.json({ error: 'class_id is required for this role.' }, { status: 400 })
    }

    if (!termId) {
      const today = new Date()
      const currentTerm = await prisma.term.findFirst({
        where: {
          school_id: schoolId,
          start_date: { lte: today },
          end_date: { gte: today }
        }
      })
      
      if (!currentTerm) {
        const nextTerm = await prisma.term.findFirst({
           where: { school_id: schoolId, start_date: { gt: today } },
           orderBy: { start_date: 'asc' }
        })
        if (nextTerm) {
            return NextResponse.json({ 
                error: 'Between Terms', 
                message: `Between terms. Next term starts on ${nextTerm.start_date.toISOString().substring(0, 10)}` 
            }, { status: 404 })
        }
        return NextResponse.json({ error: 'No current or upcoming term found.' }, { status: 404 })
      }
      termId = currentTerm.id
    }

    const cacheKey = `timetable:${classId}:${termId}`
    try {
      const cached = await redis.get(cacheKey)
      if (cached) return NextResponse.json(JSON.parse(cached))
    } catch(e) {
      console.warn("Redis read error", e)
    }

    const [classData, termData, settings, slots] = await Promise.all([
      prisma.class.findUnique({ where: { id: classId, school_id: schoolId } as any }),
      prisma.term.findUnique({ where: { id: termId } }),
      prisma.schoolSetting.findUnique({
        where: { school_id_setting_key: { school_id: schoolId, setting_key: 'working_days' } }
      }),
      prisma.timetableSlot.findMany({
        where: {
          school_id: schoolId,
          class_id: classId,
          term_id: termId
        },
        include: {
          subject: true,
          staff: true
        },
        orderBy: [
           { day_of_week: 'asc' },
           { period_number: 'asc' }
        ]
      })
    ])

    if (!classData || !termData) {
      return NextResponse.json({ error: 'Class or Term not found' }, { status: 404 })
    }

    const workingDaysStr = settings?.setting_value || 'MON,TUE,WED,THU,FRI,SAT'
    const workingDays = workingDaysStr.split(',')

    const schedule: Record<string, any[]> = {}
    workingDays.forEach(day => {
        schedule[day] = []
    })

    slots.forEach(slot => {
        if (!schedule[slot.day_of_week]) {
            schedule[slot.day_of_week] = []
        }
        schedule[slot.day_of_week].push({
            period_number: slot.period_number,
            start_time: slot.start_time.toISOString().substring(11, 16),
            end_time: slot.end_time.toISOString().substring(11, 16),
            subject_name: slot.subject.name,
            subject_code: slot.subject.code || '',
            teacher_name: `${slot.staff.first_name} ${slot.staff.last_name}`
        })
    })

    const response = {
      class_name: `${classData.name} ${classData.section || ''}`.trim(),
      term_name: termData.name,
      working_days: workingDays,
      schedule
    }

    try {
      await redis.set(cacheKey, JSON.stringify(response), 86400) // TTL 24 hours
    } catch(e) {
      console.warn("Redis write error", e)
    }

    return NextResponse.json(response)
  } catch (error: any) {
    if (error.message === 'Forbidden' || error.message === 'Unauthorized to view this student') {
        return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Timetable API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { schoolId } = session.user
    if (!schoolId) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const {
      class_id,
      term_id,
      day_of_week,
      period_number,
      subject_id,
      staff_id,
      start_time,
      end_time,
    } = body

    if (!class_id || !term_id || !day_of_week || !period_number || !subject_id || !staff_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for duplicate slot
    const existing = await prisma.timetableSlot.findMany({
      where: {
        school_id: schoolId,
        class_id,
        term_id,
        day_of_week,
        period_number,
      },
    })

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Duplicate slot conflict' }, { status: 409 })
    }

    const classData = await prisma.class.findUnique({
      where: { id: class_id, school_id: schoolId } as any,
    })

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const parseTime = (timeStr: string) => {
      return new Date(`1970-01-01T${timeStr}:00.000Z`)
    }

    const newSlot = await prisma.timetableSlot.create({
      data: {
        school_id: schoolId,
        class_id,
        term_id,
        subject_id,
        staff_id,
        day_of_week,
        period_number,
        start_time: parseTime(start_time),
        end_time: parseTime(end_time),
        academic_year_id: classData.academic_year_id,
      },
    })

    // Invalidate Redis cache
    const cacheKey = `timetable:${class_id}:${term_id}`
    try {
      await redis.del(cacheKey)
    } catch (e) {
      console.warn("Redis delete error", e)
    }

    await createAuditLog({
      school_id: schoolId,
      user_id: session.user.id,
      action: 'CREATE',
      entity_type: 'timetable_slot',
      entity_id: newSlot.id,
      new_value: { class_id, term_id, day_of_week, period_number }
    })

    return NextResponse.json({ success: true, slot: newSlot })
  } catch (error: any) {
    console.error('Timetable POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
