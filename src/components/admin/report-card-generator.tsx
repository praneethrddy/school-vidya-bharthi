"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileDown, FileText, Loader2 } from "lucide-react"

interface ReportStudent {
  student_id: string
  student_name: string
  roll_number: string
  has_grades: boolean
  download_url: string | null
}

interface ReportCardGeneratorProps {
  classId: string
  termId: string
  onGenerateBulk: () => Promise<void>
}

export function ReportCardGenerator({ classId, termId, onGenerateBulk }: ReportCardGeneratorProps) {
  const [students, setStudents] = useState<ReportStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  const fetchStudents = async () => {
    if (!classId || !termId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/report-cards?class_id=${classId}&term_id=${termId}`)
      if (res.ok) {
        const body = await res.json()
        setStudents(body.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [classId, termId])

  const handleBulkGenerate = async () => {
    setBulkLoading(true)
    try {
      await onGenerateBulk()
      // re-fetch to reflect any changes if needed
      await fetchStudents()
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-md border shadow-sm">
        <div>
           <h3 className="text-lg font-medium">Class Reports</h3>
           <p className="text-sm text-muted-foreground">Download or generate report cards for students with entered grades.</p>
        </div>
        <Button onClick={handleBulkGenerate} disabled={bulkLoading || !classId || !termId}>
          {bulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Generate All Missing Reports
        </Button>
      </div>

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[100px]">Roll No</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading students...
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No students found or class/term not selected.
                </TableCell>
              </TableRow>
            ) : students.map(s => (
              <TableRow key={s.student_id}>
                <TableCell className="font-medium">{s.roll_number || '-'}</TableCell>
                <TableCell>{s.student_name}</TableCell>
                <TableCell className="text-center">
                  {s.has_grades ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700">Grades Available</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">No Grades</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {s.download_url ? (
                    <Button variant="ghost" size="sm" asChild className="text-primary hover:bg-primary/5">
                      <a href={s.download_url} download target="_blank" rel="noreferrer">
                        <FileDown className="h-4 w-4 mr-2" /> Download PDF
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Cannot generate</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
