import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { redis } from '@/lib/redis'
import * as z from 'zod'

const passwordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirm_password: z.string()
}).refine(data => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"]
}).refine(data => data.new_password !== data.current_password, {
  message: "New password cannot be the same as current password",
  path: ["new_password"]
})

export async function POST(req: Request, { params }: { params: Promise<any> }) {
  await params // For Next.js 15 async semantics

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, schoolId } = session.user
  const body = await req.json()

  try {
    const parsed = passwordSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isValid = await bcrypt.compare(parsed.current_password, user.password_hash)
    if (!isValid) return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 })

    const hash = await bcrypt.hash(parsed.new_password, 12)

    await prisma.user.update({
      where: { id },
      data: { password_hash: hash }
    })

    // Invalidate existing sessions: we set a timestamp in redis
    // In lib/auth.ts we have a check: `user_pw_reset:${token.id}`
    await redis.set(`user_pw_reset:${id}`, Date.now().toString())

    await createAuditLog({
      school_id: schoolId || null,
      user_id: id,
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: id,
      old_value: { field: 'password' },
      new_value: { field: 'password' }
    })

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
