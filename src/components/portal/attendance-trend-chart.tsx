'use client'

import * as React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface TrendData {
  month: string
  percentage: number
}

interface AttendanceTrendChartProps {
  data: TrendData[]
  isLoading?: boolean
}

export function AttendanceTrendChart({ data, isLoading }: AttendanceTrendChartProps) {
  if (isLoading) {
    return (
      <Card className="shadow-sm h-[350px]">
        <CardHeader>
          <CardTitle>Attendance Trend</CardTitle>
          <CardDescription>Loading historical data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <div className="animate-pulse bg-muted rounded w-full h-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="shadow-sm h-[350px]">
        <CardHeader>
          <CardTitle>Attendance Trend</CardTitle>
          <CardDescription>Historical monthly attendance</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6 h-[220px]">
          <div className="text-muted-foreground text-center flex flex-col items-center">
            <span className="block mb-2 text-3xl">📊</span>
            No trend data available for this academic year yet.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm h-[350px]">
      <CardHeader>
        <CardTitle>Attendance Trend</CardTitle>
        <CardDescription>Academic year percentage by month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number) => [`${value}%`, 'Attendance']}
              />
              <Line 
                type="monotone" 
                dataKey="percentage" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
