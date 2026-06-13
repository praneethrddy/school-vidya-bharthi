import { expect, test } from '@playwright/test'

const shouldRun = process.env.RUN_STUDENT_MANAGEMENT_E2E === 'true'

test.describe('Student Management', () => {
  test.skip(
    !shouldRun,
    'Set RUN_STUDENT_MANAGEMENT_E2E=true to run seeded student-management E2E coverage'
  )

  test('Student admin can open student management list with encrypted-field search note', async ({
    page,
  }) => {
    await page.goto('/admin/students')

    await expect(page.getByRole('heading', { name: /Student Management/i })).toBeVisible()
    await expect(
      page.getByText(
        'Search supports name and admission number only. Phone/address fields are encrypted.'
      )
    ).toBeVisible()
  })

  test('Student admin sees client validation when trying to create empty student form', async ({
    page,
  }) => {
    await page.goto('/admin/students')

    await page.getByRole('button', { name: 'Add Student' }).click()
    await page.getByRole('button', { name: 'Create Student' }).click()

    await expect(
      page.getByText('Admission number, name, and date of birth are required')
    ).toBeVisible()
  })
})
