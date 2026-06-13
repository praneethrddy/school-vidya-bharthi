"use client"

import * as React from "react"
import { AttendanceToggle, AttendanceStatus } from "./attendance-toggle"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, MessageSquare, AlertTriangle, Clock } from "lucide-react"
import { format } from "date-fns"

export type StaffRecord = {
  staff_id: string
  employee_code: string | null
  name: string
  department: string | null
  designation: string | null
  photo_url: string | null
  status: AttendanceStatus | 'LEAVE' | null // Staff can also have LEAVE
  check_in: string | null
  check_out: string | null
  remarks: string | null
  id: string | null
}

interface StaffAttendanceGridProps {
  records: StaffRecord[]
  onChange: (staffId: string, updates: Partial<StaffRecord>) => void
  onMarkAll: (status: AttendanceStatus | 'LEAVE') => void
  disabled?: boolean
  isMarked: boolean
}

function parseTimeFromISO(isoString: string | null) {
  if (!isoString) return ""
  const date = new Date(isoString)
  return format(date, "HH:mm")
}

export function StaffAttendanceGrid({ records, onChange, onMarkAll, disabled, isMarked }: StaffAttendanceGridProps) {
  const [showExtras, setShowExtras] = React.useState<Record<string, boolean>>({})

  const toggleExtras = (staffId: string) => {
    setShowExtras(prev => ({ ...prev, [staffId]: !prev[staffId] }))
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border rounded-lg bg-muted/20">
        <AlertTriangle className="h-8 w-8 mb-4 text-muted-foreground/50" />
        <p>No staff members found.</p>
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
              Attendance Captured
            </div>
          ) : (
            <div className="flex items-center text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Not yet marked
            </div>
          )}
          <span className="text-sm text-muted-foreground ml-2">({records.length} staff)</span>
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
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-center">Emp Code</TableHead>
              <TableHead>Staff Member</TableHead>
              <TableHead className="w-[300px] text-center">Status</TableHead>
              <TableHead className="w-12 text-center">Extras</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <React.Fragment key={r.staff_id}>
                <TableRow>
                  <TableCell className="text-center font-medium text-muted-foreground text-xs">
                    {r.employee_code || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={r.photo_url || undefined} />
                        <AvatarFallback>{r.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.designation || r.department || "Staff"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <AttendanceToggle
                        value={r.status as AttendanceStatus} // Casting, LEAVE could be handled separately, but let's reuse
                        onChange={(status) => onChange(r.staff_id, { status })}
                        disabled={disabled}
                      />
                      {/* Let's add a small Leave button if StaffToggle doesn't have it */}
                      <Button
                        type="button"
                        variant={r.status === 'LEAVE' ? "default" : "outline"}
                        size="sm"
                        disabled={disabled}
                        onClick={() => onChange(r.staff_id, { status: "LEAVE" })}
                        className={`h-8 px-2 text-xs border bg-muted/40 ${r.status === 'LEAVE' ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-sm' : 'hover:bg-purple-100 hover:text-purple-700'}`}
                      >
                        LEV
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExtras(r.staff_id)}
                      className={(r.remarks || r.check_in || r.check_out) ? "text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-muted-foreground"}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                {showExtras[r.staff_id] && (
                  <TableRow className="bg-muted/30 border-0">
                    <TableCell></TableCell>
                    <TableCell colSpan={3} className="py-3 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                        <div className="flex flex-col space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Check-in Time</label>
                          <Input
                            type="time"
                            value={parseTimeFromISO(r.check_in)}
                            onChange={(e) => {
                               // Assuming today's date + time
                               const time = e.target.value
                               if (!time) {
                                  onChange(r.staff_id, { check_in: null })
                               } else {
                                  // Construct ISO. This logic will be handled better at submit by combining date+time, but for simplicity store ISO
                                  const tempDate = new Date()
                                  const [h, m] = time.split(':')
                                  tempDate.setHours(parseInt(h), parseInt(m), 0, 0)
                                  onChange(r.staff_id, { check_in: tempDate.toISOString() })
                               }
                            }}
                            disabled={disabled}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Check-out Time</label>
                          <Input
                            type="time"
                            value={parseTimeFromISO(r.check_out)}
                            onChange={(e) => {
                               const time = e.target.value
                               if (!time) {
                                  onChange(r.staff_id, { check_out: null })
                               } else {
                                  const tempDate = new Date()
                                  const [h, m] = time.split(':')
                                  tempDate.setHours(parseInt(h), parseInt(m), 0, 0)
                                  onChange(r.staff_id, { check_out: tempDate.toISOString() })
                               }
                            }}
                            disabled={disabled}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Remarks</label>
                          <Input
                            placeholder="Optional notes..."
                            value={r.remarks || ""}
                            onChange={(e) => onChange(r.staff_id, { remarks: e.target.value })}
                            disabled={disabled}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
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
