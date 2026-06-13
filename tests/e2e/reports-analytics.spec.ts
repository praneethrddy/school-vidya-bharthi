import { expect, test } from '@playwright/test'

import { authFiles } from './helpers/auth'

const shouldRun = process.env.RUN_REPORTS_E2E === 'true'

test.describe('Reports & Analytics', () => {
  test.skip(!shouldRun, 'Set RUN_REPORTS_E2E=true to run seeded reports E2E coverage')

  test('principal can access reports workspace and see report cards', async ({ page }) => {
    await page.goto('/admin/reports')

    await expect(page.getByRole('heading', { name: 'Analytics & Reports' })).toBeVisible()
    await expect(page.getByText('Attendance Report', { exact: false })).toBeVisible()
    await expect(page.getByText('Academic Performance', { exact: false })).toBeVisible()
    await expect(page.getByText('Financial Report', { exact: false })).toBeVisible()
  })

  test('principal can generate a report and unlock export actions', async ({ page }) => {
    await page.goto('/admin/reports')

    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Grade 6 A' }).click()
    await page.getByRole('button', { name: /Generate Report/i }).click()

    await expect(page.getByText('Average Attendance', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: /Download PDF/i })).toBeEnabled()
    await expect(page.getByRole('button', { name: /Download Excel/i })).toBeEnabled()
  })

  test.describe('Teacher access', () => {
    test.use({ storageState: authFiles.teacher })

    test('teacher cannot access financial report card', async ({ page }) => {
      await page.goto('/admin/reports')

      await expect(page.getByText('Financial Report', { exact: false })).toHaveCount(0)
    })
  })
})
