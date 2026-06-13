'use client'

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportChart } from '@/components/admin/report-chart'
import { formatCurrencyINR } from '@/lib/admin-dashboard-ui'
import type { FinancialReport } from '@/lib/report-types'

const PAGE_SIZE = 8

interface FinancialReportViewProps {
  report: FinancialReport
}

export function FinancialReportView({ report }: FinancialReportViewProps) {
  const [classPage, setClassPage] = useState(1)
  const [categoryPage, setCategoryPage] = useState(1)

  const classTotalPages = Math.max(1, Math.ceil(report.data.class_wise_collection.length / PAGE_SIZE))
  const categoryTotalPages = Math.max(1, Math.ceil(report.data.category_wise_collection.length / PAGE_SIZE))

  const paginatedClasses = report.data.class_wise_collection.slice(
    (classPage - 1) * PAGE_SIZE,
    classPage * PAGE_SIZE
  )
  const paginatedCategories = report.data.category_wise_collection.slice(
    (categoryPage - 1) * PAGE_SIZE,
    categoryPage * PAGE_SIZE
  )

  if (
    report.data.class_wise_collection.length === 0 &&
    report.data.category_wise_collection.length === 0 &&
    report.data.month_wise_trend.length === 0
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
          <CardDescription>No data available for the selected financial period.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expected</CardDescription>
            <CardTitle className="text-xl">{formatCurrencyINR(report.data.total_expected)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Collected</CardDescription>
            <CardTitle className="text-xl">{formatCurrencyINR(report.data.total_collected)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-xl">{formatCurrencyINR(report.data.total_outstanding)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Defaulters</CardDescription>
            <CardTitle className="text-xl">{report.data.defaulter_count}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Progress</CardTitle>
          <CardDescription>
            {report.data.collection_percentage}% collected for the current report scope.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={Math.min(report.data.collection_percentage, 100)} className="h-3" />
          <p className="text-sm text-muted-foreground">
            Defaulter outstanding: {formatCurrencyINR(report.data.total_defaulter_outstanding)}
          </p>
        </CardContent>
      </Card>

      <ReportChart
        title="Monthly Collection Trend"
        description="Month-by-month collections within the selected period."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={report.data.month_wise_trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip formatter={(value: number) => formatCurrencyINR(value)} />
            <Bar dataKey="collected" fill="#ea580c" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ReportChart>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Class-wise Collection</CardTitle>
            <CardDescription>Collection efficiency grouped by class.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClasses.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{formatCurrencyINR(item.expected)}</TableCell>
                    <TableCell>{formatCurrencyINR(item.collected)}</TableCell>
                    <TableCell>{formatCurrencyINR(item.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {classPage} of {classTotalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={classPage === 1}
                  onClick={() => setClassPage(classPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={classPage === classTotalPages}
                  onClick={() => setClassPage(classPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category-wise Collection</CardTitle>
            <CardDescription>Collection efficiency grouped by fee category.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{formatCurrencyINR(item.expected)}</TableCell>
                    <TableCell>{formatCurrencyINR(item.collected)}</TableCell>
                    <TableCell>{formatCurrencyINR(item.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {categoryPage} of {categoryTotalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={categoryPage === 1}
                  onClick={() => setCategoryPage(categoryPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={categoryPage === categoryTotalPages}
                  onClick={() => setCategoryPage(categoryPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
