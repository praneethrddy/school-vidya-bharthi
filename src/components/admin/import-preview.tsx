'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type ImportValidationSummary } from '@/lib/import-types'

interface ImportPreviewProps {
  validation: ImportValidationSummary
}

export function ImportPreview({ validation }: ImportPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{validation.total_rows}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Valid Rows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-700">{validation.valid_rows}</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Error Rows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">{validation.error_rows}</p>
          </CardContent>
        </Card>
      </div>

      {validation.missing_required_fields.length > 0 ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Missing Required Columns</CardTitle>
            <CardDescription>
              Add mappings for these fields before processing the import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{validation.missing_required_fields.join(', ')}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Validation Errors</CardTitle>
          <CardDescription>
            Review row-level issues before importing. Only the first 50 errors are shown below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validation.errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No validation errors were found.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left">Row</th>
                    <th className="px-3 py-2 text-left">Field</th>
                    <th className="px-3 py-2 text-left">Value</th>
                    <th className="px-3 py-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.errors.slice(0, 50).map((error, index) => (
                    <tr
                      key={`${error.row_number}-${error.field}-${index}`}
                      className="border-t align-top"
                    >
                      <td className="px-3 py-2">{error.row_number}</td>
                      <td className="px-3 py-2">{error.field}</td>
                      <td className="px-3 py-2">{error.value || '-'}</td>
                      <td className="px-3 py-2">{error.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview of Valid Rows</CardTitle>
          <CardDescription>First five valid rows after mapping and validation.</CardDescription>
        </CardHeader>
        <CardContent>
          {validation.preview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No valid rows are ready yet.</p>
          ) : (
            <div className="space-y-3">
              {validation.preview.map((row) => (
                <div key={row.row_number} className="rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground">Row {row.row_number}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {Object.entries(row.data).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium">{key}:</span>{' '}
                        <span className="text-muted-foreground">
                          {value instanceof Date
                            ? value.toISOString().split('T')[0]
                            : String(value ?? '-')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
