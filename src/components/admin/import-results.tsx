'use client'

import { Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { escapeCsvValue, type ImportProcessResult } from '@/lib/import-types'

interface ImportResultsProps {
  result: ImportProcessResult
  onReset: () => void
}

function downloadFailedRows(result: ImportProcessResult) {
  if (result.failed_rows.length === 0) return

  const csv = [
    ['row_number', 'error', 'data'],
    ...result.failed_rows.map((row) => [row.row_number, row.error, JSON.stringify(row.data ?? {})]),
  ]
    .map((line) => line.map((value) => escapeCsvValue(value)).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${result.import_id}-failed-rows.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function ImportResults({ result, onReset }: ImportResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Results</CardTitle>
        <CardDescription>
          Final status: <span className="font-medium">{result.status}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Processed" value={result.total_processed} />
          <MetricCard label="Successful" value={result.successful} />
          <MetricCard label="Failed" value={result.failed} />
          <MetricCard label="Accounts Created" value={result.created_accounts} />
        </div>

        {result.failed_rows.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left">Row</th>
                  <th className="px-3 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody>
                {result.failed_rows.slice(0, 50).map((row, index) => (
                  <tr key={`${row.row_number}-${index}`} className="border-t">
                    <td className="px-3 py-2">{row.row_number}</td>
                    <td className="px-3 py-2">{row.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {result.failed_rows.length > 0 ? (
            <Button variant="outline" onClick={() => downloadFailedRows(result)}>
              <Download className="mr-2 h-4 w-4" />
              Download Failed Rows
            </Button>
          ) : null}
          <Button onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Import More
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}
