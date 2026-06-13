'use client'

import { FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TeacherOption {
  id: string
  name: string
}

interface ClassFormValues {
  name: string
  section: string
  max_students: number
  room_number: string
  class_teacher_id: string | null
}

interface ClassFormProps {
  academicYearId: string
  teachers: TeacherOption[]
  mode?: 'create' | 'edit'
  classId?: string
  initialValues?: Partial<ClassFormValues>
  onSaved?: () => Promise<void> | void
  onCancel?: () => void
}

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }
  return (payload?.success ? payload.data : payload) as T
}

const defaultValues: ClassFormValues = {
  name: '',
  section: '',
  max_students: 40,
  room_number: '',
  class_teacher_id: null,
}

export function ClassForm({
  academicYearId,
  teachers,
  mode = 'create',
  classId,
  initialValues,
  onSaved,
  onCancel,
}: ClassFormProps) {
  const [values, setValues] = useState<ClassFormValues>({
    ...defaultValues,
    ...initialValues,
    max_students: initialValues?.max_students ?? 40,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setValues({
      ...defaultValues,
      ...initialValues,
      max_students: initialValues?.max_students ?? 40,
    })
  }, [initialValues])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    try {
      if (mode === 'edit') {
        if (!classId) {
          throw new Error('classId is required for edit mode')
        }
        await parseApi(
          await fetch(`/api/settings/classes/${classId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: values.name.trim(),
              section: values.section.trim() || null,
              max_students: Number(values.max_students),
              room_number: values.room_number.trim() || null,
              class_teacher_id: values.class_teacher_id || null,
            }),
          })
        )
        toast.success('Class updated')
      } else {
        await parseApi(
          await fetch('/api/settings/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              academic_year_id: academicYearId,
              name: values.name.trim(),
              section: values.section.trim() || null,
              max_students: Number(values.max_students),
              room_number: values.room_number.trim() || null,
              class_teacher_id: values.class_teacher_id || null,
            }),
          })
        )
        toast.success('Class created')
        setValues({ ...defaultValues })
      }

      if (onSaved) {
        await onSaved()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save class'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'edit' ? 'Edit Class' : 'Add Class'}</CardTitle>
        <CardDescription>
          {mode === 'edit'
            ? 'Update class details, teacher allocation, and room information.'
            : 'Create a class in the selected academic year.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-5" onSubmit={handleSubmit}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="class-name">Class Name</Label>
            <Input
              id="class-name"
              value={values.name}
              onChange={(event) =>
                setValues((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Grade 6"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-section">Section</Label>
            <Input
              id="class-section"
              value={values.section}
              onChange={(event) =>
                setValues((current) => ({ ...current, section: event.target.value }))
              }
              placeholder="A"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-max-students">Max Students</Label>
            <Input
              id="class-max-students"
              type="number"
              min={1}
              max={500}
              value={values.max_students}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  max_students: Number(event.target.value || 40),
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-room-number">Room Number</Label>
            <Input
              id="class-room-number"
              value={values.room_number}
              onChange={(event) =>
                setValues((current) => ({ ...current, room_number: event.target.value }))
              }
              placeholder="201"
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <Label>Class Teacher</Label>
            <Select
              value={values.class_teacher_id || '__none__'}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  class_teacher_id: value === '__none__' ? null : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select teacher (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No class teacher</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2 md:col-span-2">
            {mode === 'edit' && onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading
                ? mode === 'edit'
                  ? 'Saving...'
                  : 'Creating...'
                : mode === 'edit'
                  ? 'Save Changes'
                  : 'Add Class'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

