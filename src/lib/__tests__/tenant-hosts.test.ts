import { describe, expect, it } from 'vitest'
import { extractSubdomainFromHost, sanitizeHost } from '@/lib/tenant-hosts'

describe('tenant-hosts', () => {
  it('TEST-TH-001: extractSubdomainFromHost handles platform, localhost, and custom hosts', () => {
    const originalPlatformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN = 'platform.schoolos.in'

    try {
      expect(extractSubdomainFromHost('vbhs.schoolos.in')).toBe('vbhs')
      expect(extractSubdomainFromHost('VBHS.schoolos.in:443')).toBe('vbhs')
      expect(extractSubdomainFromHost('demo.localhost:3000')).toBe('demo')
      expect(extractSubdomainFromHost('schoolos.in')).toBeNull()
      expect(extractSubdomainFromHost('www.schoolos.in')).toBeNull()
      expect(extractSubdomainFromHost('alpha.platform.schoolos.in')).toBe('alpha')
      expect(extractSubdomainFromHost('vidhyabharthi.com')).toBeNull()
    } finally {
      if (originalPlatformDomain === undefined) {
        delete process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
      } else {
        process.env.NEXT_PUBLIC_PLATFORM_DOMAIN = originalPlatformDomain
      }
    }
  })

  it('TEST-TH-002: sanitizeHost handles nullish input and strips ports safely', () => {
    expect(sanitizeHost(undefined)).toBeNull()
    expect(sanitizeHost(null)).toBeNull()
    expect(sanitizeHost('')).toBeNull()
    expect(sanitizeHost('VBHS.schoolos.in:3000')).toBe('vbhs.schoolos.in')
    expect(sanitizeHost('vbhs.schoolos.in:443, proxy.schoolos.in')).toBe('vbhs.schoolos.in')
  })
})
