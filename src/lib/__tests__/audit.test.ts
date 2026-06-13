import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('../prisma', () => ({
  prisma: {
    auditLog: {
      create: mocks.auditCreate,
    },
  },
}))

vi.mock('../logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

import { createAuditLog } from '../audit'

describe('audit logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auditCreate.mockResolvedValue(undefined)
  })

  it('TEST-AUDIT-004 createAuditLog persists required audit fields', async () => {
    await createAuditLog({
      school_id: 'school-1',
      user_id: 'user-1',
      action: 'CREATE',
      entity_type: 'student',
      entity_id: 'student-1',
      ip_address: '10.10.10.10',
      user_agent: 'vitest-agent',
    })

    expect(mocks.auditCreate).toHaveBeenCalledTimes(1)
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        school_id: 'school-1',
        user_id: 'user-1',
        action: 'CREATE',
        entity_type: 'student',
        entity_id: 'student-1',
        ip_address: '10.10.10.10',
        user_agent: 'vitest-agent',
      }),
    })
  })

  it('TEST-AUDIT-005 createAuditLog persists old_value and new_value for updates', async () => {
    const oldValue = {
      first_name: 'Aarav',
      class_id: 'class-a',
      phone: '9999999999',
      nested: {
        address: 'Secret street',
      },
    }
    const newValue = {
      first_name: 'Aarav',
      class_id: 'class-b',
      emergency_contact_phone: '8888888888',
      guardian: {
        phone_number: '7777777777',
      },
    }

    await createAuditLog({
      school_id: 'school-1',
      user_id: 'user-2',
      action: 'UPDATE',
      entity_type: 'student',
      entity_id: 'student-2',
      old_value: oldValue,
      new_value: newValue,
    })

    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        old_value: {
          first_name: 'Aarav',
          class_id: 'class-a',
          phone: '***',
          nested: {
            address: '***',
          },
        },
        new_value: {
          first_name: 'Aarav',
          class_id: 'class-b',
          emergency_contact_phone: '***',
          guardian: {
            phone_number: '***',
          },
        },
      }),
    })
  })

  it('createAuditLog logs errors without throwing', async () => {
    mocks.auditCreate.mockRejectedValueOnce(new Error('db unavailable'))

    await expect(
      createAuditLog({
        school_id: 'school-1',
        user_id: 'user-3',
        action: 'DELETE',
        entity_type: 'student',
        entity_id: 'student-3',
      })
    ).resolves.toBeUndefined()

    expect(mocks.loggerError).toHaveBeenCalledTimes(1)
  })
})
