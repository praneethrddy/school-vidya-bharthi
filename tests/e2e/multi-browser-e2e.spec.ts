import { expect, test, type Page, type TestInfo } from '@playwright/test'

import { authFiles, TEST_CREDENTIALS } from './helpers/auth'
import { loginViaUi } from './helpers/ui-auth'

const shouldRun = process.env.RUN_MULTI_BROWSER_E2E !== 'false'

const desktopBrowsers = ['chromium', 'firefox', 'webkit'] as const

const publicPages = [
  { path: '/', title: /Vidhya Bharthi High School/i },
  { path: '/about', title: /About/i },
  { path: '/academics', title: /Academics/i },
  { path: '/admissions', title: /Admissions/i },
  { path: '/gallery', title: /Gallery/i },
  { path: '/contact', title: /Contact/i },
  { path: '/alumni', title: /Alumni/i },
]

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function pathPattern(path: string) {
  return new RegExp(`${escapeRegExp(path)}(?:\\?|$)`)
}

function requireProjects(testInfo: TestInfo, allowed: readonly string[]) {
  test.skip(
    !allowed.includes(testInfo.project.name),
    `Runs only on ${allowed.join(', ')} for this browser matrix case`
  )
}

async function gotoAndAssert(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(pathPattern(path))
}

async function runStudentJourney(page: Page) {
  await gotoAndAssert(page, '/dashboard')

  for (const path of [
    '/attendance',
    '/grades',
    '/fees',
    '/timetable',
    '/notifications',
    '/profile',
  ]) {
    await gotoAndAssert(page, path)
  }
}

async function runParentJourney(page: Page) {
  await gotoAndAssert(page, '/dashboard')
  await expect(page.getByRole('link', { name: /PTM/i })).toBeVisible()
  await expect(page.locator('#parent-child-selector-slot')).toBeAttached()

  for (const path of ['/attendance', '/grades', '/fees', '/timetable']) {
    await gotoAndAssert(page, path)
  }
}

