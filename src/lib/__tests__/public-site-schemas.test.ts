import { describe, expect, it } from 'vitest'
import { publicContactFormSchema } from '@/lib/public-site-schemas'

describe('publicContactFormSchema', () => {
  const validPayload = {
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    phone: '9876543210',
    subject: 'Admission enquiry',
    message: 'I would like to know more about Grade 5 admissions.',
    company: '',
  }

  it('TEST-PSS-001: accepts a valid contact enquiry payload', () => {
    const result = publicContactFormSchema.safeParse(validPayload)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validPayload)
    }
  })

  it('TEST-PSS-002: rejects invalid email values', () => {
    const result = publicContactFormSchema.safeParse({
      ...validPayload,
      email: 'invalid-email',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('valid email')
    }
  })

  it('TEST-PSS-003: rejects payloads with missing required fields', () => {
    const result = publicContactFormSchema.safeParse({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issueMessages = result.error.issues.map((issue) => issue.message)
      expect(issueMessages.length).toBeGreaterThan(1)
    }
  })

  it('TEST-PSS-001: applies default company field when omitted', () => {
    const result = publicContactFormSchema.safeParse({
      ...validPayload,
      company: undefined,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.company).toBe('')
    }
  })
})
