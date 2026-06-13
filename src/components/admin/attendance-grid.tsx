"use client"

import * as React from "react"
import { AttendanceToggle, AttendanceStatus } from "./attendance-toggle"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, MessageSquare, AlertTriangle } from "lucide-react"

export type StudentRecord = {
  student_id: string
  student_name: string
  roll_number: string
  photo_url: string | null
  status: AttendanceStatus | null
  remarks: string | null
  id: string | null
}

interface AttendanceGridProps {
  records: StudentRecord[]
  onChange: (studentId: string, updates: Partial<StudentRecord>) => void
  onMarkAll: (status: AttendanceStatus) => void
  disabled?: boolean
  isMarked: boolean
}

export function AttendanceGrid({ records, onChange, onMarkAll, disabled, isMarked }: AttendanceGridProps) {
  const [showRemarks, setShowRemarks] = React.useState<Record<string, boolean>>({})

  const toggleRemarks = (studentId: string) => {
    setShowRemarks(prev => ({ ...prev, [studentId]: !prev[studentId] }))
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border rounded-lg bg-muted/20">
        <AlertTriangle className="h-8 w-8 mb-4 text-muted-foreground/50" />
        <p>No students found in this class.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {isMarked ? (
            <div className="flex items-center text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Attendance Marked
            </div>
          ) : (
            <div className="flex items-center text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Not yet marked
            </div>
          )}
          <span className="text-sm text-muted-foreground ml-2">({records.length} students)</span>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onMarkAll("PRESENT")}
            disabled={disabled}
            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
          >
            Mark All Present
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onMarkAll("ABSENT")}
            disabled={disabled}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            Mark All Absent
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Roll</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="w-[200px] sm:w-[250px] text-center">Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <React.Fragment key={r.student_id}>
                <TableRow>
                  <TableCell className="text-center font-medium text-muted-foreground">
                    {r.roll_number || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={r.photo_url || undefined} />
                        <AvatarFallback>{r.student_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{r.student_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <AttendanceToggle
                      value={r.status}
                      onChange={(status) => onChange(r.student_id, { status })}
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleRemarks(r.student_id)}
                      className={r.remarks ? "text-blue-500 hover:text-blue-600" : "text-muted-foreground"}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                {showRemarks[r.student_id] && (
                  <TableRow className="bg-muted/30 border-0">
                    <TableCell></TableCell>
                    <TableCell colSpan={3} className="py-2 pb-4">
                      <Input
                        placeholder={`Remarks for ${r.student_name} (optional)...`}
                        value={r.remarks || ""}
                        onChange={(e) => onChange(r.student_id, { remarks: e.target.value })}
                        disabled={disabled}
                        className="max-w-md h-8 text-sm"
                        autoFocus
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
