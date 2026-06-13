import { expect, test } from '@playwright/test'

import { authFiles } from './helpers/auth'

const shouldRun = process.env.RUN_ADMISSIONS_E2E === 'true'

test.describe.serial('Admissions Module', () => {
  test.skip(!shouldRun, 'Set RUN_ADMISSIONS_E2E=true to run seeded admissions E2E coverage')

  test('Create application and move APPLIED -> SHORTLISTED -> TESTING as STUDENT_ADMIN', async ({
    page,
  }) => {
    await page.goto('/admin/admissions')
    await expect(page.getByText('2025-2026')).toBeVisible()

    await page.getByRole('button', { name: 'Add Application' }).click()
    await page.getByLabel('Applicant Name').fill('E2E Applicant One')
    await page.getByLabel('Date of Birth').fill('2014-06-10')
    await page.getByLabel('Parent Name').fill('E2E Parent')
    await page.getByLabel('Parent Phone').fill('9999991111')

    // Select class
    await page.getByText('Select class').click()
    await page.getByRole('option', { name: 'Grade 6 - A' }).click()

    await page.getByRole('button', { name: 'Create Application' }).click()

    await expect(page.getByText('Application created successfully')).toBeVisible()

    await page.getByRole('tab', { name: /APPLIED/i }).click()
    await page.getByRole('button', { name: 'Shortlist' }).first().click()
    await expect(page.getByText('Status changed to SHORTLISTED')).toBeVisible()

    await page.getByRole('tab', { name: /SHORTLISTED/i }).click()
    await page.getByRole('button', { name: 'Schedule Test' }).first().click()
    await expect(page.getByText('Status changed to TESTING')).toBeVisible()
  })

  test.describe('Principal actions', () => {
    test.use({ storageState: authFiles.principal })

    test('PRINCIPAL admits and converts applicant to student', async ({ page }) => {
      await page.goto('/admin/admissions')
      await expect(page.getByText('2025-2026')).toBeVisible()

      await page.getByRole('tab', { name: /TESTING/i }).click()
      await page.getByRole('button', { name: 'Admit' }).first().click()
      await expect(page.getByText('Status changed to ADMITTED')).toBeVisible()

      await page.getByRole('tab', { name: /ADMITTED/i }).click()
      await page.getByRole('button', { name: 'Convert to Student' }).first().click()
      await page.getByRole('button', { name: 'Confirm Convert' }).click()

      await expect(page.getByText('Admission converted to student successfully')).toBeVisible()

      await page.goto('/admin/students')
      await expect(page.getByRole('heading', { name: /Student Management/i })).toBeVisible()
    })
  })
})
