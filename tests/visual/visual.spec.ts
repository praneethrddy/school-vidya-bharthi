import { expect, test, type Page } from '@playwright/test'

// Configure Playwright to store baselines in tests/visual/__screenshots__/
test.use({
  snapshotDir: './__screenshots__',
})

const password = process.env.E2E_PASSWORD || 'Test@1234'
const studentEmail = process.env.E2E_STUDENT_EMAIL || 'student@vbhs.com'
const principalEmail = process.env.E2E_PRINCIPAL_EMAIL || 'principal@vbhs.com'
const superAdminEmail = process.env.E2E_SUPER_ADMIN_EMAIL || 'super@vbhs.com'

async function login(page: Page, email: string, passwordValue: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(passwordValue)
  await page.getByRole('button', { name: 'Login' }).click()
  await page.waitForLoadState('networkidle')
}

const screenshotOptions = {
  maxDiffPixelRatio: 0.01,
}

test.describe('30A — Public Pages', () => {
  test('TEST-VIS-001: Home page — desktop (1280x720)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Vidhya Bharthi High School/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-001.png', screenshotOptions)
  })

  test('TEST-VIS-002: Home page — mobile (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Vidhya Bharthi High School/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-002.png', screenshotOptions)
  })

  test('TEST-VIS-003: About page — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/about')
    await expect(page.getByRole('heading', { name: /About/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-003.png', screenshotOptions)
  })

  test('TEST-VIS-004: Contact page with form — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: /Contact/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-004.png', screenshotOptions)
  })

  test('TEST-VIS-005: Onboarding page — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/onboarding')
    await expect(page.getByRole('heading', { name: /SchoolOS/i }).or(page.getByText(/Create School Workspace/i))).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-005.png', screenshotOptions)
  })
})

test.describe('30B — Auth Pages', () => {
  test('TEST-VIS-006: Login page — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-006.png', screenshotOptions)
  })

  test('TEST-VIS-007: Login page — mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-007.png', screenshotOptions)
  })

  test('TEST-VIS-008: Forgot password page — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/forgot-password')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-008.png', screenshotOptions)
  })
})

test.describe('30C — Student/Parent Portal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, studentEmail, password)
  })

  test('TEST-VIS-009: Student dashboard — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-009.png', screenshotOptions)
  })

  test('TEST-VIS-010: Student dashboard — mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-010.png', screenshotOptions)
  })

  test('TEST-VIS-011: Attendance page with calendar — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/attendance')
    await expect(page.getByRole('heading', { name: /Attendance/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-011.png', screenshotOptions)
  })

  test('TEST-VIS-012: Grades page with term selector — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/grades')
    await expect(page.getByRole('heading', { name: /Grades/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-012.png', screenshotOptions)
  })

  test('TEST-VIS-013: Fees page with balance display — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/fees')
    await expect(page.getByRole('heading', { name: /Fee/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-013.png', screenshotOptions)
  })

  test('TEST-VIS-014: Timetable weekly grid — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/timetable')
    await expect(page.getByRole('heading', { name: /Timetable/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-014.png', screenshotOptions)
  })

  test('TEST-VIS-015: Timetable day view — mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/timetable')
    await expect(page.getByRole('heading', { name: /Timetable/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-015.png', screenshotOptions)
  })

  test('TEST-VIS-016: Profile page — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: /Profile/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-016.png', screenshotOptions)
  })

  test('TEST-VIS-017: Notifications page — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/notifications')
    await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-017.png', screenshotOptions)
  })
})

test.describe('30D — Admin Pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, principalEmail, password)
  })

  test('TEST-VIS-018: Admin dashboard with charts — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/dashboard')
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-018.png', screenshotOptions)
  })

  test('TEST-VIS-019: Student list table — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/students')
    await expect(page.getByRole('heading', { name: /Student/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-019.png', screenshotOptions)
  })

  test('TEST-VIS-020: Student create form — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/students')
    await page.getByRole('button', { name: 'Add Student' }).click()
    await expect(page.getByRole('button', { name: 'Create Student' })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-020.png', screenshotOptions)
  })

  test('TEST-VIS-021: Staff list table — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/staff')
    await expect(page.getByRole('heading', { name: /Staff/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-021.png', screenshotOptions)
  })

  test('TEST-VIS-022: Attendance grid — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/attendance')
    await expect(page.getByRole('heading', { name: /Attendance/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-022.png', screenshotOptions)
  })

  test('TEST-VIS-023: Grade entry form — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/grades')
    await page.getByRole('tab', { name: 'Grade Entry' }).click()
    await expect(page.getByText('Please select an exam and subject to enter grades.')).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-023.png', screenshotOptions)
  })

  test('TEST-VIS-024: Fee management overview — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/fees')
    await expect(page.getByRole('heading', { name: /Fee/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-024.png', screenshotOptions)
  })

  test('TEST-VIS-025: Admissions list — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/admissions')
    await expect(page.getByRole('heading', { name: /Admission/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-025.png', screenshotOptions)
  })

  test('TEST-VIS-026: Settings page — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/settings')
    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-026.png', screenshotOptions)
  })

  test('TEST-VIS-027: Reports page — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/reports')
    await expect(page.getByRole('heading', { name: /Report/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-027.png', screenshotOptions)
  })

  test('TEST-VIS-028: Import wizard — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/admin/import')
    await expect(page.getByRole('heading', { name: /Import/i })).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-028.png', screenshotOptions)
  })
})

test.describe('30E — Super Admin', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, superAdminEmail, password)
  })

  test('TEST-VIS-029: Super admin dashboard — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/super-admin/dashboard')
    await expect(page.getByRole('heading', { name: /Super Admin/i }).or(page.getByText(/Recent Tenants/i))).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-029.png', screenshotOptions)
  })

  test('TEST-VIS-030: Schools list — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/super-admin/schools')
    await expect(page.getByRole('heading', { name: /School/i }).or(page.getByText(/onboarded/i))).toBeVisible()
    await expect(page).toHaveScreenshot('TEST-VIS-030.png', screenshotOptions)
  })
})
