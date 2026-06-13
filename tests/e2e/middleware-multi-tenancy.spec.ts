import { expect, test } from '@playwright/test'

const shouldRun = process.env.RUN_MIDDLEWARE_MULTI_TENANCY_E2E === 'true'

test.describe('Middleware Multi-Tenancy', () => {
  test.skip(!shouldRun, 'Set RUN_MIDDLEWARE_MULTI_TENANCY_E2E=true to run middleware E2E coverage')

  test('unauthenticated admin route redirects to login with callback', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/login\?callbackUrl=/)
    await expect(page).toHaveURL(/callbackUrl=%2Fadmin%2Fdashboard/)
  })

  test('public routes remain accessible without authentication', async ({ page }) => {
    await page.goto('/about')
    await expect(page).toHaveURL(/\/about/)
  })

  test('public API endpoint is not blocked by middleware auth redirect', async ({ request }) => {
    const response = await request.get('/api/public/info')
    expect(response.status()).toBeLessThan(500)
    expect(response.status()).not.toBe(307)
  })
})
