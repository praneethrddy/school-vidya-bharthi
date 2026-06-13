'use client'

import { FormEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AcademicYearFormProps {
  onCreated?: () => Promise<void> | void
}

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }
  return (payload?.success ? payload.data : payload) as T
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function AcademicYearForm({ onCreated }: AcademicYearFormProps) {
  const now = useMemo(() => new Date(), [])
  const currentYear = now.getUTCFullYear()
  const [name, setName] = useState(`${currentYear}-${currentYear + 1}`)
  const [startDate, setStartDate] = useState(`${currentYear}-06-01`)
  const [endDate, setEndDate] = useState(`${currentYear + 1}-03-31`)
  const [loading, setLoading] = useState(false)

  const reset = () => {
    const year = new Date().getUTCFullYear()
    setName(`${year}-${year + 1}`)
    setStartDate(formatDateInput(new Date(`${year}-06-01T00:00:00.000Z`)))
    setEndDate(formatDateInput(new Date(`${year + 1}-03-31T00:00:00.000Z`)))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    try {
      await parseApi(
        await fetch('/api/settings/academic-years', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            start_date: startDate,
            end_date: endDate,
          }),
        })
      )
      toast.success('Academic year created')
      reset()
      if (onCreated) {
        await onCreated()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create academic year'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Academic Year</CardTitle>
        <CardDescription>
          Add a new academic year and generate default terms automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="academic-year-name">Name</Label>
            <Input
              id="academic-year-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="2026-2027"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="academic-year-start-date">Start Date</Label>
            <Input
              id="academic-year-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="academic-year-end-date">End Date</Label>
            <Input
              id="academic-year-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </div>

          <div className="md:col-span-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Academic Year'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

