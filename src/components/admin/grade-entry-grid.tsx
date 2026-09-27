"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, X, Save, Maximize, AlertCircle } from "lucide-react"

export interface GradeEntry {
  grade_id: string | null
  student_id: string
  student_name: string
  roll_number: string
  marks_obtained: number | null
  grade: string | null
  remarks: string | null
  is_pass: boolean | null
}

interface GradeEntryGridProps {
  grades: GradeEntry[]
  maxMarks: number
  passingMarks: number
  onSave: (grades: { student_id: string; marks_obtained: number | null; remarks?: string }[]) => Promise<void>
  disabled?: boolean
}

export function GradeEntryGrid({ grades: initialGrades, maxMarks, passingMarks, onSave, disabled }: GradeEntryGridProps) {
  const [grades, setGrades] = useState<GradeEntry[]>(initialGrades)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setGrades(initialGrades)
  }, [initialGrades])

  const handleMarkChange = (studentId: string, value: string) => {
    let markValue: number | null = parseFloat(value)
    if (isNaN(markValue) || value.trim() === '') markValue = null

    // Validate
    const newErrors = { ...errors }
    if (markValue !== null && (markValue < 0 || markValue > maxMarks)) {
      newErrors[studentId] = `Marks must be 0 - ${maxMarks}`
    } else {
      delete newErrors[studentId]
    }
    setErrors(newErrors)

    setGrades(prev => prev.map(g => {
      if (g.student_id === studentId) {
        return { 
          ...g, 
          marks_obtained: markValue,
          is_pass: markValue !== null ? markValue >= passingMarks : null
        }
      }
      return g
    }))
  }

  const handleRemarkChange = (studentId: string, value: string) => {
    setGrades(prev => prev.map(g => g.student_id === studentId ? { ...g, remarks: value } : g))
  }

  const handleFillMaxMarks = () => {
    if (!window.confirm(`Fill all EMPTY entries with maximum marks (${maxMarks})?`)) return

    setGrades(prev => prev.map(g => {
       if (g.marks_obtained === null || g.marks_obtained === undefined) {
         return {
           ...g,
           marks_obtained: maxMarks,
           is_pass: maxMarks >= passingMarks
         }
       }
       return g
    }))
  }

  const handleSaveAll = async () => {
    if (Object.keys(errors).length > 0) {
      alert("Please fix the validation errors before saving.")
      return
    }

    try {
      setLoading(true)
      const payload = grades.map(g => ({
        student_id: g.student_id,
        marks_obtained: g.marks_obtained,
        remarks: g.remarks || undefined
      }))
      await onSave(payload)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-md border">
        <div className="text-sm">
          <p><span className="font-semibold">{grades.length}</span> Students Total</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Max: <span className="font-medium text-foreground">{maxMarks}</span> | Pass: <span className="font-medium text-foreground">{passingMarks}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {!disabled && (
            <Button variant="outline" size="sm" onClick={handleFillMaxMarks}>
              <Maximize className="mr-2 h-4 w-4" />
              Fill Max Marks
            </Button>
          )}
          {!disabled && (
            <Button size="sm" onClick={handleSaveAll} disabled={loading || Object.keys(errors).length > 0}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Save All Grades"}
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-md shadow-sm overflow-x-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Roll No</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead className="w-[180px] text-center">Marks Obtained</TableHead>
              <TableHead className="w-[120px] text-center">Status</TableHead>
              <TableHead className="text-center">Computed Grade</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={6} className="text-center p-8 text-muted-foreground">
                   No students found in this class.
                 </TableCell>
               </TableRow>
            ) : grades.map((g) => (
              <TableRow key={g.student_id}>
                <TableCell className="font-medium">{g.roll_number || '-'}</TableCell>
                <TableCell>{g.student_name}</TableCell>
                <TableCell>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={g.marks_obtained !== null ? g.marks_obtained : ''}
                      onChange={(e) => handleMarkChange(g.student_id, e.target.value)}
                      disabled={disabled}
                      className={`text-center w-[120px] mx-auto ${errors[g.student_id] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      step="0.01"
                      placeholder={`/ ${maxMarks}`}
                    />
                    {errors[g.student_id] && (
                      <div className="absolute -bottom-5 left-0 right-0 text-[10px] text-red-500 text-center flex items-center justify-center">
                        <AlertCircle className="w-3 h-3 mr-1" /> Invalid
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {g.marks_obtained !== null ? (
                    g.is_pass ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pass</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Fail</Badge>
                    )
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-400 border-dashed border">Pending</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center font-semibold text-lg text-muted-foreground">
                  {g.grade || '-'}
                </TableCell>
                <TableCell>
                  <Input 
                    value={g.remarks || ''}
                    onChange={(e) => handleRemarkChange(g.student_id, e.target.value)}
                    disabled={disabled}
                    placeholder="Optional remarks"
                    className="w-full text-sm h-9"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
