import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getFeesData } from '@/lib/fee-service'

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

    const url = new URL(req.url)
    const queryStudentId = url.searchParams.get('student_id')
    const queryAcademicYearId = url.searchParams.get('academic_year_id')

    const data = await getFeesData(userId, schoolId, role, queryStudentId, queryAcademicYearId)

    // Remove all_payments for API contract compliance if needed, but it shouldn't hurt.
    const { all_payments, ...responsePayload } = data

    return NextResponse.json(responsePayload)

  } catch (error: any) {
    console.error('Fees API Error:', error)
    if (error.message.includes('Forbidden') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
