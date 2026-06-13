"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Edit, Trash2 } from "lucide-react"

export interface Exam {
  id: string
  name: string
  class_name: string
  term_name: string
  start_date: string | null
  end_date: string | null
  subjects_count: number
  grades_entered_count: number
}

interface ExamTableProps {
  exams: Exam[]
  onEdit: (exam: Exam) => void
  onDelete: (id: string) => void
  canEdit: boolean
  canDelete: boolean
}

export function ExamTable({ exams, onEdit, onDelete, canEdit, canDelete }: ExamTableProps) {
  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border shadow-sm h-64">
        <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-medium">No Exams Found</h3>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
          There are no exams created matching your current filters. Click &quot;Create Exam&quot; to schedule a new one.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Exam Name</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="text-center">Subjects</TableHead>
            <TableHead className="text-center">Grades Progress</TableHead>
            {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {exams.map((exam) => {
            const hasDates = exam.start_date || exam.end_date
            const dateStr = hasDates 
              ? `${exam.start_date ? new Date(exam.start_date).toLocaleDateString() : 'TBD'} - ${exam.end_date ? new Date(exam.end_date).toLocaleDateString() : 'TBD'}`
              : 'TBD'
              
            const isFullyEntered = exam.subjects_count > 0 && exam.grades_entered_count > 0 && exam.grades_entered_count >= exam.subjects_count // Simplify progress visual
            
            return (
              <TableRow key={exam.id}>
                <TableCell className="font-medium">{exam.name}</TableCell>
                <TableCell>{exam.class_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{exam.term_name}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{dateStr}</TableCell>
                <TableCell className="text-center">{exam.subjects_count}</TableCell>
                <TableCell className="text-center">
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${Math.min(100, exam.subjects_count ? (exam.grades_entered_count / (exam.subjects_count * 30)) * 100 : 0)}%` }} // rough approx for UI progress
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground">{exam.grades_entered_count} entries</span>
                </TableCell>
                {(canEdit || canDelete) && (
                  <TableCell className="text-right space-x-2">
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => onEdit(exam)} title="Edit Exam">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => onDelete(exam.id)} title="Delete Exam" className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
