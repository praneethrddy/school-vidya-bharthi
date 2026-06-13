'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SchoolRow {
  id: string
  name: string
  slug: string
  email: string | null
  logo_url: string | null
  city: string | null
  state: string | null
  is_active: boolean
  created_at: string
  principal_email: string | null
  student_count: number
  staff_count: number
  user_count: number
  total_revenue: number
  custom_domain: string | null
  platform_plan: string
  platform_status: string
}

interface SchoolTableProps {
  initialSchools: SchoolRow[]
}

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }
  return (payload?.success ? payload.data : payload) as T
}

export function SchoolTable({ initialSchools }: SchoolTableProps) {
  const [schools, setSchools] = useState(initialSchools)
  const [query, setQuery] = useState('')
  const [pendingSchoolId, setPendingSchoolId] = useState<string | null>(null)

  const filteredSchools = schools.filter((school) => {
    const haystack = [
      school.name,
      school.slug,
      school.email || '',
      school.principal_email || '',
      school.city || '',
      school.state || '',
      school.custom_domain || '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(query.trim().toLowerCase())
  })

  const toggleSchoolStatus = async (school: SchoolRow) => {
    setPendingSchoolId(school.id)
    try {
      const data = await parseApi<{ school: { id: string; is_active: boolean } }>(
        await fetch('/api/super-admin/schools/suspend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            school_id: school.id,
            is_active: !school.is_active,
          }),
        })
      )

      setSchools((current) =>
        current.map((entry) =>
          entry.id === data.school.id
            ? {
                ...entry,
                is_active: data.school.is_active,
              }
            : entry
        )
      )
      toast.success(
        data.school.is_active ? 'School reactivated' : 'School suspended'
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update school status'
      toast.error(message)
    } finally {
      setPendingSchoolId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search schools, domains, or principals"
          className="pl-9"
        />
      </div>

      <div className="rounded-[1.5rem] border bg-white/90">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchools.map((school) => (
              <TableRow key={school.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium text-slate-950">{school.name}</p>
                    <p className="text-sm text-slate-500">
                      {school.slug}.schoolos.in • {school.principal_email || school.email || 'No email'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Joined {formatDate(school.created_at)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={school.is_active ? 'success' : 'warning'}>
                    {school.is_active ? 'Active' : 'Suspended'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{school.student_count.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-500">
                      {school.staff_count} staff • {school.user_count} users
                    </p>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(school.total_revenue)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant="secondary">{school.platform_plan}</Badge>
                    <p className="text-xs text-slate-500">{school.platform_status}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600">
                    {school.custom_domain || 'Not connected'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/super-admin/schools/${school.id}`}>View</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant={school.is_active ? 'destructive' : 'default'}
                      disabled={pendingSchoolId === school.id}
                      onClick={() => void toggleSchoolStatus(school)}
                    >
                      {pendingSchoolId === school.id
                        ? 'Saving...'
                        : school.is_active
                          ? 'Suspend'
                          : 'Reactivate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
