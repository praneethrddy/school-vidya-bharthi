import { describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const routeMocks = vi.hoisted(() => ({
  handlersGet: vi.fn(),
  handlersPost: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  handlers: {
    GET: routeMocks.handlersGet,
    POST: routeMocks.handlersPost,
  },
}))

import { GET, POST } from '../route'

describe('/api/auth/[...nextauth] route handlers', () => {
  it('TEST-AUTH-NEXTAUTH-001: delegates GET to NextAuth handler after awaiting async params', async () => {
    routeMocks.handlersGet.mockResolvedValue(
      NextResponse.json({ success: true, method: 'GET' }, { status: 200 })
    )

    let resolveParams: ((value: { nextauth: string[] }) => void) | null = null
    const params = new Promise<{ nextauth: string[] }>((resolve) => {
      resolveParams = resolve
    })

    const request = new NextRequest('http://localhost/api/auth/session')
    const pending = GET(request, { params })

    await Promise.resolve()
    expect(routeMocks.handlersGet).not.toHaveBeenCalled()

    resolveParams?.({ nextauth: ['session'] })
    const response = await pending
    const payload = await response.json()

    expect(routeMocks.handlersGet).toHaveBeenCalledWith(request)
    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        method: 'GET',
      })
    )
  })

  it('TEST-AUTH-NEXTAUTH-002: delegates POST to NextAuth handler after awaiting async params', async () => {
    routeMocks.handlersPost.mockResolvedValue(
      NextResponse.json({ success: true, method: 'POST' }, { status: 200 })
    )

    let resolveParams: ((value: { nextauth: string[] }) => void) | null = null
    const params = new Promise<{ nextauth: string[] }>((resolve) => {
      resolveParams = resolve
    })

    const request = new NextRequest('http://localhost/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({ email: 'teacher@vbhs.com', password: 'Test@1234' }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const pending = POST(request, { params })

    await Promise.resolve()
    expect(routeMocks.handlersPost).not.toHaveBeenCalled()

    resolveParams?.({ nextauth: ['callback', 'credentials'] })
    const response = await pending
    const payload = await response.json()

    expect(routeMocks.handlersPost).toHaveBeenCalledWith(request)
    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        method: 'POST',
      })
    )
  })
})
