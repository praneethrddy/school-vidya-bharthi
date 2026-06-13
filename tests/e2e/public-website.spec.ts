import { expect, test } from '@playwright/test'

const shouldRun = process.env.RUN_PUBLIC_WEBSITE_E2E === 'true'

const publicPages = [
  { path: '/', title: /Vidhya Bharthi High School/i },
  { path: '/about', title: /About/i },
  { path: '/academics', title: /Academics/i },
  { path: '/admissions', title: /Admissions/i },
  { path: '/gallery', title: /Gallery/i },
  { path: '/contact', title: /Contact/i },
  { path: '/alumni', title: /Alumni/i },
  { path: '/onboarding', title: /Onboarding|SchoolOS/i },
]

test.describe('Public Website', () => {
  test.skip(!shouldRun, 'Set RUN_PUBLIC_WEBSITE_E2E=true to run public website E2E coverage')

  test('TEST-PUB-001/002/003/004/007/009: visitors can browse all public pages', async ({
    page,
  }) => {
    for (const publicPage of publicPages) {
      await page.goto(publicPage.path)
      await expect(page).toHaveURL(
        new RegExp(`${publicPage.path === '/' ? '/$' : publicPage.path}$`)
      )
      await expect(page).toHaveTitle(publicPage.title)
    }
  })

  test('TEST-PUB-005: visitors can access gallery and open lightbox when media exists', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Vidhya Bharthi High School/i })).toBeVisible()

    await page.goto('/gallery')
    await expect(page).toHaveURL(/\/gallery/)

    const galleryButtons = page.locator('button').filter({ has: page.locator('img') })
    if ((await galleryButtons.count()) > 0) {
      await galleryButtons.first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
    }
  })

  test('TEST-PUB-006: visitors can submit the contact form', async ({ page }) => {
    await page.route('**/api/public/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            delivered: true,
          },
        }),
      })
    })

    await page.goto('/contact')

    await page.getByLabel('Name').fill('Website Visitor')
    await page.getByLabel('Email').fill('visitor@example.com')
    await page.getByLabel('Phone').fill('9876543210')
    await page.getByLabel('Subject').fill('Admission enquiry')
    await page
      .getByLabel('Message')
      .fill('Hello, I would like to know more about the admission process.')
    await page.getByRole('button', { name: 'Send Message' }).click()

    await expect(page.getByText("Thank you! We'll get back to you soon.")).toBeVisible()
  })

  test('TEST-PUB-010: onboarding wizard submits school registration details', async ({ page }) => {
    await page.route('**/api/onboarding/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            school: {
              id: 'school-1',
              name: 'Green Valley School',
              slug: 'green-valley-school',
              email: 'hello@greenvalley.school',
            },
            principal: {
              email: 'principal@greenvalley.school',
              temporary_password: 'Temp@1234',
            },
            current_academic_year: {
              id: 'ay-1',
              name: '2026-2027',
            },
            login_url: 'https://green-valley-school.schoolos.test/login',
          },
        }),
      })
    })

    await page.goto('/onboarding')
    await page.getByLabel('School Name').fill('Green Valley School')
    await page.getByLabel('Subdomain Slug').fill('green-valley-school')
    await page.getByLabel('School Email').fill('hello@greenvalley.school')
    await page.getByLabel('Principal Name').fill('Asha Verma')
    await page.getByLabel('Principal Email').fill('principal@greenvalley.school')
    await page.getByRole('button', { name: /Create School Workspace/i }).click()

    await expect(page.getByText('Workspace Ready')).toBeVisible()
    await expect(page.getByText('Green Valley School')).toBeVisible()
  })

  test('TEST-PUB-012: all public pages expose core SEO tags', async ({ page }) => {
    for (const publicPage of publicPages) {
      await page.goto(publicPage.path)

      const currentTitle = await page.title()
      expect(currentTitle.trim().length).toBeGreaterThan(0)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S+/)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /https?:\/\//)
    }
  })
})
