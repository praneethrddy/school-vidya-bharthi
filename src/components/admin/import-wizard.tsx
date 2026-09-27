'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Info } from 'lucide-react'
import { toast } from 'sonner'
import { ColumnMapper } from '@/components/admin/column-mapper'
import { CsvUpload } from '@/components/admin/csv-upload'
import { ImportPreview } from '@/components/admin/import-preview'
import { ImportProgress } from '@/components/admin/import-progress'
import { ImportResults } from '@/components/admin/import-results'
import { ImportTypeSelector } from '@/components/admin/import-type-selector'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermissions } from '@/hooks/use-permissions'
import {
  IMPORT_TYPE_DEFINITIONS,
  IMPORT_TYPES,
  STAFF_IMPORT_ACCOUNT_ROLES,
  type ImportProcessResult,
  type ImportType,
  type ImportUploadResponse,
  type ImportValidationSummary,
  type StaffImportAccountRole,
} from '@/lib/import-types'

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }

  return (payload?.success ? payload.data : payload) as T
}

function getImportStep(input: {
  selectedType: ImportType | null
  upload: ImportUploadResponse | null
  validation: ImportValidationSummary | null
  result: ImportProcessResult | null
}): number {
  if (input.result) return 7
  if (input.validation) return 6
  if (input.upload) return 4
  if (input.selectedType) return 2
  return 1
}

const stepLabels = [
  'Select Type',
  'Download Template',
  'Upload CSV',
  'Map Columns',
  'Validate',
  'Review & Import',
  'Results',
] as const

