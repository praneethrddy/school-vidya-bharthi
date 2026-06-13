'use client'

import type { ComponentType } from 'react'
import { FileSpreadsheet, IndianRupee, Link2, ShieldCheck, Users, UserRound } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { IMPORT_TYPE_DEFINITIONS, type ImportType } from '@/lib/import-types'

const iconMap: Record<ImportType, ComponentType<{ className?: string }>> = {
  students: Users,
  staff: UserRound,
  parents: ShieldCheck,
  student_parents: Link2,
  fee_payments: IndianRupee,
}

interface ImportTypeSelectorProps {
  importTypes: ImportType[]
  selectedType: ImportType | null
  onSelect: (value: ImportType) => void
}

export function ImportTypeSelector({
  importTypes,
  selectedType,
  onSelect,
}: ImportTypeSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {importTypes.map((importType) => {
        const definition = IMPORT_TYPE_DEFINITIONS[importType]
        const Icon = iconMap[importType] || FileSpreadsheet

        return (
          <button
            key={importType}
            type="button"
            onClick={() => onSelect(importType)}
            className="text-left"
          >
            <Card
              className={cn(
                'h-full border transition-all hover:border-primary/60 hover:shadow-sm',
                selectedType === importType && 'border-primary bg-primary/5 shadow-sm'
              )}
            >
              <CardHeader className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{definition.label}</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {definition.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {definition.fields.length} mapped fields
                </p>
              </CardContent>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
