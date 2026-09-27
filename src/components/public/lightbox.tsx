'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { PublicGalleryItem } from '@/lib/public-site'

interface LightboxProps {
  items: PublicGalleryItem[]
  selectedIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrevious: () => void
  onNext: () => void
}

export default function Lightbox({
  items,
  selectedIndex,
  open,
  onOpenChange,
  onPrevious,
  onNext,
}: LightboxProps) {
  const activeItem = items[selectedIndex]

  if (!activeItem) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-slate-800 bg-slate-950 p-3 text-white sm:p-6">
        <DialogTitle className="sr-only">{activeItem.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Lightbox preview for {activeItem.title}
        </DialogDescription>
        <div className="relative overflow-hidden rounded-3xl bg-slate-900">
          {activeItem.file_type === 'VIDEO' ? (
            <video
              src={activeItem.file_url}
              className="max-h-[75vh] w-full rounded-3xl object-contain"
              controls
              autoPlay
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeItem.file_url}
              alt={activeItem.title}
              className="max-h-[75vh] w-full rounded-3xl object-contain"
            />
          )}

          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={onPrevious}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={onNext}
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-4 top-4 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
            aria-label="Close lightbox"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-1 px-2">
          <p className="text-lg font-semibold text-white">{activeItem.title}</p>
          {activeItem.description ? (
            <p className="text-sm text-slate-300">{activeItem.description}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
