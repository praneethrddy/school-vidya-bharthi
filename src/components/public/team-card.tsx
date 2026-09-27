import { Card, CardContent } from '@/components/ui/card'
import type { PublicLeader } from '@/lib/public-site'

interface TeamCardProps {
  leader: PublicLeader
}

export default function TeamCard({ leader }: TeamCardProps) {
  return (
    <Card className="overflow-hidden border-white/70 bg-white/90 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)]">
      <CardContent className="p-0">
        <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 via-orange-50 to-sky-100">
          {leader.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={leader.photo_url}
              alt={leader.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl font-semibold text-amber-700">
              {leader.name
                .split(' ')
                .slice(0, 2)
                .map((part) => part[0])
                .join('')}
            </div>
          )}
        </div>
        <div className="space-y-1 p-5">
          <h3 className="text-lg font-semibold text-slate-950">{leader.name}</h3>
          <p className="text-sm text-slate-600">{leader.designation}</p>
        </div>
      </CardContent>
    </Card>
  )
}
