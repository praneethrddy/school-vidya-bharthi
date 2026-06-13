import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  loggerInfo: vi.fn(),
}))

vi.mock('../auth', () => ({
  auth: mocks.auth,
}))

vi.mock('../logger', () => ({
  logger: {
    info: mocks.loggerInfo,
  },
}))

import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '../api-helpers'

describe('api-helpers response helpers', () => {
  it('successResponse returns 200 and a success payload', async () => {
    const response = successResponse({ id: 'entity-1', name: 'Record' })

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body).toEqual({
      success: true,
      data: {
        id: 'entity-1',
        name: 'Record',
      },
    })
    expect(typeof body.success).toBe('boolean')
    expect(body.error).toBeUndefined()
  })

  it('errorResponse returns provided status and error object shape', async () => {
    const response = errorResponse('BAD_REQUEST', 'Invalid payload', 422)

    expect(response.status).toBe(422)

    const body = await response.json()
    expect(body).toEqual({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid payload',
      },
    })
    expect(typeof body.success).toBe('boolean')
    expect(body.data).toBeUndefined()
  })

  it('unauthorizedResponse uses default status/code/message', async () => {
    const response = unauthorizedResponse()

    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body).toEqual({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      },
    })
  })

  it('unauthorizedResponse accepts custom message', async () => {
    const response = unauthorizedResponse('No valid session')

    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body.error).toEqual({
      code: 'UNAUTHORIZED',
      message: 'No valid session',
    })
  })

  it('forbiddenResponse uses 403 and supports message overrides', async () => {
    const defaultResponse = forbiddenResponse()
    const customResponse = forbiddenResponse('Not allowed')

    expect(defaultResponse.status).toBe(403)
    expect(customResponse.status).toBe(403)

    const defaultBody = await defaultResponse.json()
    const customBody = await customResponse.json()

    expect(defaultBody).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden',
      },
    })
    expect(customBody.error).toEqual({
      code: 'FORBIDDEN',
      message: 'Not allowed',
    })
  })
})
