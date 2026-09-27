import NextAuth, { DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { logger } from './logger'
import { redis } from './redis'
import { createAuditLog } from './audit'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      schoolId: string | null
    } & DefaultSession['user']
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  useSecureCookies: false,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials')
        }
        
        const email = credentials.email.toString()
        const password = credentials.password.toString()
        
        // 1. Check lockout in Redis
        const lockoutKey = `lockout:${email}`
        const lockedData = await redis.get(lockoutKey)
        if (lockedData) {
          const parsed = JSON.parse(lockedData)
          if (parsed.locked_until && Date.now() < parsed.locked_until) {
            const minutesLeft = Math.ceil((parsed.locked_until - Date.now()) / 60000)
            throw new Error(`Account locked. Try again in ${minutesLeft} minutes`)
          }
        }

        // 2. Lookup user
        const user = await prisma.user.findFirst({
          where: { email }
        })

        if (!user) {
          return null
        }

        if (!user.is_active) {
          throw new Error('Your account has been deactivated. Contact your administrator')
        }

        // Lockout check from DB
        if (user.locked_until && user.locked_until.getTime() > Date.now()) {
          const minutesLeft = Math.ceil((user.locked_until.getTime() - Date.now()) / 60000)
          throw new Error(`Account locked. Try again in ${minutesLeft} minutes`)
        }

        // 3. Password check
        const isValid = await bcrypt.compare(password, user.password_hash)

        if (!isValid) {
          // Increment failed login count
          const newCount = user.failed_login_count + 1
          
          if (newCount >= 5) {
            const lockedUntil = Date.now() + 15 * 60 * 1000 // 15 mins
            await redis.set(lockoutKey, JSON.stringify({ count: newCount, locked_until: lockedUntil }), 15 * 60)
            await prisma.user.update({
              where: { id: user.id },
              data: { failed_login_count: newCount, locked_until: new Date(lockedUntil) }
            })
            throw new Error('Account locked due to too many failed attempts. Try again in 15 minutes')
          } else {
            await redis.set(lockoutKey, JSON.stringify({ count: newCount }), 15 * 60)
            await prisma.user.update({
              where: { id: user.id },
              data: { failed_login_count: newCount }
            })
            return null
          }
        }

        // Success: Reset counts
        await redis.del(lockoutKey)
        await prisma.user.update({
          where: { id: user.id },
          data: { failed_login_count: 0, locked_until: null, last_login: new Date() }
        })

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          schoolId: user.school_id,
          name: email.split('@')[0] // Fallback name
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 15 * 60,
  },
  callbacks: {
    signIn: async ({ user, account }) => {
      // Log login attempt
      if (user && user.id && account?.provider === 'credentials') {
        const u = user as any
        await createAuditLog({
          school_id: u.schoolId || null,
          user_id: user.id,
          action: 'LOGIN',
          entity_type: 'user',
          entity_id: user.id
        })
      }
      return true
    },
    jwt: async ({ token, user, account }) => {
      // Check timestamp blacklist
      if (token.id) {
        const pwResetKey = `user_pw_reset:${token.id}`
        const resetAt = await redis.get(pwResetKey)
        if (resetAt) {
          // If token was issued before the reset, reject it
          // token.iat is in seconds, resetAt is in ms
          if (token.iat && token.iat * 1000 < parseInt(resetAt, 10)) {
            return {} // Return empty token to reject
          }
        }
      }

      if (token.jti) {
        const isBlacklisted = await redis.exists(`blacklist:${token.jti}`)
        if (isBlacklisted) {
          return {} // Return empty token to reject
        }
      }

      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.schoolId = (user as any).schoolId
      }
      return token
    },
    session: async ({ session, token }) => {
      if (Object.keys(token).length === 0) {
        // Token was blacklisted
        return { ...session, expires: '1970-01-01T00:00:00.000Z' }
      }
      if (session.user) {
        ;(session.user as any).id = token.id as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).schoolId = token.schoolId as string | null
      }
      return session
    },
  },
})
