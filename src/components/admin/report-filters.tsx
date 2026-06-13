'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ReportMetaPayload } from '@/lib/report-types'

export type ReportTypeId = 'attendance' | 'academic' | 'financial' | 'staff_attendance'

export interface ReportFiltersState {
  classId: string
  dateFrom: string
  dateTo: string
  termId: string
  examId: string
  feeCategoryId: string
  department: string
}

interface ReportFiltersProps {
  reportType: ReportTypeId
  filters: ReportFiltersState
  meta: ReportMetaPayload
  loading?: boolean
  onChange: (patch: Partial<ReportFiltersState>) => void
  onGenerate: () => void
}

export function ReportFilters({
  reportType,
  filters,
  meta,
  loading,
  onChange,
  onGenerate,
}: ReportFiltersProps) {
  const filteredExams = meta.exams.filter(
    (exam) =>
      (!filters.classId || exam.class_id === filters.classId) &&
      (!filters.termId || exam.term_id === filters.termId)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>
          Refine the report scope before generating charts, tables, and exports.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportType !== 'staff_attendance' ? (
          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={filters.classId || undefined}
              onValueChange={(value) => onChange({ classId: value, examId: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {meta.classes.map((schoolClass) => (
                  <SelectItem key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                    {schoolClass.section ? ` ${schoolClass.section}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              value={filters.department}
              onChange={(event) => onChange({ department: event.target.value })}
              placeholder="Optional department"
            />
          </div>
        )}

        {reportType === 'attendance' || reportType === 'financial' || reportType === 'staff_attendance' ? (
          <>
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => onChange({ dateFrom: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(event) => onChange({ dateTo: event.target.value })}
              />
            </div>
          </>
        ) : null}

        {reportType === 'academic' ? (
          <>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select
                value={filters.termId || 'all'}
                onValueChange={(value) => onChange({ termId: value === 'all' ? '' : value, examId: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  {meta.terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select
                value={filters.examId || 'all'}
                onValueChange={(value) => onChange({ examId: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {filteredExams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}

        {reportType === 'financial' ? (
          <div className="space-y-2">
            <Label>Fee Category</Label>
            <Select
              value={filters.feeCategoryId || 'all'}
              onValueChange={(value) => onChange({ feeCategoryId: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {meta.fee_categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex items-end">
          <Button className="w-full" onClick={onGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
