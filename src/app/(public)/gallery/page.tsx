import type { Metadata } from 'next'
import GalleryGrid from '@/components/public/gallery-grid'
import SectionHeader from '@/components/public/section-header'
import { buildPublicMetadata, getPublicGalleryAlbums } from '@/lib/public-site'

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({
    title: 'Gallery - Vidhya Bharthi High School',
    description:
      'Browse published school albums, event highlights, and photo memories from Vidhya Bharthi High School.',
    path: '/gallery',
  })
}

export default async function GalleryPage() {
  const data = await getPublicGalleryAlbums()

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Gallery"
        as="h1"
        title="Published moments from campus life, events, and celebrations."
        description="Albums shown here are public-only and filtered to the current school context."
      />
      <div className="mt-10">
        <GalleryGrid albums={data.albums} />
      </div>
    </div>
  )
}
