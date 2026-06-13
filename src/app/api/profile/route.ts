import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import * as z from 'zod'

const studentSchema = z.object({
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
})

const parentSchema = z.object({
  phone: z.string().optional(),
  alternate_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
})

const staffSchema = z.object({
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

export async function GET(req: Request, { params }: { params: Promise<any> }) {
  await params // For Next.js 15 async semantics if needed

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, role, schoolId } = session.user
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    if (role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { user_id: id, school_id: schoolId! },
        include: { class: true }
      })
      if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
      
      return NextResponse.json({
        user: { email: user.email },
        profile: {
          first_name: student.first_name,
          last_name: student.last_name,
          gender: student.gender,
          date_of_birth: student.date_of_birth,
          blood_group: student.blood_group,
          phone: student.phone,
          address: student.address,
          emergency_contact_name: student.emergency_contact_name,
          emergency_contact_phone: student.emergency_contact_phone,
          photo_url: student.photo_url,
          admission_number: student.admission_number,
          class_name: student.class ? `${student.class.name} ${student.class.section || ''}`.trim() : null,
          roll_number: student.roll_number
        }
      })
    } else if (role === 'PARENT') {
      const parent = await prisma.parent.findFirst({
        where: { user_id: id, school_id: schoolId! },
        include: { students: { include: { student: { include: { class: true } } } } }
      })
      if (!parent) return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 })

      return NextResponse.json({
        user: { email: user.email },
        profile: {
          first_name: parent.first_name,
          last_name: parent.last_name,
          relation: parent.relation,
          phone: parent.phone,
          alternate_phone: parent.alternate_phone,
          email: parent.email,
          occupation: parent.occupation,
          address: parent.address,
          photo_url: parent.photo_url
        },
        children: parent.students.map(sp => ({
          name: `${sp.student.first_name} ${sp.student.last_name}`,
          class_name: sp.student.class ? `${sp.student.class.name} ${sp.student.class.section || ''}`.trim() : null
        }))
      })
    } else {
      // Staff roles
      const staff = await prisma.staff.findFirst({
        where: { user_id: id, school_id: schoolId! }
      })
      if (!staff) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

      return NextResponse.json({
        user: { email: user.email },
        profile: {
          first_name: staff.first_name,
          last_name: staff.last_name,
          gender: staff.gender,
          date_of_birth: staff.date_of_birth,
          phone: staff.phone,
          address: staff.address,
          photo_url: staff.photo_url,
          employee_code: staff.employee_code,
          designation: staff.designation,
          department: staff.department,
          date_of_joining: staff.date_of_joining,
          qualification: staff.qualification
        }
      })
    }
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<any> }) {
  await params // For Next.js 15 async semantics

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, role, schoolId } = session.user
  const body = await req.json()

  try {
    if (role === 'STUDENT') {
      const parsed = studentSchema.parse(body)
      const student = await prisma.student.findFirst({ where: { user_id: id, school_id: schoolId! } })
      if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const updated = await prisma.student.update({
        where: { id: student.id },
        data: parsed
      })

      await createAuditLog({
        school_id: schoolId,
        user_id: id,
        action: 'UPDATE',
        entity_type: 'student',
        entity_id: student.id,
        old_value: { phone: student.phone, address: student.address, emergency_contact_name: student.emergency_contact_name, emergency_contact_phone: student.emergency_contact_phone },
        new_value: parsed
      })

      return NextResponse.json({ success: true, profile: updated })
    } else if (role === 'PARENT') {
      const parsed = parentSchema.parse(body)
      const parent = await prisma.parent.findFirst({ where: { user_id: id, school_id: schoolId! } })
      if (!parent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const updated = await prisma.parent.update({
        where: { id: parent.id },
        data: parsed
      })

      await createAuditLog({
        school_id: schoolId,
        user_id: id,
        action: 'UPDATE',
        entity_type: 'parent',
        entity_id: parent.id,
        old_value: { phone: parent.phone, alternate_phone: parent.alternate_phone, address: parent.address, occupation: parent.occupation },
        new_value: parsed
      })

      return NextResponse.json({ success: true, profile: updated })
    } else {
      const parsed = staffSchema.parse(body)
      const staff = await prisma.staff.findFirst({ where: { user_id: id, school_id: schoolId! } })
      if (!staff) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const updated = await prisma.staff.update({
        where: { id: staff.id },
        data: parsed
      })

      await createAuditLog({
        school_id: schoolId,
        user_id: id,
        action: 'UPDATE',
        entity_type: 'staff',
        entity_id: staff.id,
        old_value: { phone: staff.phone, address: staff.address },
        new_value: parsed
      })

      return NextResponse.json({ success: true, profile: updated })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
