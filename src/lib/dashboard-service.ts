import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { getFeesData } from '@/lib/fee-service'

export async function getDashboardData(userId: string, schoolId: string, role: string, queryStudentId?: string | null) {
  let studentIdToFetch: string | undefined

  if (role === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { user_id: userId, school_id: schoolId }
    })
    if (!student) throw new Error('Student record not found')
    studentIdToFetch = student.id
  } else if (role === 'PARENT') {
    const parent = await prisma.parent.findFirst({
      where: { user_id: userId, school_id: schoolId }
    })
    if (!parent) throw new Error('Parent record not found')

    if (queryStudentId) {
      const relationship = await prisma.studentParent.findFirst({
        where: { parent_id: parent.id, student_id: queryStudentId, school_id: schoolId }
      })
      if (!relationship) throw new Error('Unauthorized to view this student')
      studentIdToFetch = queryStudentId
    } else {
      const firstChild = await prisma.studentParent.findFirst({
        where: { parent_id: parent.id, school_id: schoolId },
        orderBy: { created_at: 'asc' }
      })
      if (!firstChild) throw new Error('No linked children found')
      studentIdToFetch = firstChild.student_id
    }
  }

  if (!studentIdToFetch) throw new Error('Target student not identified')

  const cacheKey = `dashboard:student:${studentIdToFetch}`
  
  try {
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)
  } catch (error) {
    console.warn('Redis read error:', error)
  }

  const studentData = await prisma.student.findUnique({
    where: { id: studentIdToFetch },
    include: { class: true, academic_year: true }
  })

  if (!studentData || studentData.school_id !== schoolId) {
     throw new Error('Student not found in this school')
  }

  const announcements = await prisma.announcement.findMany({
    where: { 
      school_id: schoolId, 
      is_published: true,
      target_audience: { in: ['ALL', role === 'STUDENT' ? 'STUDENTS' : 'PARENTS'] }
    },
    orderBy: { published_at: 'desc' },
    take: 5,
    select: { id: true, title: true, type: true, published_at: true }
  })
  // -----------------------------------------------------
  // Fetch Attendance Summary for the current Academic Year
  // -----------------------------------------------------
  let attendance_summary = null
  if (studentData.academic_year) {
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        school_id: schoolId,
        student_id: studentIdToFetch,
        date: {
          gte: studentData.academic_year.start_date,
          lte: studentData.academic_year.end_date
        }
      },
      select: { status: true }
    })
    
    const present = attendanceRecords.filter(r => r.status === 'PRESENT').length
    const absent = attendanceRecords.filter(r => r.status === 'ABSENT').length
    const late = attendanceRecords.filter(r => r.status === 'LATE').length
    const half_day = attendanceRecords.filter(r => r.status === 'HALF_DAY').length
    const total_days = attendanceRecords.length
    
    let percentage = 0
    if (total_days > 0) {
      percentage = Number((((present + late + half_day) / total_days) * 100).toFixed(1))
    }

    attendance_summary = {
      percentage,
      present,
      absent,
      late,
      half_day,
      total_days
    }
  }

  // -----------------------------------------------------
  // Fetch Grades Summary for the latest exam
  // -----------------------------------------------------
  let grade_summary = null
  if (studentData.academic_year && studentData.class_id) {
    const exams = await prisma.exam.findMany({
      where: {
        school_id: schoolId,
        academic_year_id: studentData.academic_year.id,
        class_id: studentData.class_id
      },
      orderBy: { start_date: 'desc' },
      take: 1,
      include: { exam_subjects: true }
    })

    if (exams.length > 0) {
      const latestExam = exams[0]
      const grades = await prisma.grade.findMany({
        where: { school_id: schoolId, student_id: studentIdToFetch, exam_id: latestExam.id }
      })

      let totalObtained = 0
      let totalMax = 0
      let hasFailedSubject = false

      latestExam.exam_subjects.forEach((es: any) => {
        const gradeRecord = grades.find((g: any) => g.subject_id === es.subject_id)
        if (gradeRecord && gradeRecord.marks_obtained !== null) {
          const marks = Number(gradeRecord.marks_obtained)
          totalObtained += marks
          totalMax += es.max_marks
          if (marks < es.passing_marks) hasFailedSubject = true
        }
      })

      if (totalMax > 0) {
        const percentage = Number(((totalObtained / totalMax) * 100).toFixed(1))
        let overallGrade = 'F'
        
        if (!hasFailedSubject) {
          if (percentage >= 90) overallGrade = 'A+'
          else if (percentage >= 80) overallGrade = 'A'
          else if (percentage >= 70) overallGrade = 'B'
          else if (percentage >= 60) overallGrade = 'C'
          else if (percentage >= 50) overallGrade = 'D'
        }

        const settingRecord = await prisma.schoolSetting.findFirst({
          where: { school_id: schoolId, setting_key: 'grading_scheme' }
        })
        const gradingScheme = settingRecord?.setting_value || 'PERCENTAGE'
        
        grade_summary = {
          last_exam: latestExam.name,
          percentage,
          overall_grade: overallGrade,
          grading_scheme: gradingScheme
        }
      }
    }
  }

  let fee_summary = null
  try {
    const feeData = await getFeesData(userId, schoolId, role, studentIdToFetch, studentData.academic_year?.id)
    fee_summary = feeData.fee_summary
  } catch (err) {
    console.warn("Could not fetch fee summary for dashboard:", err)
  }

  const payload = {
    student: {
      id: studentData.id,
      name: `${studentData.first_name} ${studentData.last_name}`,
      class: studentData.class ? `${studentData.class.name} ${studentData.class.section || ''}`.trim() : 'Unassigned',
      roll_number: studentData.roll_number,
      photo_url: studentData.photo_url,
      academic_year: studentData.academic_year?.name || 'N/A'
    },
    attendance_summary,
    fee_summary,
    grade_summary,
    homework_summary: null,
    announcements,
  }

  try {
     await redis.set(cacheKey, JSON.stringify(payload), 300)
  } catch (error) {
     console.warn('Redis write error:', error)
  }

  return payload
}
