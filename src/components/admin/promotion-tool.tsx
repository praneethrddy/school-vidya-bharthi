'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface AcademicYearOption {
  id: string
  name: string
  is_current: boolean
}

interface ClassOption {
  id: string
  academic_year_id: string
  name: string
  section: string | null
  display_name: string
}

interface PromotionMetadataPayload {
  academic_years: AcademicYearOption[]
  classes: ClassOption[]
}

interface PromotionStudentRow {
  student_id: string
  name: string
  roll_number: string | null
  current_class: string
  promotion_action: 'PROMOTE' | 'RETAIN' | 'TC' | null
  target_class_id: string | null
}

interface PromotionListPayload {
  source_class: {
    id: string
    name: string
    section: string | null
  }
  students: PromotionStudentRow[]
}

interface PromotionResultPayload {
  total_requested: number
  total_updated: number
  total_skipped: number
  skipped: Array<{ student_id: string; reason: string }>
}

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }
  return (payload?.success ? payload.data : payload) as T
}

export function PromotionTool() {
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [fromAcademicYearId, setFromAcademicYearId] = useState('')
  const [toAcademicYearId, setToAcademicYearId] = useState('')
  const [fromClassId, setFromClassId] = useState('')
  const [students, setStudents] = useState<PromotionStudentRow[]>([])
  const [sourceClassName, setSourceClassName] = useState('')
  const [result, setResult] = useState<PromotionResultPayload | null>(null)

  const loadMetadata = async () => {
    setLoadingMeta(true)
    try {
      const data = await parseApi<PromotionMetadataPayload>(
        await fetch('/api/settings/promotion', { cache: 'no-store' })
      )
      setAcademicYears(data.academic_years || [])
      setClasses(data.classes || [])

      const current = data.academic_years.find((year) => year.is_current)
      const firstYear = current || data.academic_years[0]
      const initialFromYear = firstYear?.id || ''
      const initialToYear =
        data.academic_years.find((year) => year.id !== initialFromYear)?.id || ''
      const initialClass =
        data.classes.find((schoolClass) => schoolClass.academic_year_id === initialFromYear)?.id ||
        ''

      setFromAcademicYearId(initialFromYear)
      setToAcademicYearId(initialToYear)
      setFromClassId(initialClass)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load promotion metadata'
      toast.error(message)
    } finally {
      setLoadingMeta(false)
    }
  }

  useEffect(() => {
    void loadMetadata()
  }, [])

  const sourceClasses = useMemo(() => {
    return classes.filter((schoolClass) => schoolClass.academic_year_id === fromAcademicYearId)
  }, [classes, fromAcademicYearId])

  const targetClasses = useMemo(() => {
    return classes.filter((schoolClass) => schoolClass.academic_year_id === toAcademicYearId)
  }, [classes, toAcademicYearId])

  useEffect(() => {
    if (!fromAcademicYearId) return
    const nextClass = sourceClasses[0]?.id || ''
    if (!sourceClasses.some((schoolClass) => schoolClass.id === fromClassId)) {
      setFromClassId(nextClass)
    }
  }, [fromAcademicYearId, fromClassId, sourceClasses])

  const loadStudents = async () => {
    if (!fromAcademicYearId || !fromClassId) {
      toast.error('Select source academic year and class')
      return
    }

    setLoadingStudents(true)
    setResult(null)
    try {
      const query = new URLSearchParams({
        from_academic_year_id: fromAcademicYearId,
        from_class_id: fromClassId,
      })
      const data = await parseApi<PromotionListPayload>(
        await fetch(`/api/settings/promotion?${query.toString()}`, { cache: 'no-store' })
      )

      setSourceClassName(
        `${data.source_class.name}${data.source_class.section ? ` - ${data.source_class.section}` : ''}`
      )
      setStudents(data.students || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load students'
      toast.error(message)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const updateStudentDecision = (
    studentId: string,
    updates: Partial<PromotionStudentRow>
  ) => {
    setStudents((current) =>
      current.map((student) =>
        student.student_id === studentId ? { ...student, ...updates } : student
      )
    )
  }

  const promoteAll = () => {
    if (targetClasses.length === 0) {
      toast.error('Create classes in target academic year before bulk promote')
      return
    }
    const defaultTarget = targetClasses[0].id
    setStudents((current) =>
      current.map((student) => ({
        ...student,
        promotion_action: 'PROMOTE',
        target_class_id: defaultTarget,
      }))
    )
  }

  const executePromotion = async () => {
    const promotions = students
      .filter((student) => student.promotion_action !== null)
      .map((student) => ({
        student_id: student.student_id,
        action: student.promotion_action as 'PROMOTE' | 'RETAIN' | 'TC',
        target_class_id: student.target_class_id || undefined,
      }))

    if (!fromAcademicYearId || !toAcademicYearId) {
      toast.error('Select source and target academic years')
      return
    }

    if (promotions.length === 0) {
      toast.error('Choose promotion actions for at least one student')
      return
    }

    const missingTarget = promotions.find(
      (promotion) =>
        promotion.action === 'PROMOTE' && !promotion.target_class_id
    )
    if (missingTarget) {
      toast.error('Target class is required for promote action')
      return
    }

    const proceed = window.confirm(
      `Execute promotion for ${promotions.length} students from ${sourceClassName}?`
    )
    if (!proceed) {
      return
    }

    setExecuting(true)
    try {
      const response = await parseApi<PromotionResultPayload>(
        await fetch('/api/settings/promotion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_academic_year_id: fromAcademicYearId,
            to_academic_year_id: toAcademicYearId,
            promotions,
          }),
        })
      )
      setResult(response)
      toast.success(`Promotion executed for ${response.total_updated} students`)
      await loadStudents()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute promotion'
      toast.error(message)
    } finally {
      setExecuting(false)
    }
  }

  if (loadingMeta) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Promotion Tool</CardTitle>
          <CardDescription>Loading promotion metadata...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Promotion Tool</CardTitle>
        <CardDescription>
          Promote, retain, or mark transfer certificate decisions for a class roster.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>From Academic Year</Label>
            <Select value={fromAcademicYearId} onValueChange={setFromAcademicYearId}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Source Class</Label>
            <Select value={fromClassId} onValueChange={setFromClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {sourceClasses.map((schoolClass) => (
                  <SelectItem key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>To Academic Year</Label>
            <Select value={toAcademicYearId} onValueChange={setToAcademicYearId}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears
                  .filter((year) => year.id !== fromAcademicYearId)
                  .map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadStudents()}
              disabled={!fromAcademicYearId || !fromClassId || loadingStudents}
            >
              {loadingStudents ? 'Loading...' : 'Load Students'}
            </Button>
          </div>
        </div>

        {students.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Source class: <span className="font-medium text-foreground">{sourceClassName}</span>
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={promoteAll}>
                  Select All - Promote
                </Button>
                <Button type="button" onClick={() => void executePromotion()} disabled={executing}>
                  {executing ? 'Executing...' : 'Execute Promotion'}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Student</th>
                    <th className="px-3 py-2 text-left font-medium">Roll</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                    <th className="px-3 py-2 text-left font-medium">Target Class</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.student_id} className="border-t">
                      <td className="px-3 py-2">{student.name}</td>
                      <td className="px-3 py-2">{student.roll_number || '-'}</td>
                      <td className="px-3 py-2">
                        <Select
                          value={student.promotion_action || '__none__'}
                          onValueChange={(value) =>
                            updateStudentDecision(student.student_id, {
                              promotion_action:
                                value === '__none__'
                                  ? null
                                  : (value as 'PROMOTE' | 'RETAIN' | 'TC'),
                              target_class_id:
                                value === 'TC' ? null : student.target_class_id,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Not decided</SelectItem>
                            <SelectItem value="PROMOTE">Promote</SelectItem>
                            <SelectItem value="RETAIN">Retain</SelectItem>
                            <SelectItem value="TC">Transfer Certificate</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={student.target_class_id || '__none__'}
                          disabled={student.promotion_action === 'TC'}
                          onValueChange={(value) =>
                            updateStudentDecision(student.student_id, {
                              target_class_id: value === '__none__' ? null : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select target class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No target class</SelectItem>
                            {targetClasses.map((targetClass) => (
                              <SelectItem key={targetClass.id} value={targetClass.id}>
                                {targetClass.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Load a source class to start assigning promotion decisions.
          </p>
        )}

        {result ? (
          <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">Updated: {result.total_updated}</Badge>
              <Badge variant="secondary">Requested: {result.total_requested}</Badge>
              <Badge variant={result.total_skipped > 0 ? 'warning' : 'secondary'}>
                Skipped: {result.total_skipped}
              </Badge>
            </div>
            {result.skipped.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {result.skipped.map((item) => (
                  <li key={item.student_id}>
                    {item.student_id}: {item.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

