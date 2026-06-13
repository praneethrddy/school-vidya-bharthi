import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { createAuditLog } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Requires at least one uppercase letter')
    .regex(/[0-9]/, 'Requires at least one number')
    .regex(/[^A-Za-z0-9]/, 'Requires at least one special character')
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password } = schema.parse(body)

    const tokenKey = `reset_token:${token}`
    const userId = await redis.get(tokenKey)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Invalid user account' },
        { status: 400 }
      )
    }

    const password_hash = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { password_hash }
    })

    // Invalidate the token
    await redis.del(tokenKey)

    // Invalidate existing sessions in our custom implementation by updating a session 
    // valid-from timestamp for the user in Redis:
    await redis.set(`user_pw_reset:${userId}`, Date.now().toString())

    await createAuditLog({
      school_id: user.school_id,
      user_id: user.id,
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: user.id,
      new_value: { action: 'completed_password_reset' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }
    logger.error({ error }, 'Failed to map password reset')
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
