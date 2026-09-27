'use client'

import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ReportChartProps {
  title: string
  description?: string
  children: ReactNode
  heightClassName?: string
}

export function ReportChart({
  title,
  description,
  children,
  heightClassName = 'h-[280px]',
}: ReportChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className={heightClassName}>{children}</div>
      </CardContent>
    </Card>
  )
}
