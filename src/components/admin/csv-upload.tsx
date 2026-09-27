'use client'

import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CsvUploadProps {
  disabled?: boolean
  uploading?: boolean
  selectedFileName?: string | null
  onUpload: (file: File) => Promise<void> | void
}

export function CsvUpload({ disabled, uploading, selectedFileName, onUpload }: CsvUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    await onUpload(file)
  }

  return (
    <Card className={dragging ? 'border-primary' : undefined}>
      <CardHeader>
        <CardTitle>Upload CSV</CardTitle>
        <CardDescription>
          Upload a UTF-8 CSV up to 10MB. Excel-exported UTF-8 BOM files are supported.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-lg border border-dashed bg-muted/20 p-8 text-center"
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            void handleFiles(event.dataTransfer.files)
          }}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileUp className="h-5 w-5" />
            )}
          </div>
          <p className="mt-4 text-sm font-medium">
            Drag and drop your CSV here, or choose a file to continue
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedFileName
              ? `Selected file: ${selectedFileName}`
              : 'Only .csv files are accepted'}
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
            disabled={disabled || uploading}
          />

          <Button
            className="mt-4"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? 'Uploading...' : 'Choose CSV'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
