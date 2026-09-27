import { successResponse } from '@/lib/api-helpers'
import { getPublicGalleryAlbums } from '@/lib/public-site'

export async function GET() {
  const { school, albums } = await getPublicGalleryAlbums()

  return successResponse({
    school,
    albums,
  })
}
