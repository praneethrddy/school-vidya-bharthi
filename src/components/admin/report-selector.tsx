'use client'

import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface ReportSelectorItem {
  id: string
  title: string
  description: string
  icon: LucideIcon
  available: boolean
}

interface ReportSelectorProps {
  items: ReportSelectorItem[]
  selectedId: string
  onSelect: (id: string) => void
}

export function ReportSelector({ items, selectedId, onSelect }: ReportSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items
        .filter((item) => item.available)
        .map((item) => {
          const Icon = item.icon
          const active = selectedId === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="text-left"
            >
              <Card
                className={cn(
                  'h-full border transition-all hover:-translate-y-0.5 hover:shadow-md',
                  active ? 'border-primary shadow-md ring-2 ring-primary/15' : 'border-border'
                )}
              >
                <CardHeader className="space-y-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl',
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-primary">
                    {active ? 'Selected report' : 'Open report'}
                  </p>
                </CardContent>
              </Card>
            </button>
          )
        })}
    </div>
  )
}
