"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Users, CheckCircle2, XCircle, TrendingUp, ArrowUp, ArrowDown } from "lucide-react"

interface GradeSummaryProps {
  summary: {
    total_students: number
    entered: number
    pending: number
    pass_count: number
    fail_count: number
    highest: number
    lowest: number
    average: number | string
    class_pass_percentage: number | string
  }
}

export function GradeSummary({ summary }: GradeSummaryProps) {
  const enteredPercentage = summary.total_students > 0 
    ? (summary.entered / summary.total_students) * 100 
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Entries Progress</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{summary.entered}</h3>
                <span className="text-sm text-muted-foreground">/ {summary.total_students}</span>
              </div>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <Progress value={enteredPercentage} className="h-2 mt-4" />
          <p className="text-xs text-muted-foreground mt-2">{summary.pending} remaining</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Pass Rate</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{summary.class_pass_percentage}%</h3>
                <span className="text-sm text-green-600 font-medium">({summary.pass_count} passed)</span>
              </div>
            </div>
            <div className="p-2 bg-green-50 text-green-600 rounded-full">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex gap-1 h-2 w-full mt-4 rounded-full overflow-hidden">
            <div style={{ width: `${summary.class_pass_percentage}%` }} className="bg-green-500 h-full" />
            <div style={{ width: `${100 - Number(summary.class_pass_percentage)}%` }} className="bg-red-400 h-full" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{summary.fail_count} failed</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Average Marks</p>
              <h3 className="text-2xl font-bold">{summary.average}</h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-full">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              Highest: <span className="font-medium text-foreground ml-1">{summary.highest}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
              Lowest: <span className="font-medium text-foreground ml-1">{summary.lowest}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2 pt-6 px-6">
           <CardTitle className="text-sm font-medium">Grade Metrics Info</CardTitle>
        </CardHeader>
        <CardContent className="px-6 text-sm text-muted-foreground pb-6">
           <p>Metrics auto-update as you enter marks. Passes are visually highlighted in green.</p>
           <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
             <div className="flex items-center">
               <span className="w-2 h-2 rounded-full bg-green-500 mr-2" /> Passed
             </div>
             <div className="flex items-center">
               <span className="w-2 h-2 rounded-full bg-red-400 mr-2" /> Failed
             </div>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
