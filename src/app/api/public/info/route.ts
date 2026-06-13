import { successResponse } from '@/lib/api-helpers'
import { getPublicSchoolInfo } from '@/lib/public-site'

export async function GET() {
  const school = await getPublicSchoolInfo()

  return successResponse({
    school,
  })
}
