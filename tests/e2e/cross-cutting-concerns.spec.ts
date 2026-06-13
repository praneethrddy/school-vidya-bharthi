import { expect, test } from '@playwright/test'

import { authFiles } from './helpers/auth'

const shouldRun = process.env.RUN_CROSS_CUTTING_E2E === 'true'

test.describe('Cross-Cutting Concerns', () => {
  test.use({ storageState: authFiles.student })
  test.skip(!shouldRun, 'Set RUN_CROSS_CUTTING_E2E=true to run cross-cutting Playwright checks')

  test('TEST-ERR-003 unknown routes render the global 404 page', async ({ page }) => {
    await page.goto('/cross-cutting-non-existent-route')

    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText('Page not found')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to Dashboard' })).toBeVisible()
  })
})
