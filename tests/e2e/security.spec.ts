import { expect, test } from '@playwright/test'

test.describe('security regression coverage', () => {
  test('TEST-SEC-024/025/027 public API applies baseline security headers', async ({ request }) => {
    const response = await request.get('/api/public/info')
    const payload = await response.json()
    const headers = response.headers()

    expect(response.status()).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.any(Object),
      })
    )

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toMatch(/deny|sameorigin/i)
    expect(headers['access-control-allow-origin']).not.toBe('*')
  })

  test('TEST-SEC-029/030 cross-origin write attempt is rejected for protected API', async ({
    request,
  }) => {
    const response = await request.post('/api/students', {
      headers: {
        Origin: 'https://evil.com',
        'Content-Type': 'application/json',
      },
      data: {
        admission_number: 'ADM-SEC-001',
        first_name: 'Malicious',
        last_name: 'Actor',
        date_of_birth: '2011-01-01',
        class_id: '11111111-1111-1111-1111-111111111111',
      },
    })

    const payload = await response.json()
    expect([401, 403]).toContain(response.status())
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String),
        }),
      })
    )
  })

  test('TEST-SEC-032 protected JSON API does not accept text/plain writes', async ({ request }) => {
    const response = await request.post('/api/students', {
      headers: {
        'Content-Type': 'text/plain',
      },
      data: JSON.stringify({ foo: 'bar' }),
    })

    const payload = await response.json()
    expect(response.status()).toBeGreaterThanOrEqual(400)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String),
        }),
      })
    )
  })
})