export function ImportWizard() {
  const { can, loading: permissionLoading } = usePermissions()
  const availableImportTypes = useMemo(
    () =>
      IMPORT_TYPES.filter((importType) =>
        IMPORT_TYPE_DEFINITIONS[importType].permissions.some((permission) => can(permission))
      ),
    [can]
  )

  const [selectedType, setSelectedType] = useState<ImportType | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [upload, setUpload] = useState<ImportUploadResponse | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string | null>>({})
  const [validation, setValidation] = useState<ImportValidationSummary | null>(null)
  const [result, setResult] = useState<ImportProcessResult | null>(null)

  const [uploading, setUploading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [processing, setProcessing] = useState(false)

  const [skipErrors, setSkipErrors] = useState(true)
  const [createUserAccounts, setCreateUserAccounts] = useState(false)
  const [defaultPassword, setDefaultPassword] = useState('Welcome@123')
  const [staffRole, setStaffRole] = useState<StaffImportAccountRole>('TEACHER')

  useEffect(() => {
    if (!selectedType && availableImportTypes.length > 0) {
      setSelectedType(availableImportTypes[0])
    }
  }, [availableImportTypes, selectedType])

  const currentStep = getImportStep({ selectedType, upload, validation, result })
  const canCreateAccounts =
    selectedType === 'students' || selectedType === 'staff' || selectedType === 'parents'

  const resetWizard = () => {
    setSelectedFileName(null)
    setUpload(null)
    setColumnMapping({})
    setValidation(null)
    setResult(null)
    setCreateUserAccounts(false)
    setDefaultPassword('Welcome@123')
    setStaffRole('TEACHER')
  }

  const handleSelectType = (importType: ImportType) => {
    setSelectedType(importType)
    resetWizard()
  }

  const handleDownloadTemplate = () => {
    if (!selectedType) return
    window.open(`/api/import/template?type=${selectedType}`, '_blank', 'noopener,noreferrer')
  }

  const handleUpload = async (file: File) => {
    if (!selectedType) {
      toast.error('Select an import type first')
      return
    }

    setUploading(true)
    setValidation(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.set('file', file)
      formData.set('import_type', selectedType)

      const data = await parseApi<ImportUploadResponse>(
        await fetch('/api/import/upload', {
          method: 'POST',
          body: formData,
        })
      )

      setSelectedFileName(file.name)
      setUpload(data)
      setColumnMapping(data.suggested_mapping)
      toast.success('CSV uploaded successfully')
      if (data.warnings.length > 0) {
        toast.warning(data.warnings[0])
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload CSV'
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const handleValidate = async () => {
    if (!selectedType || !upload) return

    setValidating(true)
    try {
      const data = await parseApi<ImportValidationSummary>(
        await fetch('/api/import/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upload_id: upload.upload_id,
            import_type: selectedType,
            column_mapping: columnMapping,
          }),
        })
      )

      setValidation(data)
      toast.success(
        data.error_rows > 0
          ? `Validation completed with ${data.error_rows} error row(s)`
          : 'Validation completed successfully'
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed'
      toast.error(message)
    } finally {
      setValidating(false)
    }
  }

  const handleProcess = async () => {
    if (!selectedType || !upload || !validation) return

    setProcessing(true)
    try {
      const data = await parseApi<ImportProcessResult>(
        await fetch('/api/import/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upload_id: upload.upload_id,
            import_type: selectedType,
            skip_errors: skipErrors,
            create_user_accounts: canCreateAccounts ? createUserAccounts : false,
            default_password: canCreateAccounts && createUserAccounts ? defaultPassword : undefined,
            staff_role: selectedType === 'staff' && createUserAccounts ? staffRole : undefined,
          }),
        })
      )

      setResult(data)
      toast.success(`Import finished with status ${data.status}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed'
      toast.error(message)
    } finally {
      setProcessing(false)
    }
  }

  if (permissionLoading) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Data Import Tools</h1>
        <p className="text-muted-foreground">Loading permissions...</p>
      </div>
    )
  }

  if (availableImportTypes.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Data Import Tools</h1>
        <p className="text-muted-foreground">
          You do not have permission to use data import tools.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Data Import Tools</h1>
        <p className="text-sm text-muted-foreground">
          Upload legacy CSV exports, validate them against live school data, and import them in
          controlled batches.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-7">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1
          const active = stepNumber <= currentStep
          return (
            <div
              key={label}
              className={`rounded-md border px-3 py-2 text-xs ${
                active ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'
              }`}
            >
              <p className="font-medium">Step {stepNumber}</p>
              <p>{label}</p>
            </div>
          )
        })}
      </div>

      <ImportTypeSelector
        importTypes={availableImportTypes}
        selectedType={selectedType}
        onSelect={handleSelectType}
      />

      {selectedType ? (
        <Card>
          <CardHeader>
            <CardTitle>Template & Instructions</CardTitle>
            <CardDescription>
              Start with the exact header order below to reduce manual column mapping.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download {IMPORT_TYPE_DEFINITIONS[selectedType].shortLabel} Template
              </Button>
              <p className="text-sm text-muted-foreground">
                Required fields:{' '}
                {IMPORT_TYPE_DEFINITIONS[selectedType].fields
                  .filter((field) => field.required)
                  .map((field) => field.key)
                  .join(', ')}
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Import note</AlertTitle>
              <AlertDescription>
                Class and fee validations use the current academic year. If your CSV contains legacy
                records with missing classes, correct the data before processing.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : null}

      <CsvUpload
        uploading={uploading}
        selectedFileName={selectedFileName}
        onUpload={handleUpload}
      />

      {upload ? (
        <Card>
          <CardHeader>
            <CardTitle>Detected Columns</CardTitle>
            <CardDescription>
              The system found {upload.detected_columns.length} CSV column(s).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {upload.detected_columns.map((column) => (
                <span key={column} className="rounded-full border px-3 py-1 text-xs">
                  {column}
                </span>
              ))}
            </div>
            {upload.warnings.length > 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Upload Warnings</AlertTitle>
                <AlertDescription>{upload.warnings.join(' ')}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {selectedType && upload ? (
        <ColumnMapper
          importType={selectedType}
          detectedColumns={upload.detected_columns}
          columnMapping={columnMapping}
          missingRequiredFields={validation?.missing_required_fields}
          validating={validating}
          onChange={(fieldKey, value) =>
            setColumnMapping((current) => ({
              ...current,
              [fieldKey]: value,
            }))
          }
          onValidate={handleValidate}
        />
      ) : null}

      {validation ? <ImportPreview validation={validation} /> : null}

      {validation && !result ? (
        <Card>
          <CardHeader>
            <CardTitle>Review & Import</CardTitle>
            <CardDescription>
              Choose how to handle invalid rows and account creation before the batch import starts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3">
              <Checkbox
                id="skip-errors"
                checked={skipErrors}
                onCheckedChange={(value) => setSkipErrors(Boolean(value))}
              />
              <div className="space-y-1">
                <Label htmlFor="skip-errors">Skip rows with errors</Label>
                <p className="text-sm text-muted-foreground">
                  If unchecked, the import stops when validation has any error rows.
                </p>
              </div>
            </div>

            {canCreateAccounts ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="create-accounts"
                    checked={createUserAccounts}
                    onCheckedChange={(value) => setCreateUserAccounts(Boolean(value))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="create-accounts">Create user accounts during import</Label>
                    <p className="text-sm text-muted-foreground">
                      When email is missing, the system generates a local placeholder email from the
                      imported identifier.
                    </p>
                  </div>
                </div>

                {createUserAccounts ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Default Password</Label>
                      <Input
                        value={defaultPassword}
                        onChange={(event) => setDefaultPassword(event.target.value)}
                        placeholder="Minimum 8 characters"
                      />
                    </div>

                    {selectedType === 'staff' ? (
                      <div className="space-y-2">
                        <Label>Staff Account Role</Label>
                        <Select
                          value={staffRole}
                          onValueChange={(value) => setStaffRole(value as StaffImportAccountRole)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAFF_IMPORT_ACCOUNT_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {processing ? (
              <ImportProgress
                value={92}
                label={`Processing ${validation.valid_rows} valid row(s) in batches of 50...`}
              />
            ) : null}

            <div className="flex justify-end">
              <Button
                onClick={() => void handleProcess()}
                disabled={
                  processing ||
                  (!skipErrors && validation.error_rows > 0) ||
                  (createUserAccounts && defaultPassword.trim().length < 8)
                }
              >
                Import {skipErrors ? validation.valid_rows : validation.total_rows} Record(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result ? <ImportResults result={result} onReset={resetWizard} /> : null}
    </div>
  )
}
