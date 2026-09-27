import { expect, test } from '@playwright/test'

import { authFiles } from './helpers/auth'

const shouldRun = process.env.RUN_ADMIN_DASHBOARD_E2E === 'true'

test.describe('Admin Dashboard', () => {
  test.skip(!shouldRun, 'Set RUN_ADMIN_DASHBOARD_E2E=true to run seeded admin dashboard coverage')

  test('principal sees financial dashboard sections', async ({ page }) => {
    await page.goto('/admin/dashboard')

    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible()
    await expect(page.getByText('Fee Collection', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Recent Activity', { exact: false }).first()).toBeVisible()
  })

  test.describe('Teacher access', () => {
    test.use({ storageState: authFiles.teacher })

    test('teacher sees teaching overview without fee collection', async ({ page }) => {
      await page.goto('/admin/dashboard')

      await expect(page.getByText('Own Classes Attendance', { exact: false })).toBeVisible()
      await expect(page.getByText('Teaching Overview', { exact: false })).toBeVisible()
      await expect(page.getByText('Fee Collection', { exact: false })).toHaveCount(0)
    })
  })
})
