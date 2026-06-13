'use client'

import { useEffect, useMemo, useState } from 'react'
import { subDays } from 'date-fns'
import { BarChart3, BookOpenText, IndianRupee, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AcademicReportView } from '@/components/admin/academic-report-view'
import { AttendanceReportView } from '@/components/admin/attendance-report-view'
import { ExportButtons } from '@/components/admin/export-buttons'
import { FinancialReportView } from '@/components/admin/financial-report-view'
import {
  ReportFilters,
  type ReportFiltersState,
  type ReportTypeId,
} from '@/components/admin/report-filters'
import { ReportSelector } from '@/components/admin/report-selector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePermissions } from '@/hooks/use-permissions'
import type { ReportMetaPayload, ReportPayload } from '@/lib/report-types'

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0]
}

const defaultFilters: ReportFiltersState = {
  classId: '',
  dateFrom: toDateInputValue(subDays(new Date(), 29)),
  dateTo: toDateInputValue(new Date()),
  termId: '',
  examId: '',
  feeCategoryId: '',
  department: '',
}

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Request failed')
  }

  return payload?.data as T
}

function getExcelFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get('content-disposition')
  const match = disposition?.match(/filename="(.+?)"/i)
  return match?.[1] || fallback
}

export function ReportsDashboard() {
  const { can, loading: permissionLoading } = usePermissions()
  const [meta, setMeta] = useState<ReportMetaPayload | null>(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [filters, setFilters] = useState<ReportFiltersState>(defaultFilters)
  const [selectedReport, setSelectedReport] = useState<ReportTypeId>('attendance')
  const [reportData, setReportData] = useState<ReportPayload | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  const reportItems = useMemo(
    () => [
      {
        id: 'attendance' as const,
        title: 'Attendance Report',
        description: 'Student-wise attendance trends, day summaries, and class attendance patterns.',
        icon: BarChart3,
        available: can('REPORTS.view_attendance'),
      },
      {
        id: 'academic' as const,
        title: 'Academic Performance',
        description: 'Subject averages, toppers, grade distribution, and exam comparisons.',
        icon: BookOpenText,
        available: can('REPORTS.view_academic'),
      },
      {
        id: 'financial' as const,
        title: 'Financial Report',
        description: 'Collection trends, outstanding balances, and defaulter-focused summaries.',
        icon: IndianRupee,
        available: can('REPORTS.view_financial'),
      },
      {
        id: 'staff_attendance' as const,
        title: 'Staff Attendance',
        description: 'Staff attendance coverage with daily trends and staff-wise performance.',
        icon: Users,
        available: can('REPORTS.view_attendance') && can('STAFF.view'),
      },
    ],
    [can]
  )

  const availableReportIds = useMemo(
    () => reportItems.filter((item) => item.available).map((item) => item.id),
    [reportItems]
  )

  useEffect(() => {
    if (permissionLoading) return
    if (availableReportIds.length === 0) {
      setMetaLoading(false)
      return
    }

    const loadMeta = async () => {
      setMetaLoading(true)
      try {
        const data = await parseApi<ReportMetaPayload>(
          await fetch('/api/admin/reports/meta', { cache: 'no-store' })
        )
        setMeta(data)
        setFilters((current) => ({
          ...current,
          classId: current.classId || data.classes[0]?.id || '',
          termId: current.termId || data.terms[0]?.id || '',
        }))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load report metadata')
        setMeta(null)
      } finally {
        setMetaLoading(false)
      }
    }

    void loadMeta()
  }, [availableReportIds, permissionLoading])

  useEffect(() => {
    if (!availableReportIds.includes(selectedReport) && availableReportIds[0]) {
      setSelectedReport(availableReportIds[0])
      setReportData(null)
    }
  }, [availableReportIds, selectedReport])

  const updateFilters = (patch: Partial<ReportFiltersState>) => {
    setFilters((current) => ({ ...current, ...patch }))
  }

  const buildQuery = (format: 'json' | 'pdf' | 'excel' = 'json') => {
    const params = new URLSearchParams()

    if (selectedReport === 'attendance') {
      params.set('class_id', filters.classId)
      params.set('date_from', filters.dateFrom)
      params.set('date_to', filters.dateTo)
    }

    if (selectedReport === 'staff_attendance') {
      params.set('date_from', filters.dateFrom)
      params.set('date_to', filters.dateTo)
      if (filters.department.trim()) {
        params.set('department', filters.department.trim())
      }
    }

    if (selectedReport === 'academic') {
      params.set('class_id', filters.classId)
      if (filters.termId) {
        params.set('term_id', filters.termId)
      }
      if (filters.examId) {
        params.set('exam_id', filters.examId)
      }
    }

    if (selectedReport === 'financial') {
      params.set('date_from', filters.dateFrom)
      params.set('date_to', filters.dateTo)
      if (filters.classId) {
        params.set('class_id', filters.classId)
      }
      if (filters.feeCategoryId) {
        params.set('fee_category_id', filters.feeCategoryId)
      }
    }

    params.set('format', format)

    const pathSegment = selectedReport === 'staff_attendance' ? 'staff-attendance' : selectedReport
    return `/api/admin/reports/${pathSegment}?${params.toString()}`
  }

  const handleGenerate = async () => {
    setLoadingReport(true)
    try {
      const data = await parseApi<ReportPayload>(
        await fetch(buildQuery('json'), { cache: 'no-store' })
      )
      setReportData(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate report')
      setReportData(null)
    } finally {
      setLoadingReport(false)
    }
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      const data = await parseApi<{ url: string }>(await fetch(buildQuery('pdf')))
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const handleExportExcel = async () => {
    setExportingExcel(true)
    try {
      const response = await fetch(buildQuery('excel'))
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error?.message || 'Failed to export Excel')
      }

      const blob = await response.blob()
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = getExcelFilename(response, 'report.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(href)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export Excel')
    } finally {
      setExportingExcel(false)
    }
  }

  if (permissionLoading || metaLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-muted-foreground">Loading reporting workspace...</p>
      </div>
    )
  }

  if (availableReportIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-muted-foreground">
          You do not have permissions to access analytics and reports.
        </p>
      </div>
    )
  }

  if (!meta) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-muted-foreground">Reporting metadata could not be loaded.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate attendance, academic, and finance reports with on-screen analytics plus PDF and Excel exports.
        </p>
      </div>

      <ReportSelector
        items={reportItems}
        selectedId={selectedReport}
        onSelect={(nextReport) => {
          setSelectedReport(nextReport as ReportTypeId)
          setReportData(null)
        }}
      />

      <ReportFilters
        reportType={selectedReport}
        filters={filters}
        meta={meta}
        loading={loadingReport}
        onChange={updateFilters}
        onGenerate={handleGenerate}
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Exports</CardTitle>
            <CardDescription>
              PDF exports are uploaded and returned as URLs. Excel exports download directly.
            </CardDescription>
          </div>
          <ExportButtons
            disabled={!reportData}
            exportingPdf={exportingPdf}
            exportingExcel={exportingExcel}
            onDownloadPdf={handleExportPdf}
            onDownloadExcel={handleExportExcel}
          />
        </CardHeader>
      </Card>

      {!reportData ? (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Generate</CardTitle>
            <CardDescription>
              Choose a report type, adjust the filters, and generate the report to inspect the charts and tables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The export buttons will activate once a report is available on screen.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {reportData?.report_type === 'attendance' ? (
        <AttendanceReportView key="attendance" report={reportData} />
      ) : null}

      {reportData?.report_type === 'staff_attendance' ? (
        <AttendanceReportView key="staff-attendance" report={reportData} />
      ) : null}

      {reportData?.report_type === 'academic' ? (
        <AcademicReportView key="academic" report={reportData} />
      ) : null}

      {reportData?.report_type === 'financial' ? (
        <FinancialReportView key="financial" report={reportData} />
      ) : null}
    </div>
  )
}
