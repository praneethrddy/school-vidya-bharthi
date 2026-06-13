import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGrade } from '@/lib/grades-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role, schoolId, id: userId } = session.user
    if (!schoolId) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    if (role !== 'STUDENT' && role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const queryStudentId = searchParams.get('student_id')
    const queryExamId = searchParams.get('exam_id')
    const queryTermId = searchParams.get('term_id')
    const queryAcademicYearId = searchParams.get('academic_year_id')

    let studentIdToFetch: string | undefined

    if (role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { user_id: userId, school_id: schoolId }
      })
      if (!student) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
      }
      studentIdToFetch = student.id
    } else if (role === 'PARENT') {
      const parent = await prisma.parent.findFirst({
        where: { user_id: userId, school_id: schoolId }
      })
      if (!parent) {
        return NextResponse.json({ error: 'Parent record not found' }, { status: 404 })
      }

      if (queryStudentId) {
        const relationship = await prisma.studentParent.findFirst({
          where: { parent_id: parent.id, student_id: queryStudentId, school_id: schoolId }
        })
        if (!relationship) {
          return NextResponse.json({ error: 'Unauthorized to view this student' }, { status: 403 })
        }
        studentIdToFetch = queryStudentId
      } else {
        const firstChild = await prisma.studentParent.findFirst({
          where: { parent_id: parent.id, school_id: schoolId },
          orderBy: { created_at: 'asc' }
        })
        if (!firstChild) {
          return NextResponse.json({ error: 'No linked children found' }, { status: 404 })
        }
        studentIdToFetch = firstChild.student_id
      }
    }

    if (!studentIdToFetch) {
      return NextResponse.json({ error: 'Target student not identified' }, { status: 400 })
    }

    // Get grading scheme
    const settingRecord = await prisma.schoolSetting.findFirst({
      where: { school_id: schoolId, setting_key: 'grading_scheme' }
    })
    const gradingScheme = settingRecord?.setting_value || 'PERCENTAGE'

    // Fetch exams
    const examsWhere: any = { school_id: schoolId }
    if (queryExamId) examsWhere.id = queryExamId
    if (queryTermId) examsWhere.term_id = queryTermId
    if (queryAcademicYearId) examsWhere.academic_year_id = queryAcademicYearId

    const exams = await prisma.exam.findMany({
      where: examsWhere,
      include: {
        term: true,
        exam_subjects: {
          include: {
            subject: true
          }
        }
      },
      orderBy: { start_date: 'desc' }
    })

    // Fetch grades for this student
    const grades = await prisma.grade.findMany({
      where: {
        school_id: schoolId,
        student_id: studentIdToFetch,
        exam_id: { in: exams.map((e) => e.id) }
      }
    })

    const payloadExams = exams.map((exam) => {
      let totalObtained = 0
      let totalMax = 0
      let hasFailedSubject = false

      const subjects = exam.exam_subjects.map((es) => {
        const gradeRecord = grades.find((g) => g.exam_id === exam.id && g.subject_id === es.subject_id)
        const marksObtained = gradeRecord && gradeRecord.marks_obtained !== null ? Number(gradeRecord.marks_obtained) : null
        
        let isPassed = false
        if (marksObtained !== null) {
          isPassed = marksObtained >= es.passing_marks
          if (!isPassed) hasFailedSubject = true
          totalObtained += marksObtained
          totalMax += es.max_marks
        }

        return {
          subject_name: es.subject.name,
          subject_code: es.subject.code || '',
          max_marks: es.max_marks,
          passing_marks: es.passing_marks,
          marks_obtained: marksObtained,
          grade: gradeRecord?.grade || null,
          remarks: gradeRecord?.remarks || null,
          is_passed: isPassed
        }
      })

      const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(1)) : 0
      let overallGrade = ''
      
      if (hasFailedSubject) {
        overallGrade = 'F'
      } else {
        overallGrade = calculateGrade(percentage)
      }

      return {
        id: exam.id,
        name: exam.name,
        term: exam.term.name,
        start_date: exam.start_date ? exam.start_date.toISOString() : null,
        end_date: exam.end_date ? exam.end_date.toISOString() : null,
        subjects,
        total_obtained: totalObtained,
        total_max: totalMax,
        percentage,
        overall_grade: overallGrade,
        grading_scheme: gradingScheme
      }
    })

    return NextResponse.json({ exams: payloadExams })

  } catch (error: any) {
    console.error('Grades GET API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
