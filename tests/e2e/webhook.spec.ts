import { expect, test } from '@playwright/test'

test.describe('Webhook Endpoint Middleware E2E', () => {
  test('unauthenticated POST request to /api/webhook/ bypasses auth middleware and returns 404 instead of redirecting to login', async ({
    request,
  }) => {
    const response = await request.post('/api/webhook/stripe', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' }),
    })

    // It bypasses the auth redirect (302/307 to /login) and directly reaches the router.
    // Since the route handler does not exist, it should return 404.
    expect(response.status()).toBe(404)
  })

  test('unauthenticated GET request to /api/webhook/ also bypasses auth middleware', async ({
    request,
  }) => {
    const response = await request.get('/api/webhook/stripe')
    expect(response.status()).toBe(404)
  })
})
