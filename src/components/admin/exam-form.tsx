"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"

const schema = z.object({
  name: z.string().min(1, "Exam name is required"),
  class_id: z.string().min(1, "Class is required"),
  term_id: z.string().min(1, "Term is required"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  subjects: z.array(z.object({
    subject_id: z.string(),
    max_marks: z.coerce.number().min(1),
    passing_marks: z.coerce.number().min(0),
    exam_date: z.string().optional(),
    selected: z.boolean().default(false)
  })).min(1)
})

type FormData = z.infer<typeof schema>

interface ExamFormProps {
  initialData?: any
  classes: any[]
  terms: any[]
  subjects: any[] // array of { id, name, class_id }
  academicYearId: string
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

export function ExamForm({ initialData, classes, terms, subjects, academicYearId, onSubmit, onCancel }: ExamFormProps) {
  const [loading, setLoading] = useState(false)

  const defaultValues: Partial<FormData> = initialData ? {
    name: initialData.name,
    class_id: initialData.class_id,
    term_id: initialData.term_id,
    start_date: initialData.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : '',
    end_date: initialData.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : '',
    subjects: initialData.exam_subjects?.map((es: any) => ({
      subject_id: es.subject_id,
      max_marks: es.max_marks,
      passing_marks: es.passing_marks,
      exam_date: es.exam_date ? new Date(es.exam_date).toISOString().split('T')[0] : '',
      selected: true
    })) || []
  } : {
    name: "",
    class_id: "",
    term_id: "",
    subjects: []
  }

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues
  })

  const { fields, replace } = useFieldArray({ control, name: "subjects" })
  const watchClassId = watch("class_id")

  // Auto-populate subjects when class changes (only for new exams)
  const handleClassChange = (classId: string) => {
    setValue("class_id", classId)
    if (!initialData) {
      const classSubjects = subjects.filter(s => s.class_id === classId)
      replace(classSubjects.map(s => ({
        subject_id: s.id,
        max_marks: 100,
        passing_marks: 35,
        exam_date: '',
        selected: true
      })))
    }
  }

  const handleFormSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      // Filter out unselected subjects
      const selectedSubjects = data.subjects.filter(s => s.selected).map(s => ({
        subject_id: s.subject_id,
        max_marks: s.max_marks,
        passing_marks: s.passing_marks,
        exam_date: s.exam_date || undefined
      }))

      if (selectedSubjects.length === 0) {
        alert("Please select at least one subject.")
        return
      }

      const payload = {
        name: data.name,
        class_id: data.class_id,
        term_id: data.term_id,
        academic_year_id: academicYearId,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        subjects: selectedSubjects
      }

      await onSubmit(payload)
    } catch (e: any) {
      alert(e.message || "Failed to save exam")
    } finally {
      setLoading(false)
    }
  }

  const availableSubjectsForTable = watchClassId ? subjects.filter(s => s.class_id === watchClassId) : []

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-sm">
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Exam' : 'Create New Exam'}</CardTitle>
        <CardDescription>Setup an exam schedule and subjects.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exam Name</Label>
              <Input {...register("name")} placeholder="e.g. Mid Term Exam" />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Term</Label>
              <Select onValueChange={(val) => setValue("term_id", val)} defaultValue={defaultValues.term_id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.term_id && <p className="text-red-500 text-sm">{errors.term_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <Select onValueChange={handleClassChange} defaultValue={defaultValues.class_id} disabled={!!initialData}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.class_id && <p className="text-red-500 text-sm">{errors.class_id.message}</p>}
            </div>

            <div className="space-y-2"></div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...register("start_date")} />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" {...register("end_date")} />
            </div>
          </div>

          {watchClassId && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg">Subjects & Grading Configuration</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left w-12">Include</th>
                      <th className="p-3 text-left">Subject</th>
                      <th className="p-3 text-center">Max Marks</th>
                      <th className="p-3 text-center">Pass Marks</th>
                      <th className="p-3 text-center">Exam Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const subjectDetails = availableSubjectsForTable.find(s => s.id === field.subject_id)
                      if (!subjectDetails) return null

                      return (
                        <tr key={field.id} className="border-t">
                          <td className="p-3 text-center">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 rounded border-gray-300"
                              {...register(`subjects.${index}.selected`)}
                            />
                          </td>
                          <td className="p-3 font-medium">{subjectDetails.name}</td>
                          <td className="p-3">
                            <Input type="number" {...register(`subjects.${index}.max_marks`)} className="w-24 mx-auto" min={1} />
                          </td>
                          <td className="p-3">
                            <Input type="number" {...register(`subjects.${index}.passing_marks`)} className="w-24 mx-auto" min={0} />
                          </td>
                          <td className="p-3">
                            <Input type="date" {...register(`subjects.${index}.exam_date`)} className="w-auto" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : (initialData ? "Update Exam" : "Create Exam")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
