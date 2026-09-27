"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

// A placeholder for Feature 26 (Advanced Reports) as requested in planning.md

export function MonthlyAttendanceReport() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Attendance Report (Preview)</CardTitle>
        <CardDescription>View a comprehensive grid of attendance across the month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-muted/10">
           <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mb-4" />
           <h3 className="text-lg font-medium text-muted-foreground">Component under construction</h3>
           <p className="text-sm text-muted-foreground mt-2 max-w-sm">
             The monthly report grid (students × dates) will be fully implemented and integrated here. Exporting to PDF/Excel will be added in Feature 26.
           </p>
        </div>
      </CardContent>
    </Card>
  )
}
