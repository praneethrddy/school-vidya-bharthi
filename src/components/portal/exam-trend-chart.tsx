'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

export function ExamTrendChart({ exams }: { exams: any[] }) {
  // Sort exams by start_date ascending for timeline trend
  const sortedExams = [...exams]
    .sort((a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime())
    .map(e => ({
      name: e.name,
      percentage: e.percentage
    }))

  if (sortedExams.length < 2) return null // Hide chart if not enough data to show a trend

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Academic Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedExams} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover text-popover-foreground border border-border p-2 rounded-md shadow-md text-sm">
                        <p className="font-semibold">{payload[0].payload.name}</p>
                        <p className="text-primary font-bold">{payload[0].value}%</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line 
                type="monotone" 
                dataKey="percentage" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