test.describe('Section 42 - Multi-Browser E2E Matrix', () => {
  test.describe.configure({ mode: 'serial', retries: 1 })

  test.skip(
    !shouldRun,
    'Set RUN_MULTI_BROWSER_E2E=false to skip this suite when cross-browser validation is not needed'
  )

  test.describe('Student journeys', () => {
    test.use({ storageState: authFiles.student })

    test('TEST-BROWSER-001: E2E-001 (Student journey) passes on Firefox', async ({
      page,
    }, testInfo) => {
      requireProjects(testInfo, ['firefox'])
      await runStudentJourney(page)
    })

    test('TEST-BROWSER-002: E2E-001 (Student journey) passes on WebKit', async ({
      page,
    }, testInfo) => {
      requireProjects(testInfo, ['webkit'])
      await runStudentJourney(page)
    })

    test('TEST-BROWSER-007: E2E-001 on mobile Chrome (Pixel 5 viewport)', async ({
      page,
    }, testInfo) => {
      requireProjects(testInfo, ['mobile-chrome'])
      await runStudentJourney(page)
    })

    test('TEST-BROWSER-008: E2E-001 on mobile Safari (iPhone 13 viewport)', async ({
      page,
    }, testInfo) => {
      requireProjects(testInfo, ['mobile-safari'])
      await runStudentJourney(page)
    })
  })

  test.describe('Parent journeys', () => {
    test.use({ storageState: authFiles.parent })

    test('TEST-BROWSER-003: E2E-002 (Parent journey) passes on Firefox', async ({
      page,
    }, testInfo) => {
      requireProjects(testInfo, ['firefox'])
      await runParentJourney(page)
    })

    test('TEST-BROWSER-004: E2E-002 (Parent journey) passes on WebKit', async ({
      page,
    }, testInfo) => {
      requireProjects(testInfo, ['webkit'])
      await runParentJourney(page)
    })
  })

  test.describe('Student admin journeys', () => {
    test.use({ storageState: authFiles.studentadmin })

    test('TEST-BROWSER-005: E2E-003 (Admin student) passes on Firefox', async ({
      page,
    }, testInfo) => {
      requireProjects(testInfo, ['firefox'])

      await gotoAndAssert(page, '/admin/students')
      await expect(page.getByRole('heading', { name: /Student Management/i })).toBeVisible()
    })
  })

  test('TEST-BROWSER-006: E2E-011 (Public website) passes on all 3 browsers', async ({
    page,
  }, testInfo) => {
    requireProjects(testInfo, desktopBrowsers)
    test.slow()

    for (const publicPage of publicPages) {
      await gotoAndAssert(page, publicPage.path)
      await expect(page).toHaveTitle(publicPage.title)
    }
  })

  test('TEST-BROWSER-009: Login flow on all browsers - form submission works', async ({ page }) => {
    await loginViaUi(page, TEST_CREDENTIALS.users.principal, TEST_CREDENTIALS.password, {
      timeout: 15000,
    })
    await expect(page).toHaveURL(pathPattern('/admin/dashboard'))
  })

  test.describe('Principal journeys', () => {
    test.use({ storageState: authFiles.principal })

    test('TEST-BROWSER-010: Date pickers render and function on all browsers', async ({ page }) => {
      test.slow()
      await gotoAndAssert(page, '/admin/settings')

      await page.getByRole('tab', { name: /Academic Years/i }).click()
      const startDateInput = page.getByLabel('Start Date').first()
      await expect(startDateInput).toBeVisible()

      await startDateInput.fill('2026-06-01')
      await expect(startDateInput).toHaveValue('2026-06-01')
    })

    test('TEST-BROWSER-011: File upload (CSV, logo) works on all browsers', async ({ page }) => {
      await page.route('**/api/import/upload', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              upload_id: 'upload-1',
              detected_columns: ['admission_number', 'first_name', 'last_name', 'date_of_birth'],
              suggested_mapping: {
                admission_number: 'admission_number',
                first_name: 'first_name',
                last_name: 'last_name',
                date_of_birth: 'date_of_birth',
              },
              warnings: [],
            },
          }),
        })
      })

      await gotoAndAssert(page, '/admin/import')
      const csvInput = page.locator('input[type="file"][accept=".csv,text/csv"]')
      await expect(csvInput).toHaveCount(1)
      await csvInput.setInputFiles({
        name: 'students.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
          'admission_number,first_name,last_name,date_of_birth\nA1,John,Doe,2012-01-01\n'
        ),
      })
      await expect(page.getByText('Selected file: students.csv')).toBeVisible()

      await gotoAndAssert(page, '/admin/settings')
      await page.getByRole('tab', { name: /School Profile/i }).click()
      const logoInput = page.getByLabel('Logo')
      await expect(logoInput).toBeVisible()
      await logoInput.setInputFiles({
        name: 'logo.png',
        mimeType: 'image/png',
        buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      })
      await expect(page.getByAltText('School logo preview')).toBeVisible()
    })

    test('TEST-BROWSER-012: PDF download triggers on all browsers', async ({ page }) => {
      test.slow()
      await page.addInitScript(() => {
        ;(window as unknown as { __pdfOpenCalls: unknown[] }).__pdfOpenCalls = []
        const originalOpen = window.open
        window.open = (...args) => {
          ;(window as unknown as { __pdfOpenCalls: unknown[] }).__pdfOpenCalls.push(args[0])
          return originalOpen.apply(window, args)
        }
      })

      await page.route('**/api/admin/reports/meta**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              school: {
                id: 'school-1',
                name: 'Vidhya Bharthi High School',
              },
              current_academic_year_id: 'year-1',
              classes: [
                {
                  id: 'class-1',
                  name: 'Class 10',
                  section: 'A',
                  academic_year_id: 'year-1',
                },
              ],
              terms: [
                {
                  id: 'term-1',
                  name: 'Term 1',
                  academic_year_id: 'year-1',
                },
              ],
              exams: [],
              fee_categories: [],
            },
          }),
        })
      })

      await page.route(/\/api\/admin\/reports\/attendance\?.*format=json/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              report_type: 'attendance',
              period: {
                from: '2026-01-01',
                to: '2026-01-31',
              },
              class: {
                id: 'class-1',
                name: 'Class 10',
                section: 'A',
              },
              data: {
                student_wise: [
                  {
                    student_id: 'student-1',
                    student_name: 'John Doe',
                    roll_number: '10A-01',
                    total_days: 20,
                    present: 18,
                    absent: 1,
                    late: 1,
                    half_day: 0,
                    percentage: 90,
                  },
                ],
                daily_summary: [
                  {
                    date: '2026-01-01',
                    present: 18,
                    absent: 2,
                    percentage: 90,
                  },
                ],
                overall: {
                  average_attendance: 90,
                  best_attendance_student: 'John Doe',
                  worst_attendance_student: 'John Doe',
                },
              },
            },
          }),
        })
      })

      await gotoAndAssert(page, '/admin/reports')
      await expect(page.getByRole('button', { name: /Generate Report/i })).toBeVisible()

      await page.route(/\/api\/admin\/reports\/.*format=pdf/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              url: 'https://example.com/report.pdf',
            },
          }),
        })
      })

      await page.getByRole('button', { name: /Generate Report/i }).click()
      await expect(page.getByText('Average Attendance')).toBeVisible()
      const pdfButton = page.getByRole('button', { name: /Download PDF/i })
      await expect(pdfButton).toBeEnabled()
      await pdfButton.click()

      await expect
        .poll(async () => {
          return page.evaluate(() => {
            return (window as unknown as { __pdfOpenCalls: unknown[] }).__pdfOpenCalls.length
          })
        })
        .toBeGreaterThan(0)
    })
  })
})
