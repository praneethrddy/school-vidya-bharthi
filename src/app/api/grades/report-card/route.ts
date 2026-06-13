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
    
    if (!queryExamId) {
      return NextResponse.json({ error: 'exam_id is required' }, { status: 400 })
    }

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
      if (!parent) return NextResponse.json({ error: 'Parent record not found' }, { status: 404 })

      if (queryStudentId) {
        const relationship = await prisma.studentParent.findFirst({
          where: { parent_id: parent.id, student_id: queryStudentId, school_id: schoolId }
        })
        if (!relationship) return NextResponse.json({ error: 'Unauthorized to view this student' }, { status: 403 })
        studentIdToFetch = queryStudentId
      } else {
        const firstChild = await prisma.studentParent.findFirst({
          where: { parent_id: parent.id, school_id: schoolId },
          orderBy: { created_at: 'asc' }
        })
        if (!firstChild) return NextResponse.json({ error: 'No linked children found' }, { status: 404 })
        studentIdToFetch = firstChild.student_id
      }
    }

    if (!studentIdToFetch) return NextResponse.json({ error: 'Target student not identified' }, { status: 400 })

    // Fetch School Info
    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    })

    // Fetch Student Info
    const studentInfo = await prisma.student.findUnique({
      where: { id: studentIdToFetch },
      include: { class: true }
    })

    // Get grading scheme
    const settingRecord = await prisma.schoolSetting.findFirst({
      where: { school_id: schoolId, setting_key: 'grading_scheme' }
    })
    const gradingScheme = settingRecord?.setting_value || 'PERCENTAGE'

    const exam = await prisma.exam.findFirst({
      where: { id: queryExamId, school_id: schoolId },
      include: {
        term: true,
        exam_subjects: { include: { subject: true } }
      }
    })

    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

    const grades = await prisma.grade.findMany({
      where: {
        school_id: schoolId,
        student_id: studentIdToFetch,
        exam_id: exam.id
      }
    })

    let totalObtained = 0
    let totalMax = 0
    let hasFailedSubject = false

    const subjects = exam.exam_subjects.map((es) => {
      const gradeRecord = grades.find((g) => g.subject_id === es.subject_id)
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
    const overallGrade = hasFailedSubject ? 'F' : calculateGrade(percentage)

    // Send formatted data back for client-side PDF generation or preview
    // In a full implementation, we could generate the PDF here and upload it to R2
    return NextResponse.json({ 
      reportCardData: {
        schoolName: school?.name || 'School Name',
        studentName: studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : 'Unknown',
        className: studentInfo?.class ? `${studentInfo.class.name} ${studentInfo.class.section || ''}`.trim() : 'Unknown',
        rollNumber: studentInfo?.roll_number || 'N/A',
        examName: exam.name,
        termName: exam.term.name,
        subjects,
        total_obtained: totalObtained,
        total_max: totalMax,
        percentage,
        overall_grade: overallGrade,
        grading_scheme: gradingScheme
      }
    })

  } catch (error: any) {
    console.error('Report Card GET API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
