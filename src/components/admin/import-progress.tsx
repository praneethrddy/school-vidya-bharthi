'use client'

import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ImportProgressProps {
  value: number
  label: string
}

export function ImportProgress({ value, label }: ImportProgressProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="h-4 w-4 animate-spin" />
          Import in Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={value} />
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
