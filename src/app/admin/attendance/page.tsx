"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { AttendanceDatePicker } from "@/components/admin/attendance-date-picker"
import { AttendanceGrid, StudentRecord } from "@/components/admin/attendance-grid"
import { StaffAttendanceGrid, StaffRecord } from "@/components/admin/staff-attendance-grid"
import { ClassAttendanceSummary, ClassSummary } from "@/components/admin/class-attendance-summary"
import { MonthlyAttendanceReport } from "@/components/admin/monthly-attendance-report"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

export default function AttendancePage() {
  const [date, setDate] = React.useState<Date>(new Date())
  const [activeTab, setActiveTab] = React.useState("student")
  
  // Student Marking State
  const [classes, setClasses] = React.useState<any[]>([])
  const [selectedClass, setSelectedClass] = React.useState<string>("")
  const [studentRecords, setStudentRecords] = React.useState<StudentRecord[]>([])
  const [isStudentMarked, setIsStudentMarked] = React.useState(false)
  const [loadingStudent, setLoadingStudent] = React.useState(false)
  const [savingStudent, setSavingStudent] = React.useState(false)

  // Staff Marking State
  const [staffRecords, setStaffRecords] = React.useState<StaffRecord[]>([])
  const [isStaffMarked, setIsStaffMarked] = React.useState(false)
  const [loadingStaff, setLoadingStaff] = React.useState(false)
  const [savingStaff, setSavingStaff] = React.useState(false)

  // Summary State
  const [summaries, setSummaries] = React.useState<ClassSummary[]>([])
  const [loadingSummary, setLoadingSummary] = React.useState(false)

  const dateStr = date.toISOString().split('T')[0]

  // We could fetch classes from a dedicated route, but we can reuse the summary route to get class list quickly
  React.useEffect(() => {
    fetchSummaries()
    fetchStaffRecords()
  }, [dateStr])

  React.useEffect(() => {
    if (selectedClass) {
      fetchStudentRecords(selectedClass)
    } else {
      setStudentRecords([])
    }
  }, [selectedClass, dateStr])

  async function fetchSummaries() {
    setLoadingSummary(true)
    try {
      const res = await fetch(`/api/admin/attendance/summary?date=${dateStr}`)
      if (!res.ok) {
         if (res.status === 403) {
            setClasses([])
            setSummaries([])
            return // Not allowed to view summary (maybe a teacher with view_own_class only)
         }
         throw new Error("Failed to fetch summary")
      }
      const data = await res.json()
      if (data.success) {
        setSummaries(data.data.classes)
        // Extract class options for selector
        setClasses(data.data.classes.map((c: any) => ({ id: c.class_id, name: c.class_name })))
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoadingSummary(false)
    }
  }

  async function fetchStudentRecords(classId: string) {
    setLoadingStudent(true)
    try {
      const res = await fetch(`/api/admin/attendance?class_id=${classId}&date=${dateStr}`)
      if (!res.ok) throw new Error("Failed to fetch records")
      const data = await res.json()
      if (data.success) {
        setStudentRecords(data.data.records)
        setIsStudentMarked(data.data.is_marked)
      } else {
        toast.error(data.error?.message || "Error fetching records")
      }
    } catch (e: any) {
      toast.error("An error occurred while loading student attendance")
    } finally {
      setLoadingStudent(false)
    }
  }

  async function saveStudentRecords() {
    if (!selectedClass) return
    setSavingStudent(true)
    try {
      const payload = {
        class_id: selectedClass,
        date: dateStr,
        records: studentRecords.map(r => ({ student_id: r.student_id, status: r.status, remarks: r.remarks }))
      }
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.data.message)
        setIsStudentMarked(true)
        fetchSummaries() // Refresh summary
      } else {
        toast.error(data.error?.message || "Error saving records")
      }
    } catch (e) {
      toast.error("Network error while saving records")
    } finally {
      setSavingStudent(false)
    }
  }

  async function fetchStaffRecords() {
    setLoadingStaff(true)
    try {
      const res = await fetch(`/api/admin/staff-attendance?date=${dateStr}`)
      if (!res.ok) {
         if (res.status === 403) return // Handled gracefully if no permission
         throw new Error("Failed to fetch")
      }
      const data = await res.json()
      if (data.success) {
        setStaffRecords(data.data.records)
        setIsStaffMarked(data.data.records.some((r: any) => r.status))
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoadingStaff(false)
    }
  }

  async function saveStaffRecords() {
    setSavingStaff(true)
    try {
      const payload = {
        date: dateStr,
        records: staffRecords.map(r => ({ 
           staff_id: r.staff_id, 
           status: r.status, 
           check_in: r.check_in, 
           check_out: r.check_out, 
           remarks: r.remarks 
        }))
      }
      const res = await fetch("/api/admin/staff-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.data.message)
        setIsStaffMarked(true)
      } else {
        toast.error(data.error?.message || "Error saving records")
      }
    } catch (e) {
      toast.error("Network error while saving records")
    } finally {
      setSavingStaff(false)
    }
  }

  // Edit Handlers
  const handleStudentChange = (id: string, updates: Partial<StudentRecord>) => {
    setStudentRecords(prev => prev.map(r => r.student_id === id ? { ...r, ...updates } : r))
  }
  
  const handleStaffChange = (id: string, updates: Partial<StaffRecord>) => {
    setStaffRecords(prev => prev.map(r => r.staff_id === id ? { ...r, ...updates } : r))
  }

  const markAllStudent = (status: any) => {
    setStudentRecords(prev => prev.map(r => ({ ...r, status })))
  }

  const markAllStaff = (status: any) => {
    setStaffRecords(prev => prev.map(r => ({ ...r, status })))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground mt-1">Mark and monitor daily attendance for students and staff.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="student">Student Marking</TabsTrigger>
          <TabsTrigger value="staff">Staff Marking</TabsTrigger>
          <TabsTrigger value="summary">School Summary</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
        </TabsList>

        <div className="flex items-center space-x-4 mb-6">
          <AttendanceDatePicker date={date} onChange={setDate} />
          {activeTab === 'student' && (
             <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                     <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
             </Select>
          )}
        </div>

        <TabsContent value="student" className="space-y-4">
          {!selectedClass ? (
            <div className="py-12 text-center border border-dashed rounded-lg text-muted-foreground bg-muted/10">
              Please select a class to view the attendance grid.
            </div>
          ) : loadingStudent ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : (
             <div className="space-y-4">
                <AttendanceGrid 
                   records={studentRecords} 
                   onChange={handleStudentChange} 
                   onMarkAll={markAllStudent}
                   isMarked={isStudentMarked}
                />
                <div className="flex justify-end pt-4">
                   <Button onClick={saveStudentRecords} disabled={savingStudent || studentRecords.length === 0}>
                     {savingStudent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     <Save className="mr-2 h-4 w-4" />
                     {isStudentMarked ? "Update Attendance" : "Save Attendance"}
                   </Button>
                </div>
             </div>
          )}
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          {loadingStaff ? (
             <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : staffRecords.length === 0 ? (
             <div className="py-12 text-center border border-dashed rounded-lg text-muted-foreground bg-muted/10">
               You do not have permission to mark staff attendance or no staff found.
             </div>
          ) : (
             <div className="space-y-4">
                <StaffAttendanceGrid 
                   records={staffRecords} 
                   onChange={handleStaffChange} 
                   onMarkAll={markAllStaff}
                   isMarked={isStaffMarked}
                />
                <div className="flex justify-end pt-4">
                   <Button onClick={saveStaffRecords} disabled={savingStaff}>
                     {savingStaff && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     <Save className="mr-2 h-4 w-4" />
                     {isStaffMarked ? "Update Attendance" : "Save Attendance"}
                   </Button>
                </div>
             </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {loadingSummary ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <ClassAttendanceSummary 
               classes={summaries} 
               onClassSelect={(id) => {
                  setSelectedClass(id)
                  setActiveTab("student")
               }} 
            />
          )}
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyAttendanceReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
