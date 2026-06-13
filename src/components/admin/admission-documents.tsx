'use client'

import { useMemo, useState } from 'react'
import { FileText, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AdmissionDocumentsProps {
  admissionId: string
  documents: string[]
  canUpload: boolean
  onUploaded: (documents: string[]) => void | Promise<void>
}

function getFileLabel(url: string): string {
  const parts = url.split('/')
  return decodeURIComponent(parts[parts.length - 1] || 'Document')
}

export function AdmissionDocuments({
  admissionId,
  documents,
  canUpload,
  onUploaded,
}: AdmissionDocumentsProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const hasFiles = useMemo(() => selectedFiles.length > 0, [selectedFiles])

  const handleUpload = async () => {
    if (!hasFiles) {
      toast.error('Select at least one file')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch(`/api/admissions/${admissionId}/documents`, {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to upload documents')
      }

      onUploaded(payload?.data?.documents_url || documents)
      setSelectedFiles([])
      toast.success('Documents uploaded')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload documents'
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((url, index) => (
              <a
                key={`${url}-${index}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/60"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="line-clamp-1">{getFileLabel(url)}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {canUpload ? (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <Input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(event) => {
              const nextFiles = Array.from(event.target.files || [])
              setSelectedFiles(nextFiles)
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Allowed: image/*, application/pdf, max 10MB each</p>
            <Button size="sm" onClick={handleUpload} disabled={!hasFiles || uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
