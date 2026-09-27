'use client'

import { Download, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface StaffFiltersProps {
  canCreate: boolean
  search: string
  department: string
  designation: string
  isActiveOnly: boolean
  departments: string[]
  designations: string[]
  onSearchChange: (value: string) => void
  onDepartmentChange: (value: string) => void
  onDesignationChange: (value: string) => void
  onActiveOnlyChange: (value: boolean) => void
  onAddStaff: () => void
  onExport: () => void
}

export function StaffFilters({
  canCreate,
  search,
  department,
  designation,
  isActiveOnly,
  departments,
  designations,
  onSearchChange,
  onDepartmentChange,
  onDesignationChange,
  onActiveOnlyChange,
  onAddStaff,
  onExport,
}: StaffFiltersProps) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-sm text-muted-foreground">
            Add, search, and manage staff records with account and workload controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          {canCreate ? (
            <Button onClick={onAddStaff}>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
        <div className="min-w-[220px] flex-1">
          <Label htmlFor="staff-search" className="mb-2 block">
            Search Staff
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="staff-search"
              placeholder="Search by name or employee code"
              className="pl-8"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <p className="mt-1 text-right text-xs text-muted-foreground">
            Encrypted fields (phone, address) are not searchable.
          </p>
        </div>

        <div className="w-[190px]">
          <Label className="mb-2 block">Department</Label>
          <Select value={department} onValueChange={onDepartmentChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[190px]">
          <Label className="mb-2 block">Designation</Label>
          <Select value={designation} onValueChange={onDesignationChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Designations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Designations</SelectItem>
              {designations.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 pb-2">
          <Switch
            id="staff-active-filter"
            checked={isActiveOnly}
            onCheckedChange={onActiveOnlyChange}
          />
          <Label htmlFor="staff-active-filter">Show Active Only</Label>
        </div>
      </div>
    </div>
  )
}

