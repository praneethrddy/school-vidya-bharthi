'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardFeeCollectionSummary } from '@/lib/admin-dashboard'
import { buildFeeChartData, formatCurrencyINR } from '@/lib/admin-dashboard-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface FeeCollectionChartProps {
  feeCollection: DashboardFeeCollectionSummary | null
}

export function FeeCollectionChart({ feeCollection }: FeeCollectionChartProps) {
  const chartData = buildFeeChartData(feeCollection)

  if (!feeCollection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fee Collection</CardTitle>
          <CardDescription>Financial insights are not available for this role.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Fee Collection</CardTitle>
        <CardDescription>
          Compare expected fees against collections for the active academic year.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Expected</p>
            <p className="mt-2 text-xl font-semibold">{formatCurrencyINR(feeCollection.total_expected)}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Collected</p>
            <p className="mt-2 text-xl font-semibold">{formatCurrencyINR(feeCollection.total_collected)}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="mt-2 text-xl font-semibold">{formatCurrencyINR(feeCollection.total_outstanding)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Collection progress</span>
            <span className="font-medium">{feeCollection.collection_percentage}%</span>
          </div>
          <Progress value={feeCollection.collection_percentage} className="h-2" />
        </div>

        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={(value: number) => formatCurrencyINR(value)} />
              <Bar dataKey="amount" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <p className="text-sm text-emerald-900 dark:text-emerald-100">This month collected</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
            {formatCurrencyINR(feeCollection.this_month_collected)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
