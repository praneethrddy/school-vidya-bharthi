import type { APIRequestContext } from '@playwright/test'

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string = 'Test@1234'
) {
  return request.post('/api/auth/callback/credentials', {
    form: { email, password, csrfToken: '' },
  })
}

export async function apiGet(request: APIRequestContext, path: string) {
  return request.get(path, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function apiPost(
  request: APIRequestContext,
  path: string,
  data: Record<string, unknown>
) {
  return request.post(path, {
    headers: { 'Content-Type': 'application/json' },
    data,
  })
}
