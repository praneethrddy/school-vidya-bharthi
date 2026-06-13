import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  findManySchools: vi.fn(),
  findManyAttendance: vi.fn(),
  findManyStudentParents: vi.fn(),
  findManyFeeStructures: vi.fn(),
  createBulkNotifications: vi.fn(),
  redisDel: vi.fn(),
  redisKeys: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: mocks.info,
    error: mocks.error,
    warn: mocks.warn,
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    school: {
      findMany: mocks.findManySchools,
    },
    attendance: {
      findMany: mocks.findManyAttendance,
    },
    studentParent: {
      findMany: mocks.findManyStudentParents,
    },
    feeStructure: {
      findMany: mocks.findManyFeeStructures,
    },
  },
}))

vi.mock('@/lib/notification-service', () => ({
  createBulkNotifications: mocks.createBulkNotifications,
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    del: mocks.redisDel,
    keys: mocks.redisKeys,
  },
}))

import {
  runDailyAttendanceReminder,
  runDatabaseBackup,
  runFeeOverdueCheck,
  setupCronJobs,
  // @ts-ignore
  runCacheCleanup,
} from '../cron'

describe('Cron Job Automation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TEST-CRON-001: Cron job definitions parse without error', () => {
    expect(() => setupCronJobs()).not.toThrow()
  })

  it('TEST-CRON-002: Each cron job function executes without throwing', async () => {
    await expect(runDailyAttendanceReminder()).resolves.not.toThrow()
    await expect(runFeeOverdueCheck()).resolves.not.toThrow()
    await expect(runDatabaseBackup()).resolves.not.toThrow()
  })

  it('TEST-CRON-003: Attendance reminder cron → sends notifications to parents of absent students', async () => {
    mocks.findManySchools.mockResolvedValue([{ id: 'school-1', is_active: true }])
    mocks.findManyAttendance.mockResolvedValue([
      { id: 'att-1', student_id: 'student-1', status: 'ABSENT', date: new Date() },
    ])
    mocks.findManyStudentParents.mockResolvedValue([
      { student_id: 'student-1', parent: { user_id: 'parent-user-1' } },
    ])

    await runDailyAttendanceReminder()

    expect(mocks.findManySchools).toHaveBeenCalled()
    expect(mocks.findManyAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ABSENT',
        }),
      })
    )
    expect(mocks.createBulkNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: 'parent-user-1',
          type: 'ATTENDANCE',
        }),
      ])
    )
  })

  it('TEST-CRON-004: Fee due reminder cron → sends notifications to students with outstanding balances', async () => {
    mocks.findManySchools.mockResolvedValue([{ id: 'school-1', is_active: true }])
    mocks.findManyFeeStructures.mockResolvedValue([
      {
        id: 'fee-1',
        amount: 5000,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        class_id: 'class-1',
        academic_year_id: 'ay-1',
      },
    ])

    await runFeeOverdueCheck()

    expect(mocks.findManySchools).toHaveBeenCalled()
    expect(mocks.findManyFeeStructures).toHaveBeenCalled()
    expect(mocks.createBulkNotifications).toHaveBeenCalled()
  })

  it('TEST-CRON-005: Cache cleanup cron → clears expired cache entries', async () => {
    expect(runCacheCleanup).toBeDefined()
    if (runCacheCleanup) {
      mocks.redisKeys.mockResolvedValue(['cache:expired-1', 'cache:expired-2'])
      await runCacheCleanup()
      expect(mocks.redisKeys).toHaveBeenCalled()
      expect(mocks.redisDel).toHaveBeenCalled()
    }
  })

  it('TEST-CRON-006: Cron job scoped to active schools only (skip suspended)', async () => {
    mocks.findManySchools.mockResolvedValue([
      { id: 'active-school', is_active: true },
      { id: 'suspended-school', is_active: false },
    ])

    await runDailyAttendanceReminder()

    expect(mocks.findManySchools).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          is_active: true,
        }),
      })
    )
  })

  it('TEST-CRON-007: Cron job failure → error logged, does not crash process', async () => {
    mocks.findManySchools.mockRejectedValue(new Error('Database connection failed'))

    await expect(runDailyAttendanceReminder()).resolves.not.toThrow()
    expect(mocks.error).toHaveBeenCalledWith(
      expect.any(Object),
      expect.stringContaining('Daily attendance reminder failed')
    )
  })

  it('TEST-CRON-008: Cron job idempotency → running twice produces no duplicates', async () => {
    mocks.findManySchools.mockResolvedValue([{ id: 'school-1', is_active: true }])
    mocks.findManyAttendance.mockResolvedValue([
      { id: 'att-1', student_id: 'student-1', status: 'ABSENT', date: new Date() },
    ])
    mocks.findManyStudentParents.mockResolvedValue([
      { student_id: 'student-1', parent: { user_id: 'parent-user-1' } },
    ])

    await runDailyAttendanceReminder()
    const firstCallCount = mocks.createBulkNotifications.mock.calls.length

    await runDailyAttendanceReminder()
    const secondCallCount = mocks.createBulkNotifications.mock.calls.length

    expect(secondCallCount).toBe(firstCallCount)
  })
})
