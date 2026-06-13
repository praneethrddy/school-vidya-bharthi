import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resendCtorKey: vi.fn(),
  resendSend: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: vi.fn((apiKey: string) => {
    mocks.resendCtorKey(apiKey)
    return {
      emails: {
        send: mocks.resendSend,
      },
    }
  }),
}))

vi.mock('../logger', () => ({
  logger: {
    info: mocks.loggerInfo,
    error: mocks.loggerError,
  },
}))

describe('email helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL
  })

  it('TEST-EMAIL-001: email.ts — sendEmail() calls Resend API with correct params', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'
    process.env.RESEND_FROM_EMAIL = 'school@example.com'

    const { sendEmail } = await import('../email')
    mocks.resendSend.mockResolvedValue({ id: 'email-1' })

    const ok = await sendEmail({
      to: 'parent@example.com',
      subject: 'Test Subject',
      html: '<p>Test Body</p>',
    })

    expect(ok).toBe(true)
    expect(mocks.resendCtorKey).toHaveBeenCalledWith('resend-test-key')
    expect(mocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'school@example.com',
      })
    )
  })

  it('TEST-EMAIL-002: sendEmail() — recipient, subject, body correctly formatted', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'
    process.env.RESEND_FROM_EMAIL = 'school@example.com'

    const { sendEmail } = await import('../email')
    mocks.resendSend.mockResolvedValue({ id: 'email-2' })

    const ok = await sendEmail({
      to: ['parent1@example.com', 'parent2@example.com'],
      subject: 'Fee reminder',
      html: '<p>Fee due tomorrow.</p>',
      replyTo: 'accounts@example.com',
    })

    expect(ok).toBe(true)
    expect(mocks.resendSend).toHaveBeenCalledWith({
      from: 'school@example.com',
      to: ['parent1@example.com', 'parent2@example.com'],
      subject: 'Fee reminder',
      html: '<p>Fee due tomorrow.</p>',
      replyTo: 'accounts@example.com',
    })
  })

  it('TEST-EMAIL-003: sendEmail() — Resend API failure → error logged, no crash', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'

    const { sendEmail } = await import('../email')
    mocks.resendSend.mockRejectedValue(new Error('resend outage'))

    const ok = await sendEmail({
      to: 'teacher@example.com',
      subject: 'Test',
      html: '<p>Body</p>',
    })

    expect(ok).toBe(false)
    expect(mocks.loggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'teacher@example.com',
        subject: 'Test',
      }),
      'Failed to send email'
    )
  })

  it('TEST-EMAIL-004: sendEmail() — missing RESEND_API_KEY → graceful error', async () => {
    const { sendEmail } = await import('../email')

    const ok = await sendEmail({
      to: 'parent@example.com',
      subject: 'Attendance update',
      html: '<p>Student was present.</p>',
    })

    expect(ok).toBe(true)
    expect(mocks.resendSend).not.toHaveBeenCalled()
    expect(mocks.loggerInfo).toHaveBeenCalledWith(
      {
        to: 'parent@example.com',
        subject: 'Attendance update',
        from: 'noreply@vidhyabharthi.com',
      },
      '[Email] Mock send'
    )
  })

  it('TEST-EMAIL-005: Admission status change → notification email triggered', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'

    const { sendNotificationEmail } = await import('../email')
    mocks.resendSend.mockResolvedValue({ id: 'email-5' })

    const ok = await sendNotificationEmail(
      'parent@example.com',
      'Admission Status Update',
      'Your child Aarav Sharma has been SHORTLISTED for admission.'
    )

    expect(ok).toBe(true)
    expect(mocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'parent@example.com',
        subject: 'Admission Status Update',
        html: expect.stringContaining('SHORTLISTED'),
      })
    )
  })

  it('TEST-EMAIL-006: Password reset → email contains reset link with valid token', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'

    const { sendPasswordResetEmail } = await import('../email')
    mocks.resendSend.mockResolvedValue({ id: 'email-6' })

    const ok = await sendPasswordResetEmail('user@example.com', 'https://app/reset?token=abc-xyz-123')

    expect(ok).toBe(true)
    expect(mocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Reset Your Password - Vidhya Bharthi High School',
        html: expect.stringContaining('https://app/reset?token=abc-xyz-123'),
      })
    )
  })

  it('TEST-EMAIL-007: Email content does not contain raw HTML (sanitized)', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'

    const { sendPublicContactEmail } = await import('../email')
    mocks.resendSend.mockResolvedValue({ id: 'email-7' })

    await sendPublicContactEmail({
      to: 'office@example.com',
      schoolName: 'Vidhya Bharthi High School',
      senderName: '<script>alert("xss")</script> Name',
      senderEmail: 'attacker@example.com',
      senderPhone: '1234567890',
      subject: '<b>Inquiry</b>',
      message: '<p>Malicious paragraph</p>',
    })

    const callArg = mocks.resendSend.mock.calls[0][0] as any
    const htmlBody = callArg.html

    // Assert that the raw HTML tags from user inputs are escaped/sanitized to prevent XSS/HTML Injection
    expect(htmlBody).not.toContain('<script>')
    expect(htmlBody).not.toContain('<b>')
    expect(htmlBody).not.toContain('<p>')
    expect(htmlBody).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(htmlBody).toContain('&lt;b&gt;Inquiry&lt;/b&gt;')
    expect(htmlBody).toContain('&lt;p&gt;Malicious paragraph&lt;/p&gt;')
  })

  it('TEST-EMAIL-008: Email does not expose sensitive data (passwords, tokens in body)', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'

    const { sendPasswordResetEmail } = await import('../email')
    mocks.resendSend.mockResolvedValue({ id: 'email-8' })

    const token = 'super-secret-token-12345'
    await sendPasswordResetEmail('user@example.com', `https://app/reset?token=${token}`)

    const callArg = mocks.resendSend.mock.calls[0][0] as any
    const htmlBody = callArg.html

    // Token must only appear inside the href attribute of a link, not as raw plain text in the message body
    expect(htmlBody).toContain(`href="https://app/reset?token=${token}"`)
    const bodyWithoutLink = htmlBody.replace(`href="https://app/reset?token=${token}"`, '')
    expect(bodyWithoutLink).not.toContain(token)
    expect(htmlBody).not.toContain('password_hash')
  })

  it('TEST-EMAIL-009: Bulk email (e.g., fee reminder to all defaulters) → batched', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'

    const { sendEmail } = await import('../email')
    mocks.resendSend.mockResolvedValue({ id: 'email-9' })

    const recipients = Array.from({ length: 101 }, (_, i) => `parent${i}@example.com`)

    const ok = await sendEmail({
      to: recipients,
      subject: 'Fee Reminder',
      html: '<p>Please pay dues.</p>',
    })

    expect(ok).toBe(true)
    // Resend free tier/bulk email has a limit of 50 recipients per API call (or 50 recipients per 'to' array).
    // The sendEmail helper should batch the calls in chunks of 50.
    // If it is batched, resendSend should be called 3 times (50, 50, 1).
    expect(mocks.resendSend).toHaveBeenCalledTimes(3)
  })

  it('TEST-EMAIL-010: Email with empty recipient list → no-op, no error', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'

    const { sendEmail } = await import('../email')
    mocks.resendSend.mockResolvedValue({ id: 'email-10' })

    // Empty array of recipients
    const okArray = await sendEmail({
      to: [],
      subject: 'Empty Test',
      html: '<p>Hello</p>',
    })

    expect(okArray).toBe(true)
    expect(mocks.resendSend).not.toHaveBeenCalled()

    vi.clearAllMocks()

    // Empty string of recipient
    const okString = await sendEmail({
      to: '',
      subject: 'Empty Test',
      html: '<p>Hello</p>',
    })

    expect(okString).toBe(true)
    expect(mocks.resendSend).not.toHaveBeenCalled()
  })

  // Retain other existing helper tests
  it('sendPublicContactEmail prefixes subject, sets reply-to, and converts new lines', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'

    const { sendPublicContactEmail } = await import('../email')
    mocks.resendSend.mockResolvedValue({ id: 'email-4' })

    const ok = await sendPublicContactEmail({
      to: 'office@example.com',
      schoolName: 'Vidhya Bharthi High School',
      senderName: 'Parent User',
      senderEmail: 'parent@example.com',
      senderPhone: '+91-9999999999',
      subject: 'Admission question',
      message: 'Line one\nLine two',
    })

    expect(ok).toBe(true)
    expect(mocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'office@example.com',
        subject: '[Website Inquiry] Admission question',
        replyTo: 'parent@example.com',
        html: expect.stringContaining('Line one<br />Line two'),
      })
    )
  })

  it('sendSchoolOnboardingEmail includes principal credentials and login URL', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'

    const { sendSchoolOnboardingEmail } = await import('../email')
    mocks.resendSend.mockResolvedValue({ id: 'email-5' })

    const ok = await sendSchoolOnboardingEmail({
      to: 'principal@example.com',
      schoolName: 'Vidhya Bharthi High School',
      principalEmail: 'principal@example.com',
      temporaryPassword: 'Temp@1234',
      loginUrl: 'https://school.example.com/login',
    })

    expect(ok).toBe(true)
    expect(mocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'principal@example.com',
        subject: 'Welcome to SchoolOS - Vidhya Bharthi High School',
        html: expect.stringContaining('principal@example.com'),
      })
    )
    expect(mocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Temp@1234'),
      })
    )
    expect(mocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('https://school.example.com/login'),
      })
    )
  })
})
