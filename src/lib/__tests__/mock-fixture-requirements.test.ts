import { beforeEach, describe, expect, it } from 'vitest'

import { testAcademicYears, testClasses, testTerms } from '@/test/fixtures/academic'
import { testFeePayments, testFeeStructures } from '@/test/fixtures/fees'
import { testSchool } from '@/test/fixtures/school'
import { testStaff } from '@/test/fixtures/staff'
import { testStudents } from '@/test/fixtures/students'
import { testUsers, testUsersByRole } from '@/test/fixtures/users'
import { resetMockHeaders, setMockHeaders, headers as nextHeaders } from '@/test/mocks/next-headers'
import {
  PRISMA_MODEL_NAMES,
  createPrismaMock,
  prismaMock,
  resetPrismaMock,
} from '@/test/mocks/prisma'
import { redisMock, resetRedisMock, setRedisFailure } from '@/test/mocks/redis'
import { configureR2Mock, resetR2Mock, uploadFile } from '@/test/mocks/r2'
import {
  mockExpiredSession,
  mockNoSession,
  mockSession,
  mockSessionUsersByRole,
} from '@/test/mocks/session'
import { Role } from '@/types/auth'

describe('[MOCK-FIXTURE-REQUIREMENTS]', () => {
  describe('[ASSERT] /lib/mock-fixture-requirements', () => {
    beforeEach(() => {
      resetPrismaMock(prismaMock)
      resetRedisMock()
      resetR2Mock()
      resetMockHeaders()
    })

    it('[TEST-MFR-001] should ensure prisma mock exposes all models with required methods', () => {
      for (const modelName of PRISMA_MODEL_NAMES) {
        const model = prismaMock[modelName]
        expect(model.findMany).toBeTypeOf('function')
        expect(model.findFirst).toBeTypeOf('function')
        expect(model.findUnique).toBeTypeOf('function')
        expect(model.create).toBeTypeOf('function')
        expect(model.update).toBeTypeOf('function')
        expect(model.delete).toBeTypeOf('function')
        expect(model.count).toBeTypeOf('function')
      }
    })

    it('[TEST-MFR-002] should ensure prisma mock $transaction executes callback with same mock', async () => {
      const localPrisma = createPrismaMock()
      localPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' })

      const result = await localPrisma.$transaction(async (tx) => {
        const user = await tx.user.findFirst({ where: { id: 'user-1' } })
        return {
          txIsSameObject: tx === localPrisma,
          userId: (user as { id: string }).id,
        }
      })

      expect(result).toEqual({ txIsSameObject: true, userId: 'user-1' })
    })

    it('[TEST-MFR-003] should ensure prisma mock $transaction resolves array operations', async () => {
      const result = await prismaMock.$transaction([Promise.resolve('a'), Promise.resolve('b')])
      expect(result).toEqual(['a', 'b'])
    })

    it('[TEST-MFR-004] should ensure session mock supports all 8 roles and school assignment rules', () => {
      const roles = Object.values(Role)
      expect(roles).toHaveLength(8)

      for (const role of roles) {
        const session = mockSession(role)
        expect(session.user.role).toBe(role)
        if (role === Role.SUPER_ADMIN) {
          expect(session.user.schoolId).toBeNull()
        } else {
          expect(session.user.schoolId).toBe('test-school-id')
        }
      }
    })

    it('[TEST-MFR-005] should ensure session helpers provide no-session and expired-session states', () => {
      expect(mockNoSession()).toBeNull()
      const expired = mockExpiredSession(Role.TEACHER)
      expect(new Date(expired.expires).getTime()).toBeLessThan(Date.now())
    })

    it('[TEST-MFR-006] should ensure redis mock supports get/set/del/exists/expire', async () => {
      await expect(redisMock.get('key-a')).resolves.toBeNull()
      await expect(redisMock.set('key-a', 'value-a', 60)).resolves.toBe('OK')
      await expect(redisMock.get('key-a')).resolves.toBe('value-a')
      await expect(redisMock.exists('key-a')).resolves.toBe(1)
      await expect(redisMock.expire('key-a', 1)).resolves.toBe(1)
      await expect(redisMock.del('key-a')).resolves.toBe(1)
      await expect(redisMock.exists('key-a')).resolves.toBe(0)
    })

    it('[TEST-MFR-007] should ensure redis mock can simulate failures on get/set', async () => {
      setRedisFailure({ get: true })
      await expect(redisMock.get('key-b')).rejects.toThrow('Mock Redis GET failure')

      setRedisFailure({ set: true })
      await expect(redisMock.set('key-b', 'value-b')).rejects.toThrow('Mock Redis SET failure')
    })

    it('[TEST-MFR-008] should ensure r2 mock upload returns a deterministic mock URL', async () => {
      await expect(uploadFile('reports/term-1.pdf')).resolves.toBe(
        'https://mock.r2.local/test-bucket/reports/term-1.pdf'
      )

      configureR2Mock({ baseUrl: 'https://cdn.test.local', bucket: 'school-files' })
      await expect(uploadFile('photos/student.png')).resolves.toBe(
        'https://cdn.test.local/school-files/photos/student.png'
      )
    })

    it('[TEST-MFR-009] should ensure next/headers mock returns configurable headers object', async () => {
      setMockHeaders({
        'x-school-id': 'school-1',
        'x-request-id': 'req-123',
      })

      const headers = await nextHeaders()
      expect(headers.get('x-school-id')).toBe('school-1')
      expect(headers.get('x-request-id')).toBe('req-123')
    })

    it('[TEST-MFR-010] should ensure school fixture has baseline tenant metadata', () => {
      expect(testSchool.id).toBe('test-school-id')
      expect(testSchool.slug).toBe('test-school')
      expect(testSchool.is_active).toBe(true)
    })

    it('[TEST-MFR-011] should ensure users fixture contains all 8 roles', () => {
      expect(testUsers).toHaveLength(8)
      expect(Object.keys(testUsersByRole)).toHaveLength(8)
      expect(testUsersByRole.SUPER_ADMIN.school_id).toBeNull()
      expect(testUsersByRole.TEACHER.school_id).toBe('test-school-id')
    })

    it('[TEST-MFR-012] should ensure students fixture includes class and academic year references', () => {
      expect(testStudents.length).toBeGreaterThan(0)
      for (const student of testStudents) {
        expect(student.class.id).toBe(student.class_id)
        expect(student.academic_year.id).toBe(student.academic_year_id)
        expect(student.school_id).toBe('test-school-id')
      }
    })

    it('[TEST-MFR-013] should ensure staff fixture includes linked user account data', () => {
      expect(testStaff.length).toBeGreaterThan(0)
      for (const staff of testStaff) {
        expect(staff.user.id).toBe(staff.user_id)
        expect(staff.user.email).toContain('@')
        expect(staff.school_id).toBe('test-school-id')
      }
    })

    it('[TEST-MFR-014] should ensure fee fixtures include structures and payments', () => {
      expect(testFeeStructures.length).toBeGreaterThan(0)
      expect(testFeePayments.length).toBeGreaterThan(0)
      expect(testFeePayments[0].fee_structure_id).toBe(testFeeStructures[0].id)
      expect(testFeePayments[0].receipt_number).toContain('RCP-')
    })

    it('[TEST-MFR-015] should ensure academic fixtures include years, terms, and classes', () => {
      expect(testAcademicYears.length).toBeGreaterThan(0)
      expect(testTerms.length).toBeGreaterThan(0)
      expect(testClasses.length).toBeGreaterThan(0)
      expect(testAcademicYears.some((year) => year.is_current)).toBe(true)
    })

    it('[TEST-MFR-016] should ensure session role fixture map includes all roles', () => {
      expect(Object.keys(mockSessionUsersByRole)).toHaveLength(8)
      expect(mockSessionUsersByRole.SUPER_ADMIN.schoolId).toBeNull()
      expect(mockSessionUsersByRole.PARENT.schoolId).toBe('test-school-id')
    })
  })
})
