'use client'

import { FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportButtonsProps {
  disabled?: boolean
  exportingPdf?: boolean
  exportingExcel?: boolean
  onDownloadPdf: () => void
  onDownloadExcel: () => void
}

export function ExportButtons({
  disabled,
  exportingPdf,
  exportingExcel,
  onDownloadPdf,
  onDownloadExcel,
}: ExportButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || exportingPdf}
        onClick={onDownloadPdf}
      >
        <FileText className="mr-2 h-4 w-4" />
        {exportingPdf ? 'Preparing PDF...' : 'Download PDF'}
      </Button>
      <Button
        type="button"
        disabled={disabled || exportingExcel}
        onClick={onDownloadExcel}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {exportingExcel ? 'Preparing Excel...' : 'Download Excel'}
      </Button>
    </div>
  )
}
