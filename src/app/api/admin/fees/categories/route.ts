import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'

const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(1000).optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const allowed = await hasPermission(user.schoolId, user.role, 'FEES.view_structure')
  if (!allowed) return forbiddenResponse('Missing FEES.view_structure permission')

  const categories = await prisma.feeCategory.findMany({
    where: { school_id: user.schoolId },
    orderBy: { name: 'asc' },
  })

  return successResponse(
    categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: category.created_at,
      updated_at: category.updated_at,
    }))
  )
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { id: string; role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const allowed = await hasPermission(user.schoolId, user.role, 'FEES.configure_structure')
  if (!allowed) return forbiddenResponse('Missing FEES.configure_structure permission')

  if (user.role !== 'PRINCIPAL' && user.role !== 'SUPER_ADMIN') {
    return forbiddenResponse('Only PRINCIPAL can create fee categories')
  }

  const payload = await request.json().catch(() => null)
  const parsed = createCategorySchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid payload')
  }

  const name = parsed.data.name.trim()

  const existing = await prisma.feeCategory.findFirst({
    where: {
      school_id: user.schoolId,
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  })

  if (existing) {
    return errorResponse('DUPLICATE_FEE_CATEGORY', 'Fee category already exists for this school', 409)
  }

  const created = await prisma.feeCategory.create({
    data: {
      school_id: user.schoolId,
      name,
      description: parsed.data.description?.trim() || null,
    },
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'CREATE',
    entity_type: 'fee_category',
    entity_id: created.id,
    new_value: created as unknown as Record<string, unknown>,
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined,
    user_agent: request.headers.get('user-agent') || undefined,
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: created.id,
        name: created.name,
        description: created.description,
      },
    },
    { status: 201 }
  )
}
