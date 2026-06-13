import { expect, test, type Page, type Route } from '@playwright/test'

const shouldRun = process.env.RUN_ADMIN_ATTENDANCE_E2E === 'true'

async function mockAttendanceApis(page: Page) {
  await page.route('**/api/admin/attendance/summary?**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          date: '2026-05-27',
          classes: [
            {
              class_id: 'class-1',
              class_name: 'Grade 6 A',
              total_students: 2,
              present: 1,
              absent: 1,
              late: 0,
              half_day: 0,
              is_marked: true,
              marked_by: 'Anita Rao',
              marked_at: '2026-05-27T08:05:00.000Z',
            },
          ],
          school_total: {
            total_students: 2,
            present: 1,
            absent: 1,
            percentage: 50,
            classes_marked: 1,
            classes_not_marked: 0,
          },
        },
      }),
    })
  })

  await page.route('**/api/admin/attendance?**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          class: {
            id: 'class-1',
            name: 'Grade 6',
            section: 'A',
            total_students: 2,
          },
          date: '2026-05-27',
          is_marked: false,
          records: [
            {
              student_id: 'student-1',
              student_name: 'Rahul Sharma',
              roll_number: '01',
              photo_url: null,
              status: null,
              remarks: null,
              id: null,
            },
            {
              student_id: 'student-2',
              student_name: 'Meera Iyer',
              roll_number: '02',
              photo_url: null,
              status: null,
              remarks: null,
              id: null,
            },
          ],
          summary: {
            present: 0,
            absent: 0,
            late: 0,
            half_day: 0,
            not_marked: 2,
          },
        },
      }),
    })
  })

  await page.route('**/api/admin/staff-attendance?**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          date: '2026-05-27',
          records: [
            {
              staff_id: 'staff-1',
              employee_code: 'EMP001',
              name: 'Anita Rao',
              department: 'Science',
              designation: 'Teacher',
              photo_url: null,
              status: null,
              check_in: null,
              check_out: null,
              remarks: null,
              id: null,
            },
          ],
        },
      }),
    })
  })

  await page.route('**/api/admin/attendance', async (route: Route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          message: 'Attendance marked successfully',
          updated_count: 2,
        },
      }),
    })
  })

  await page.route('**/api/admin/staff-attendance', async (route: Route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          message: 'Staff attendance marked successfully',
          updated_count: 1,
        },
      }),
    })
  })
}

test.describe('Admin Attendance', () => {
  test.skip(
    !shouldRun,
    'Set RUN_ADMIN_ATTENDANCE_E2E=true to run seeded admin attendance E2E coverage'
  )

  test('TEST-ADM-ATT-E2E-001 principal can mark student attendance from the grid', async ({
    page,
  }) => {
    await mockAttendanceApis(page)
    await page.goto('/admin/attendance')

    await expect(page.getByRole('heading', { name: 'Attendance Management' })).toBeVisible()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Grade 6 A' }).click()

    await expect(page.getByText('Rahul Sharma')).toBeVisible()
    await page.getByRole('button', { name: 'Mark All Present' }).first().click()
    await page.getByRole('button', { name: 'Save Attendance' }).click()

    await expect(page.getByText('Attendance marked successfully')).toBeVisible()
  })

  test('TEST-ADM-ATT-E2E-002 principal can capture staff attendance', async ({ page }) => {
    await mockAttendanceApis(page)
    await page.goto('/admin/attendance')

    await page.getByRole('tab', { name: 'Staff Marking' }).click()
    await expect(page.getByText('Anita Rao')).toBeVisible()
    await page.getByRole('button', { name: 'Mark All Present' }).click()
    await page.getByRole('button', { name: 'Save Attendance' }).click()

    await expect(page.getByText('Staff attendance marked successfully')).toBeVisible()
  })

  test('TEST-ADM-ATT-E2E-003 summary cards open the selected class grid', async ({ page }) => {
    await mockAttendanceApis(page)
    await page.goto('/admin/attendance')

    await page.getByRole('tab', { name: 'School Summary' }).click()
    await page.getByText('Grade 6 A').click()

    await expect(page.getByRole('tab', { name: 'Student Marking' })).toHaveAttribute(
      'data-state',
      'active'
    )
    await expect(page.getByText('Rahul Sharma')).toBeVisible()
  })
})
