'use client'

import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/fee-utils'

export interface DefaulterItem {
  student_id: string
  student_name: string
  class_name: string
  parent_name: string | null
  parent_phone: string | null
  total_due: number
  total_paid: number
  balance: number
  overdue_categories: string[]
}

interface DefaulterTableProps {
  defaulters: DefaulterItem[]
  totalOutstanding: number
  loading?: boolean
}

export function DefaulterTable({
  defaulters,
  totalOutstanding,
  loading,
}: DefaulterTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle>Defaulter List</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <FileDown className="mr-1 h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" size="sm" disabled>
            <FileDown className="mr-1 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-semibold">{formatCurrency(totalOutstanding)}</p>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Parent Contact</TableHead>
                <TableHead>Total Due</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Balance Due</TableHead>
                <TableHead>Overdue Categories</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Loading defaulters...
                  </TableCell>
                </TableRow>
              ) : defaulters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No defaulters found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                defaulters.map((defaulter) => (
                  <TableRow key={defaulter.student_id}>
                    <TableCell className="font-medium">{defaulter.student_name}</TableCell>
                    <TableCell>{defaulter.class_name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{defaulter.parent_name || 'Not linked'}</p>
                        <p className="text-muted-foreground">{defaulter.parent_phone || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(defaulter.total_due)}</TableCell>
                    <TableCell>{formatCurrency(defaulter.total_paid)}</TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(defaulter.balance)}
                    </TableCell>
                    <TableCell>{defaulter.overdue_categories.join(', ') || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
