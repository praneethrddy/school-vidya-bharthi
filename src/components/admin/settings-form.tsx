'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SettingsPayload {
  settings: Array<{
    id: string
    setting_key: string
    setting_value: string
    updated_at: string
  }>
  settings_map: Record<string, string>
}

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }
  return (payload?.success ? payload.data : payload) as T
}

function parseWorkingDays(value: string | undefined): string[] {
  if (!value) {
    return [...WEEK_DAYS]
  }
  return value
    .split(',')
    .map((day) => day.trim().toUpperCase())
    .filter(Boolean)
}

export function SettingsForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedDays, setSelectedDays] = useState<string[]>([...WEEK_DAYS])
  const [gradingScheme, setGradingScheme] = useState('PERCENTAGE')
  const [receiptPrefix, setReceiptPrefix] = useState('VBHS')
  const [academicStartMonth, setAcademicStartMonth] = useState('6')
  const [attendanceType, setAttendanceType] = useState('DAILY')

  const hasSelectedDay = useMemo(() => selectedDays.length > 0, [selectedDays])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await parseApi<SettingsPayload>(
        await fetch('/api/settings/general', { cache: 'no-store' })
      )
      const map = data.settings_map || {}

      setSelectedDays(parseWorkingDays(map.working_days))
      setGradingScheme(map.grading_scheme || 'PERCENTAGE')
      setReceiptPrefix(map.receipt_prefix || 'VBHS')
      setAcademicStartMonth(map.academic_start_month || '6')
      setAttendanceType(map.attendance_type || 'DAILY')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load settings'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const toggleDay = (day: string, checked: boolean) => {
    setSelectedDays((current) => {
      if (checked) {
        return [...new Set([...current, day])]
      }
      return current.filter((entry) => entry !== day)
    })
  }

  const handleSave = async () => {
    if (!hasSelectedDay) {
      toast.error('Select at least one working day')
      return
    }

    setSaving(true)
    try {
      await parseApi<SettingsPayload>(
        await fetch('/api/settings/general', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: [
              {
                setting_key: 'working_days',
                setting_value: selectedDays.join(','),
              },
              {
                setting_key: 'grading_scheme',
                setting_value: gradingScheme,
              },
              {
                setting_key: 'receipt_prefix',
                setting_value: receiptPrefix.trim(),
              },
              {
                setting_key: 'academic_start_month',
                setting_value: academicStartMonth,
              },
              {
                setting_key: 'attendance_type',
                setting_value: attendanceType,
              },
            ],
          }),
        })
      )
      toast.success('General settings saved')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Configure working days, grading scheme, receipt prefix, and academic cycle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Working Days</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {WEEK_DAYS.map((day) => (
              <label key={day} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <Checkbox
                  checked={selectedDays.includes(day)}
                  disabled={loading}
                  onCheckedChange={(checked) => toggleDay(day, checked === true)}
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Grading Scheme</Label>
            <Select
              value={gradingScheme}
              disabled={loading}
              onValueChange={setGradingScheme}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select grading scheme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                <SelectItem value="GRADE">Grade</SelectItem>
                <SelectItem value="GPA">GPA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Receipt Prefix</Label>
            <Input
              value={receiptPrefix}
              disabled={loading}
              onChange={(event) => setReceiptPrefix(event.target.value.toUpperCase())}
              placeholder="VBHS"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label>Academic Start Month</Label>
            <Select
              value={academicStartMonth}
              disabled={loading}
              onValueChange={setAcademicStartMonth}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Attendance Type</Label>
            <Select
              value={attendanceType}
              disabled={loading}
              onValueChange={setAttendanceType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select attendance type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  )
}

