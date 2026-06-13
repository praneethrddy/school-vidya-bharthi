import { prisma } from './prisma'

export async function validateParentChildAccess(
  parentUserId: string,
  studentId: string,
  schoolId: string
): Promise<boolean> {
  const link = await prisma.studentParent.findFirst({
    where: {
      school_id: schoolId,
      student_id: studentId,
      parent: { user_id: parentUserId },
    },
  })
  return !!link
}

export async function getParentChildren(parentUserId: string, schoolId: string) {
  return prisma.studentParent.findMany({
    where: {
      school_id: schoolId,
      parent: { user_id: parentUserId },
    },
    include: {
      student: {
        include: {
          class: true,
        },
      },
    },
    orderBy: { is_primary: 'desc' },
  })
}
