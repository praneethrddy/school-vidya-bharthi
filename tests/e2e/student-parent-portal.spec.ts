import { expect, test } from '@playwright/test'

import { authFiles } from './helpers/auth'

const shouldRun = process.env.RUN_STUDENT_PARENT_PORTAL_E2E === 'true'

test.describe('Student & Parent Portal', () => {
  test.skip(
    !shouldRun,
    'Set RUN_STUDENT_PARENT_PORTAL_E2E=true to run student-parent portal E2E coverage'
  )

  test('student dashboard loads core portal metrics', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Attendance', exact: false })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Fee Dues', exact: false })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Last Exam', exact: false })).toBeVisible()
  })

  test.describe('Parent access', () => {
    test.use({ storageState: authFiles.parent })

    test('parent portal exposes PTM and child selector slot', async ({ page }) => {
      await page.goto('/dashboard')

      await expect(page.getByRole('link', { name: /PTM/i })).toBeVisible()
      await expect(page.locator('#parent-child-selector-slot')).toBeAttached()
    })
  })

  test('portal pages are reachable after login', async ({ page }) => {
    for (const path of [
      '/attendance',
      '/grades',
      '/fees',
      '/timetable',
      '/notifications',
      '/profile',
    ]) {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(path))
    }
  })
})
