import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard-service'

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

    const payload = await getDashboardData(userId, schoolId, role, queryStudentId)

    return NextResponse.json(payload)

  } catch (error: any) {
    console.error('Dashboard Student API Error:', error)
    if (error.message === 'Unauthorized to view this student' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
