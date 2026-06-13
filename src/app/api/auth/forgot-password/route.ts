import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { sendPasswordResetEmail } from '@/lib/email'
import { createAuditLog } from '@/lib/audit'
import crypto from 'crypto'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const schema = z.object({
  email: z.string().email()
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = schema.parse(body)

    // Rate limit check: max 3 reset requests per email per hour
    const rateLimitKey = `rl:forgot-pw:${email}`
    const rateData = await redis.get(rateLimitKey)
    let count = 0
    if (rateData) count = parseInt(rateData, 10)
    
    if (count >= 3) {
      logger.warn(`Rate limit exceeded for forgot password: ${email}`)
      // Return 200 to intentionally avoid leaking whether email exists or not
      return NextResponse.json({ success: true })
    }

    await redis.set(rateLimitKey, String(count + 1), 60 * 60) // 1 hour TTL

    const user = await prisma.user.findFirst({
      where: { email }
    })

    if (user && user.is_active) {
      const token = crypto.randomBytes(32).toString('hex')
      
      // Store token in Redis
      await redis.set(`reset_token:${token}`, user.id, 60 * 60) // 1 hour TTL
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const resetUrl = `${appUrl}/reset-password?token=${token}`

      await sendPasswordResetEmail(email, resetUrl)

      await createAuditLog({
        school_id: user.school_id,
        user_id: user.id,
        action: 'UPDATE',
        entity_type: 'user',
        entity_id: user.id,
        new_value: { action: 'requested_password_reset' }
      })
    }

    // Always 200
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Failed to process forgot password request')
    return NextResponse.json({ success: true }) // Never reveal errors
  }
}
