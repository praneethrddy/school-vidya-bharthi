'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IMPORT_TYPE_DEFINITIONS, type ImportType } from '@/lib/import-types'

interface ColumnMapperProps {
  importType: ImportType
  detectedColumns: string[]
  columnMapping: Record<string, string | null>
  missingRequiredFields?: string[]
  validating?: boolean
  onChange: (fieldKey: string, value: string | null) => void
  onValidate: () => Promise<void> | void
}

export function ColumnMapper({
  importType,
  detectedColumns,
  columnMapping,
  missingRequiredFields = [],
  validating,
  onChange,
  onValidate,
}: ColumnMapperProps) {
  const definition = IMPORT_TYPE_DEFINITIONS[importType]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Columns</CardTitle>
        <CardDescription>
          Review the detected CSV headers and map them to the required database fields.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingRequiredFields.length > 0 ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              Missing required mappings
            </div>
            <p className="mt-1">{missingRequiredFields.join(', ')}</p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {definition.fields.map((field) => (
            <div key={field.key} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">
                  {field.label}
                  {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                </Label>
                <span className="text-[11px] text-muted-foreground">{field.key}</span>
              </div>
              <Select
                value={columnMapping[field.key] || '__none__'}
                onValueChange={(value) => onChange(field.key, value === '__none__' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select CSV column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not mapped</SelectItem>
                  {detectedColumns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.description ? (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void onValidate()} disabled={validating}>
            {validating ? 'Validating...' : 'Validate Data'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
