'use client'

import { useMemo, useState } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/fee-utils'

export interface FeeStructureRow {
  id: string
  academic_year_id: string
  academic_year_name: string
  class_id: string
  class_name: string
  fee_category_id: string
  category_name: string
  amount: number
  due_date: string | null
  frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
}

interface SelectOption {
  id: string
  name: string
}

interface CategoryOption extends SelectOption {
  description?: string | null
}

interface FeeStructureTableProps {
  structures: FeeStructureRow[]
  academicYears: SelectOption[]
  classes: SelectOption[]
  categories: CategoryOption[]
  selectedAcademicYearId: string
  selectedClassId: string
  loading?: boolean
  canConfigure: boolean
  onAcademicYearChange: (value: string) => void
  onClassChange: (value: string) => void
  onSaveStructure: (payload: {
    academic_year_id: string
    class_id: string
    fee_category_id: string
    amount: number
    due_date: string | null
    frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  }) => Promise<void>
  onDeleteStructure: (id: string) => Promise<void>
  onCreateCategory: (payload: { name: string; description?: string | null }) => Promise<void>
}

const frequencyOptions: Array<FeeStructureRow['frequency']> = [
  'ONE_TIME',
  'MONTHLY',
  'QUARTERLY',
  'ANNUALLY',
]

export function FeeStructureTable({
  structures,
  academicYears,
  classes,
  categories,
  selectedAcademicYearId,
  selectedClassId,
  loading,
  canConfigure,
  onAcademicYearChange,
  onClassChange,
  onSaveStructure,
  onDeleteStructure,
  onCreateCategory,
}: FeeStructureTableProps) {
  const [openStructureDialog, setOpenStructureDialog] = useState(false)
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<FeeStructureRow | null>(null)

  const [formAcademicYearId, setFormAcademicYearId] = useState(selectedAcademicYearId)
  const [formClassId, setFormClassId] = useState(selectedClassId)
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formFrequency, setFormFrequency] = useState<FeeStructureRow['frequency']>('QUARTERLY')

  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')

  const filteredStructures = useMemo(() => {
    return structures.filter(
      (item) =>
        (!selectedAcademicYearId || item.academic_year_id === selectedAcademicYearId) &&
        (!selectedClassId || item.class_id === selectedClassId)
    )
  }, [selectedAcademicYearId, selectedClassId, structures])

  const resetForm = () => {
    setEditing(null)
    setFormAcademicYearId(selectedAcademicYearId)
    setFormClassId(selectedClassId)
    setFormCategoryId('')
    setFormAmount('')
    setFormDueDate('')
    setFormFrequency('QUARTERLY')
  }

  const openCreateForm = () => {
    resetForm()
    setOpenStructureDialog(true)
  }

  const openEditForm = (structure: FeeStructureRow) => {
    setEditing(structure)
    setFormAcademicYearId(structure.academic_year_id)
    setFormClassId(structure.class_id)
    setFormCategoryId(structure.fee_category_id)
    setFormAmount(String(structure.amount))
    setFormDueDate(structure.due_date || '')
    setFormFrequency(structure.frequency)
    setOpenStructureDialog(true)
  }

  const handleSaveStructure = async () => {
    if (!formAcademicYearId || !formClassId || !formCategoryId || !formAmount) {
      toast.error('Please complete all required fields')
      return
    }

    const amount = Number(formAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Amount should be greater than 0')
      return
    }

    setSaving(true)
    try {
      await onSaveStructure({
        academic_year_id: formAcademicYearId,
        class_id: formClassId,
        fee_category_id: formCategoryId,
        amount,
        due_date: formDueDate || null,
        frequency: formFrequency,
      })

      toast.success(editing ? 'Fee structure updated' : 'Fee structure created')
      setOpenStructureDialog(false)
      resetForm()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save structure'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await onDeleteStructure(id)
      toast.success('Fee structure deleted')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete structure'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required')
      return
    }

    setSaving(true)
    try {
      await onCreateCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim() || null,
      })

      toast.success('Fee category created')
      setCategoryName('')
      setCategoryDescription('')
      setOpenCategoryDialog(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create category'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Fee Structures</CardTitle>
            <CardDescription>
              Configure category-wise fee amounts for each class and academic year.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {canConfigure ? (
              <Button variant="outline" onClick={() => setOpenCategoryDialog(true)}>
                Add Category
              </Button>
            ) : null}
            {canConfigure ? (
              <Button onClick={openCreateForm}>
                <Plus className="mr-1 h-4 w-4" /> Add Structure
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Select value={selectedAcademicYearId || undefined} onValueChange={onAcademicYearChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={selectedClassId || undefined} onValueChange={onClassChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading fee structures...
                  </TableCell>
                </TableRow>
              ) : filteredStructures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No fee structures configured for this selection.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStructures.map((structure) => (
                  <TableRow key={structure.id}>
                    <TableCell className="font-medium">{structure.category_name}</TableCell>
                    <TableCell>{formatCurrency(structure.amount)}</TableCell>
                    <TableCell>{structure.due_date || '-'}</TableCell>
                    <TableCell>{structure.frequency}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canConfigure ? (
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(structure)}
                            aria-label="Edit structure"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(structure.id)}
                            aria-label="Delete structure"
                            disabled={deletingId === structure.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Principal only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={openStructureDialog} onOpenChange={setOpenStructureDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Fee Structure' : 'Add Fee Structure'}</DialogTitle>
            <DialogDescription>
              Define category amount, due date, and frequency for selected class.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={formAcademicYearId || undefined} onValueChange={setFormAcademicYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={formClassId || undefined} onValueChange={setFormClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fee Category</Label>
              <Select value={formCategoryId || undefined} onValueChange={setFormCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  value={formAmount}
                  onChange={(event) => setFormAmount(event.target.value)}
                  placeholder="e.g. 12000"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formDueDate}
                  onChange={(event) => setFormDueDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={formFrequency}
                onValueChange={(value) => setFormFrequency(value as FeeStructureRow['frequency'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStructureDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStructure} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCategoryDialog} onOpenChange={setOpenCategoryDialog}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Add Fee Category</DialogTitle>
            <DialogDescription>
              Create school-level fee category like Tuition, Transport, or Lab.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Tuition"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={saving}>
              {saving ? 'Saving...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
