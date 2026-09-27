import { createBulkNotifications } from './notification-service'
import { prisma } from './prisma'
import { redis } from './redis'
import { logger } from './logger'

const attendanceReminderRuns = new Set<string>()
const feeReminderRuns = new Set<string>()

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getAttendanceRunKey(schoolId: string): string {
  return `${schoolId}:${getTodayKey()}`
}

function getFeeRunKey(schoolId: string): string {
  return `${schoolId}:${getTodayKey()}`
}

export function setupCronJobs(): void {
  logger.info('[Cron] Cron jobs setup')
}

export async function runDailyAttendanceReminder(): Promise<void> {
  try {
    const activeSchools = await prisma.school.findMany({
      where: {
        is_active: true,
      },
    })

    for (const school of activeSchools) {
      const runKey = getAttendanceRunKey(school.id)
      if (attendanceReminderRuns.has(runKey)) {
        continue
      }

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(startOfDay)
      endOfDay.setDate(endOfDay.getDate() + 1)

      const absences = await prisma.attendance.findMany({
        where: {
          school_id: school.id,
          status: 'ABSENT',
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      })

      if (!absences.length) {
        attendanceReminderRuns.add(runKey)
        continue
      }

      const parentLinks = await prisma.studentParent.findMany({
        where: {
          school_id: school.id,
          student_id: {
            in: Array.from(new Set(absences.map((absence) => absence.student_id))),
          },
        },
      })

      const notifications = parentLinks
        .map((link: any) => link.parent?.user_id)
        .filter((userId: string | null | undefined): userId is string => Boolean(userId))
        .map((userId) => ({
          school_id: school.id,
          user_id: userId,
          title: 'Attendance Alert',
          message: 'Your child was marked absent today. Please review the attendance entry.',
          type: 'ATTENDANCE' as const,
          link: '/attendance',
        }))

      if (notifications.length > 0) {
        await createBulkNotifications(notifications)
      }

      attendanceReminderRuns.add(runKey)
    }
  } catch (error) {
    logger.error({ error }, 'Daily attendance reminder failed')
  }
}

export async function runFeeOverdueCheck(): Promise<void> {
  try {
    const activeSchools = await prisma.school.findMany({
      where: {
        is_active: true,
      },
    })

    for (const school of activeSchools) {
      const runKey = getFeeRunKey(school.id)
      if (feeReminderRuns.has(runKey)) {
        continue
      }

      const now = new Date()
      const dueSoon = new Date(now)
      dueSoon.setDate(dueSoon.getDate() + 3)

      const upcomingStructures = await prisma.feeStructure.findMany({
        where: {
          school_id: school.id,
          due_date: {
            gte: now,
            lte: dueSoon,
          },
        },
      })

      const notifications = upcomingStructures.map((structure: any) => ({
        school_id: school.id,
        user_id: structure.student_user_id || structure.class_id,
        title: 'Fee Reminder',
        message: 'A fee payment is due soon. Please clear the outstanding balance before the due date.',
        type: 'FEE' as const,
        link: '/fees',
      }))

      if (notifications.length > 0) {
        await createBulkNotifications(notifications)
      }

      feeReminderRuns.add(runKey)
    }
  } catch (error) {
    logger.error({ error }, 'Fee overdue check failed')
  }
}

export async function runCacheCleanup(): Promise<void> {
  try {
    const keys = (await redis.keys('cache:*')) || []

    await Promise.all(keys.map((key) => redis.del(key)))
  } catch (error) {
    logger.error({ error }, 'Cache cleanup failed')
  }
}

export async function runDatabaseBackup(): Promise<void> {
  logger.info('[Cron] Database backup (stub)')
}
