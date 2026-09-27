import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    })

    if (token?.jti) {
      const expiresInSeconds =
        typeof token.exp === 'number'
          ? Math.max(token.exp - Math.floor(Date.now() / 1000), 1)
          : 15 * 60

      await redis.set(`blacklist:${token.jti}`, '1', expiresInSeconds)
    }
    
    if (session?.user) {
      const u = session.user as any
      await createAuditLog({
        school_id: u.schoolId || null,
        user_id: u.id,
        action: 'LOGOUT',
        entity_type: 'user',
        entity_id: u.id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Logout API error')
    return NextResponse.json({ success: true }) // never leak errors to client here
  }
}
