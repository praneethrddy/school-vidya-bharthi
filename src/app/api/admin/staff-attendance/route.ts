import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  // Only STAFF_ADMIN or PRINCIPAL
  if (u.role !== 'STAFF_ADMIN' && u.role !== 'PRINCIPAL') {
    return forbiddenResponse('Only Staff Admin or Principal can access staff attendance')
  }

  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')
  const department = searchParams.get('department')

  if (!dateStr) {
    return errorResponse('INVALID_PARAMS', 'date is required')
  }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return errorResponse('INVALID_DATE', 'Invalid date format')
  }

  const staffQuery: any = { school_id: schoolId, is_active: true }
  if (department) {
    staffQuery.department = department
  }

  const staffList = await prisma.staff.findMany({
    where: staffQuery,
    select: {
      id: true,
      employee_code: true,
      first_name: true,
      last_name: true,
      department: true,
      designation: true,
      photo_url: true,
    },
    orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
  })

  // Get existing attendance form staff_attendance table
  const records = await prisma.staffAttendance.findMany({
    where: { school_id: schoolId, date: date }
  })

  const recordMap = new Map(records.map(r => [r.staff_id, r]))

  const markedStaff = staffList.map(s => {
    const r = recordMap.get(s.id)
    return {
      staff_id: s.id,
      employee_code: s.employee_code,
      name: `${s.first_name} ${s.last_name}`,
      department: s.department,
      designation: s.designation,
      photo_url: s.photo_url,
      status: r?.status || null,
      check_in: r?.check_in ? r.check_in.toISOString() : null,
      check_out: r?.check_out ? r.check_out.toISOString() : null,
      remarks: r?.remarks || null,
      id: r?.id || null 
    }
  })

  return successResponse({
    date: dateStr,
    records: markedStaff
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  // Only STAFF_ADMIN or PRINCIPAL
  if (u.role !== 'STAFF_ADMIN' && u.role !== 'PRINCIPAL') {
    return forbiddenResponse('Only Staff Admin or Principal can access staff attendance')
  }

  const body = await request.json()
  const { date, records } = body

  if (!date || !Array.isArray(records)) {
    return errorResponse('INVALID_PARAMS', 'Missing date or records array')
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

  const markerStaff = await prisma.staff.findFirst({ where: { user_id: u.id, school_id: schoolId } })
  const markedBy = markerStaff?.id || null

  const results = await prisma.$transaction(async (tx) => {
    const changes: any[] = []
    
    for (const rec of records) {
      if (!rec.staff_id || !rec.status) continue;
      
      const existing = await tx.staffAttendance.findUnique({
        where: {
          school_id_staff_id_date: {
            school_id: schoolId,
            staff_id: rec.staff_id,
            date: attendanceDate
          }
        }
      })

      const newData = {
        school_id: schoolId,
        staff_id: rec.staff_id,
        date: attendanceDate,
        status: rec.status,
        check_in: rec.check_in ? new Date(rec.check_in) : null,
        check_out: rec.check_out ? new Date(rec.check_out) : null,
        remarks: rec.remarks || null
      }

      if (existing) {
         if (existing.status !== rec.status || existing.remarks !== rec.remarks || 
             existing.check_in?.getTime() !== newData.check_in?.getTime() ||
             existing.check_out?.getTime() !== newData.check_out?.getTime()) {
           await tx.staffAttendance.update({
             where: { id: existing.id },
             data: { 
                 status: rec.status, 
                 remarks: rec.remarks, 
                 check_in: newData.check_in,
                 check_out: newData.check_out
             }
           })
           changes.push({ id: existing.id, old: existing, new: newData })
         }
      } else {
         const cr = await tx.staffAttendance.create({ data: newData })
         changes.push({ id: cr.id, old: null, new: newData })
      }
    }
    return changes
  })

  for (const change of results) {
     await createAuditLog({
        school_id: schoolId,
        user_id: u.id,
        action: change.old ? 'UPDATE' : 'CREATE',
        entity_type: 'STAFF_ATTENDANCE',
        entity_id: change.id,
        old_value: change.old || undefined,
        new_value: change.new || undefined
     })
  }

  return successResponse({ message: 'Staff attendance marked successfully', updated_count: results.length })
}
