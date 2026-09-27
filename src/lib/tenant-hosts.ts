export function sanitizeHost(host: string | null | undefined): string | null {
  if (!host) {
    return null
  }

  return host.split(',')[0]?.trim().split(':')[0]?.toLowerCase() || null
}

export function getPlatformRootUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PLATFORM_ROOT_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://schoolos.in'
  )
}

export function isLocalHost(host: string | null | undefined): boolean {
  const normalized = sanitizeHost(host)
  return Boolean(
    normalized &&
      (normalized === 'localhost' ||
        normalized === '127.0.0.1' ||
        normalized.endsWith('.localhost'))
  )
}

export function extractSubdomainFromHost(host: string | null | undefined): string | null {
  const normalized = sanitizeHost(host)

  if (!normalized || isLocalHost(normalized)) {
    const localMatch = normalized?.match(/^([a-z0-9-]+)\.localhost$/i)
    return localMatch?.[1]?.toLowerCase() || null
  }

  if (normalized === 'schoolos.in' || normalized === 'www.schoolos.in') {
    return null
  }

  const explicitPlatformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.toLowerCase()
  if (explicitPlatformDomain && normalized.endsWith(`.${explicitPlatformDomain}`)) {
    return normalized.slice(0, normalized.length - explicitPlatformDomain.length - 1)
  }

  if (normalized.endsWith('.schoolos.in')) {
    return normalized.replace(/\.schoolos\.in$/, '')
  }

  return null
}

export function isLikelyCustomDomainHost(host: string | null | undefined): boolean {
  const normalized = sanitizeHost(host)
  if (!normalized || isLocalHost(normalized)) {
    return false
  }

  if (normalized === 'schoolos.in' || normalized === 'www.schoolos.in') {
    return false
  }

  return !normalized.endsWith('.schoolos.in')
}
