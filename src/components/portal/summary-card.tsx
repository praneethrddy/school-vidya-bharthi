import React from 'react'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface SummaryCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  colorCode?: 'green' | 'yellow' | 'red' | 'default'
  href?: string
  isLoading?: boolean
}

export function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorCode = 'default',
  href,
  isLoading
}: SummaryCardProps) {

  const colorVariants: Record<string, string> = {
    green: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
    yellow: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    default: 'text-primary bg-primary/10',
  }

  const valueColorVariants: Record<string, string> = {
    green: 'text-emerald-600',
    yellow: 'text-amber-600',
    red: 'text-red-600',
    default: 'text-foreground',
  }

  const content = (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 shadow-sm",
      href && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-full", colorVariants[colorCode])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 mt-1">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <>
            <div className={cn("text-2xl font-bold", valueColorVariants[colorCode])}>
              {value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {subtitle}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    )
  }

  return content
}
