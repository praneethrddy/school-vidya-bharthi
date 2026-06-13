import { expect, test } from '@playwright/test'

import { authFiles, emptyStorageState } from './helpers/auth'

const shouldRun = process.env.RUN_TIMETABLE_E2E === 'true'

test.describe('Timetable Management', () => {
  test.skip(!shouldRun, 'Set RUN_TIMETABLE_E2E=true to run seeded timetable management coverage')

  test('[TEST-TT-001] principal can open timetable management page', async ({ page }) => {
    await page.goto('/admin/timetable')

    await expect(page.getByRole('heading', { name: /Timetable/i }).first()).toBeVisible()
  })

  test('[TEST-TT-002] principal sees slot creation and publish controls', async ({ page }) => {
    await page.goto('/admin/timetable')

    await expect(page.getByRole('button', { name: /Add Slot/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Publish Timetable/i })).toBeVisible()
  })

  test.describe('Teacher access', () => {
    test.use({ storageState: authFiles.teacher })

    test('[TEST-TT-004] teacher can view timetable page but cannot see builder actions', async ({
      page,
    }) => {
      await page.goto('/admin/timetable')

      await expect(page.getByRole('heading', { name: /Timetable/i }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: /Add Slot/i })).toHaveCount(0)
    })
  })

  test.describe('Unauthenticated access', () => {
    test.use({ storageState: emptyStorageState })

    test('[TEST-TT-001] unauthenticated users are redirected to login', async ({ page }) => {
      await page.goto('/admin/timetable')
      await expect(page).toHaveURL(/\/login/)
    })
  })
})
