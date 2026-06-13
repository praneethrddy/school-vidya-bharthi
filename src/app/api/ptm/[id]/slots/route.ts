import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) {
    return unauthorizedResponse('No valid session')
  }

  const user = session.user as { role?: string; schoolId?: string | null }
  const schoolId = user.schoolId ?? null

  if (!schoolId) {
    return errorResponse('SCHOOL_REQUIRED', 'School context is missing')
  }

  if (user.role !== 'PARENT' && user.role !== 'TEACHER') {
    return forbiddenResponse('Only parents and teachers can view PTM slots')
  }

  const slots = await prisma.timetableSlot.findMany({
    where: {
      school_id: schoolId,
      term_id: id,
    },
  })

  return successResponse({ slots: [] })
}
