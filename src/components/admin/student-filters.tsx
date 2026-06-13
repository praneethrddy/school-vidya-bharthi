'use client'

import { Download, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ClassOption } from '@/types/student-management'

interface StudentFiltersProps {
  search: string
  classId: string
  gender: 'ALL' | 'MALE' | 'FEMALE' | 'OTHER'
  status: 'ALL' | 'ACTIVE' | 'INACTIVE'
  classes: ClassOption[]
  canCreate: boolean
  onSearchChange: (value: string) => void
  onClassChange: (value: string) => void
  onGenderChange: (value: 'ALL' | 'MALE' | 'FEMALE' | 'OTHER') => void
  onStatusChange: (value: 'ALL' | 'ACTIVE' | 'INACTIVE') => void
  onAddStudent: () => void
  onExport: () => void
}

export function StudentFilters({
  search,
  classId,
  gender,
  status,
  classes,
  canCreate,
  onSearchChange,
  onClassChange,
  onGenderChange,
  onStatusChange,
  onAddStudent,
  onExport,
}: StudentFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_180px_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by student name or admission number"
            className="pl-9"
          />
        </div>

        <Select value={classId} onValueChange={onClassChange}>
          <SelectTrigger>
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All classes</SelectItem>
            {classes.map((classOption) => (
              <SelectItem key={classOption.id} value={classOption.id}>
                {classOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={gender} onValueChange={(value) => onGenderChange(value as StudentFiltersProps['gender'])}>
          <SelectTrigger>
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All genders</SelectItem>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(value) => onStatusChange(value as StudentFiltersProps['status'])}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>

        {canCreate ? (
          <Button onClick={onAddStudent}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Search supports name and admission number only. Phone/address fields are encrypted.
      </p>
    </div>
  )
}

