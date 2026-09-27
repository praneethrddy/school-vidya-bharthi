import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <Card className="border-white/70 bg-white/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)] backdrop-blur">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Icon className="h-6 w-6" />
          </div>
          <ArrowUpRight className="h-5 w-5 text-slate-300" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
