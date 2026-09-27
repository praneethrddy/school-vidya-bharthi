'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
import { BarChart2 } from 'lucide-react'

export function SubjectChart({ subjects }: { subjects: any[] }) {
  const data = subjects.map(s => ({
    name: s.subject_name.substring(0, 8) + (s.subject_name.length > 8 ? '...' : ''),
    fullName: s.subject_name,
    obtained: s.marks_obtained || 0,
    max: s.max_marks,
    passing: s.passing_marks
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <BarChart2 className="w-5 h-5" />
          Subject-wise Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-popover text-popover-foreground border bg-background p-3 rounded-md shadow-md text-sm">
                        <p className="font-bold mb-1">{data.fullName}</p>
                        <p className="text-primary">Obtained: {data.obtained}</p>
                        <p className="text-muted-foreground">Max: {data.max}</p>
                        <p className="text-amber-500">Passing: {data.passing}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="obtained" name="Marks Obtained" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
