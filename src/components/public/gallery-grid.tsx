'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Images } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Lightbox from '@/components/public/lightbox'
import type { PublicGalleryAlbum, PublicGalleryItem } from '@/lib/public-site'
import { formatDate } from '@/lib/utils'

interface GalleryGridProps {
  albums: PublicGalleryAlbum[]
  previewLimit?: number
}

function flattenAlbumItems(albums: PublicGalleryAlbum[]): PublicGalleryItem[] {
  return albums.flatMap((album) => album.items)
}

export default function GalleryGrid({ albums, previewLimit }: GalleryGridProps) {
  const [selectedAlbumIndex, setSelectedAlbumIndex] = useState(0)
  const [selectedLightboxIndex, setSelectedLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const previewMode = typeof previewLimit === 'number'
  const previewItems = flattenAlbumItems(albums).slice(0, previewLimit)
  const selectedAlbum = albums[selectedAlbumIndex] || null
  const items = previewMode ? previewItems : selectedAlbum?.items || []

  const openLightbox = (index: number) => {
    setSelectedLightboxIndex(index)
    setLightboxOpen(true)
  }

  if (previewMode) {
    if (previewItems.length === 0) {
      return (
        <Card className="border-dashed border-slate-300 bg-white/70">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
            <Images className="h-10 w-10 text-amber-600" />
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-900">Gallery coming soon!</p>
              <p className="text-sm text-slate-600">
                Fresh moments from school life will appear here once the first album is published.
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {previewItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="group overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 text-left shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]"
              onClick={() => openLightbox(index)}
            >
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                {item.file_type === 'VIDEO' ? (
                  <div className="flex h-full items-center justify-center bg-slate-900 text-sm font-medium text-white">
                    Video highlight
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.file_url}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="space-y-1 p-4">
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="text-sm text-slate-600">
                  {item.description || 'Tap to open the full-size preview.'}
                </p>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-8">
          <Button asChild variant="outline" className="border-slate-300 bg-white/80">
            <Link href="/gallery">View full gallery</Link>
          </Button>
        </div>
        <Lightbox
          items={previewItems}
          selectedIndex={selectedLightboxIndex}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          onPrevious={() =>
            setSelectedLightboxIndex((current) =>
              current === 0 ? previewItems.length - 1 : current - 1
            )
          }
          onNext={() =>
            setSelectedLightboxIndex((current) =>
              current === previewItems.length - 1 ? 0 : current + 1
            )
          }
        />
      </>
    )
  }

  if (albums.length === 0 || !selectedAlbum) {
    return (
      <Card className="border-dashed border-slate-300 bg-white/70">
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
          <Images className="h-10 w-10 text-amber-600" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-slate-900">Gallery coming soon!</p>
            <p className="text-sm text-slate-600">
              Published albums will appear here for parents, students, and visitors.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          {albums.map((album, index) => (
            <button
              key={album.id}
              type="button"
              onClick={() => setSelectedAlbumIndex(index)}
              className={`w-full overflow-hidden rounded-[1.75rem] border text-left transition ${
                index === selectedAlbumIndex
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xl'
                  : 'border-white/70 bg-white/85 text-slate-900 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]'
              }`}
            >
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                {album.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.cover_image_url}
                    alt={album.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium">
                    Album cover coming soon
                  </div>
                )}
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <p className="text-lg font-semibold">{album.name}</p>
                  <p className={index === selectedAlbumIndex ? 'text-slate-300' : 'text-slate-600'}>
                    {album.description || 'Celebrating school life through snapshots and stories.'}
                  </p>
                </div>
                <div
                  className={`flex flex-wrap gap-3 text-sm ${
                    index === selectedAlbumIndex ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(album.event_date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Images className="h-4 w-4" />
                    {album.photo_count} items
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] sm:p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-slate-950">{selectedAlbum.name}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {selectedAlbum.description || 'A published collection from campus life.'}
              </p>
            </div>
            <p className="text-sm text-slate-500">{selectedAlbum.photo_count} memories</p>
          </div>

          <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="group mb-4 block w-full overflow-hidden rounded-[1.5rem] bg-slate-100 text-left"
                onClick={() => openLightbox(index)}
              >
                {item.file_type === 'VIDEO' ? (
                  <div className="flex aspect-[4/3] items-center justify-center bg-slate-900 text-sm font-medium text-white">
                    Play video
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.file_url}
                    alt={item.title}
                    className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Lightbox
        items={items}
        selectedIndex={selectedLightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onPrevious={() =>
          setSelectedLightboxIndex((current) => (current === 0 ? items.length - 1 : current - 1))
        }
        onNext={() =>
          setSelectedLightboxIndex((current) => (current === items.length - 1 ? 0 : current + 1))
        }
      />
    </>
  )
}
