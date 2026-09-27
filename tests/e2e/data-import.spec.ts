import { expect, test } from '@playwright/test'

const shouldRun = process.env.RUN_IMPORT_E2E === 'true'

test.describe('Data Import Module', () => {
  test.skip(!shouldRun, 'Set RUN_IMPORT_E2E=true to run import E2E coverage')

  test('admin can open import page and see upload actions', async ({ page }) => {
    await page.goto('/admin/import')

    await expect(page.getByRole('heading', { name: /Import/i }).first()).toBeVisible()
    await expect(page.getByText(/Template/i).first()).toBeVisible()
    await expect(page.getByText(/Upload/i).first()).toBeVisible()
  })

  test('template endpoint responds with CSV content type after auth', async ({ page }) => {
    const response = await page.request.get('/api/import/template?type=students')

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/csv')
  })
})
