'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { StudentFeeBalancePayload } from './student-fee-balance'

interface StudentLookupItem {
  id: string
  name: string
  admission_number: string
  class_name: string
}

interface ConcessionFormProps {
  onSearchStudents: (query: string) => Promise<StudentLookupItem[]>
  onFetchBalance: (studentId: string) => Promise<StudentFeeBalancePayload>
  onCreateConcession: (payload: {
    student_id: string
    fee_structure_id: string
    concession_type: 'PERCENTAGE' | 'FIXED_AMOUNT'
    concession_value: number
    reason: string
  }) => Promise<void>
}

export function ConcessionForm({
  onSearchStudents,
  onFetchBalance,
  onCreateConcession,
}: ConcessionFormProps) {
  const [searchText, setSearchText] = useState('')
  const [searching, setSearching] = useState(false)
  const [students, setStudents] = useState<StudentLookupItem[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentLookupItem | null>(null)
  const [balances, setBalances] = useState<StudentFeeBalancePayload | null>(null)

  const [concessionType, setConcessionType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE')
  const [structureId, setStructureId] = useState('')
  const [concessionValue, setConcessionValue] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const availableStructures = useMemo(() => balances?.balances || [], [balances])

  const handleSearch = async () => {
    const query = searchText.trim()
    if (!query) {
      toast.error('Enter student name or admission number')
      return
    }

    setSearching(true)
    try {
      const result = await onSearchStudents(query)
      setStudents(result)

      if (!result.length) {
        toast.error('No student found with this name or admission number')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to search students'
      toast.error(message)
    } finally {
      setSearching(false)
    }
  }

  const selectStudent = async (student: StudentLookupItem) => {
    setSelectedStudent(student)
    setStructureId('')
    try {
      const response = await onFetchBalance(student.id)
      setBalances(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch fee balance'
      toast.error(message)
      setBalances(null)
    }
  }

  const handleSubmit = async () => {
    if (!selectedStudent) {
      toast.error('Select a student first')
      return
    }

    if (!structureId || !concessionValue || !reason.trim()) {
      toast.error('Please complete concession form fields')
      return
    }

    const value = Number(concessionValue)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Concession value should be greater than 0')
      return
    }

    if (concessionType === 'PERCENTAGE' && value > 100) {
      toast.error('Percentage concession must be 100 or less')
      return
    }

    setSubmitting(true)
    try {
      await onCreateConcession({
        student_id: selectedStudent.id,
        fee_structure_id: structureId,
        concession_type: concessionType,
        concession_value: value,
        reason: reason.trim(),
      })

      toast.success('Concession request created and sent for approval')
      setConcessionValue('')
      setReason('')
      setConcessionType('PERCENTAGE')
      setStructureId('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create concession request'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Concession Request</CardTitle>
        <CardDescription>
          ACCOUNTANT or STUDENT_ADMIN can submit concession requests for principal approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by student name or admission number"
          />
          <Button onClick={handleSearch} disabled={searching}>
            <Search className="mr-1 h-4 w-4" />
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {students.length ? (
          <div className="rounded-lg border p-2">
            <p className="mb-2 text-xs text-muted-foreground">Select student</p>
            <div className="grid gap-2 md:grid-cols-2">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className={`rounded-md border p-2 text-left text-sm transition ${
                    selectedStudent?.id === student.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => selectStudent(student)}
                >
                  <p className="font-medium">{student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.admission_number} • {student.class_name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Fee Structure</Label>
            <Select value={structureId || undefined} onValueChange={setStructureId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {availableStructures.map((item) => (
                  <SelectItem key={item.fee_structure_id} value={item.fee_structure_id}>
                    {item.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Concession Type</Label>
            <Select
              value={concessionType}
              onValueChange={(value) => setConcessionType(value as 'PERCENTAGE' | 'FIXED_AMOUNT')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{concessionType === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount (INR)'}</Label>
          <Input
            type="number"
            min="0"
            max={concessionType === 'PERCENTAGE' ? 100 : undefined}
            value={concessionValue}
            onChange={(event) => setConcessionValue(event.target.value)}
            placeholder={concessionType === 'PERCENTAGE' ? 'e.g. 15' : 'e.g. 2500'}
          />
        </div>

        <div className="space-y-2">
          <Label>Reason</Label>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Provide detailed reason for concession request"
            rows={4}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Create Request'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
