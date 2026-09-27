import { expect, test } from '@playwright/test'

import { emptyStorageState } from './helpers/auth'

const shouldRun = process.env.RUN_GRADES_E2E === 'true'

test.describe('Grades & Exams Management', () => {
  test.skip(!shouldRun, 'Set RUN_GRADES_E2E=true to run seeded grades/exams E2E coverage')

  test('principal can access grades workspace and navigate core tabs', async ({ page }) => {
    await page.goto('/admin/grades')

    await expect(page.getByRole('heading', { name: 'Grades & Exams' })).toBeVisible()
    await page.getByRole('tab', { name: 'Exams Setup' }).click()
    await expect(page.getByRole('button', { name: 'Create Exam' })).toBeVisible()

    await page.getByRole('tab', { name: 'Grade Entry' }).click()
    await expect(page.getByText('Please select an exam and subject to enter grades.')).toBeVisible()

    await page.getByRole('tab', { name: 'Report Cards' }).click()
    await expect(
      page.getByText('Please select a class and term targeting the report card generation.')
    ).toBeVisible()
  })

  test.describe('Unauthenticated access', () => {
    test.use({ storageState: emptyStorageState })

    test('unauthenticated user is redirected to login for /admin/grades', async ({ page }) => {
      await page.goto('/admin/grades')
      await expect(page).toHaveURL(/\/login\?callbackUrl=/)
    })
  })
})
