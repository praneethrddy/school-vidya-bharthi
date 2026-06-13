import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-helpers'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const canEdit = await hasPermission(schoolId, u.role, 'ATTENDANCE.edit')
  if (!canEdit) return forbiddenResponse('Missing ATTENDANCE.edit permission')

  const existing = await prisma.attendance.findUnique({
    where: { id: id, school_id: schoolId }
  })

  if (!existing) return errorResponse('NOT_FOUND', 'Attendance record not found', 404)

  const body = await request.json()
  const { status, remarks } = body

  if (!status && remarks === undefined) {
    return errorResponse('INVALID_PARAMS', 'Status or remarks required to update')
  }

  const staff = await prisma.staff.findFirst({ where: { user_id: u.id, school_id: schoolId } })
  const markedBy = staff?.id || null

  const updated = await prisma.attendance.update({
    where: { id: id },
    data: {
      ...(status && { status }),
      ...(remarks !== undefined && { remarks }),
      marked_by: markedBy,
      updated_at: new Date()
    }
  })

  await createAuditLog({
    school_id: schoolId,
    user_id: u.id,
    action: 'UPDATE',
    entity_type: 'ATTENDANCE',
    entity_id: id,
    old_value: existing,
    new_value: updated
  })

  return successResponse({ message: 'Attendance record updated successfully', data: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const u = session.user as any
  const schoolId = u.schoolId
  if (!schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  // Only PRINCIPAL can delete
  const canDelete = await hasPermission(schoolId, u.role, 'ATTENDANCE.delete')
  if (!canDelete) return forbiddenResponse('Missing ATTENDANCE.delete permission')

  const existing = await prisma.attendance.findUnique({
    where: { id: id, school_id: schoolId }
  })

  if (!existing) return errorResponse('NOT_FOUND', 'Attendance record not found', 404)

  await prisma.attendance.delete({
    where: { id: id }
  })

  await createAuditLog({
    school_id: schoolId,
    user_id: u.id,
    action: 'DELETE',
    entity_type: 'ATTENDANCE',
    entity_id: id,
    old_value: existing
  })

  return successResponse({ message: 'Attendance record deleted successfully' })
}
