'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/fee-utils'

export interface StudentFeeBalancePayload {
  student: {
    id: string
    name: string
    class_name: string
  }
  balances: Array<{
    fee_structure_id: string
    category_name: string
    total_amount: number
    concession_amount: number
    total_paid: number
    balance_due: number
    status: 'PAID' | 'OUTSTANDING' | 'OVERPAID'
    due_date: string | null
    payments: Array<{
      id: string
      receipt_number: string
      amount: number
      date: string
      mode: string
      receipt_url: string | null
    }>
  }>
  total_due: number
  total_paid: number
  total_balance: number
}

interface StudentFeeBalanceProps {
  data: StudentFeeBalancePayload | null
  loading?: boolean
  selectedStructureId?: string | null
  onSelectStructure?: (feeStructureId: string) => void
}

function getStatusVariant(status: 'PAID' | 'OUTSTANDING' | 'OVERPAID') {
  if (status === 'PAID') return 'success'
  if (status === 'OVERPAID') return 'warning'
  return 'secondary'
}

export function StudentFeeBalance({
  data,
  loading,
  selectedStructureId,
  onSelectStructure,
}: StudentFeeBalanceProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Balance</CardTitle>
          <CardDescription>Loading fee balance details...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Balance</CardTitle>
          <CardDescription>
            Search a student to view fee category-wise balances and payment breakdown.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.student.name}</CardTitle>
        <CardDescription>Class: {data.student.class_name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Net Payable</p>
            <p className="text-lg font-semibold">{formatCurrency(data.total_due)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Collected</p>
            <p className="text-lg font-semibold">{formatCurrency(data.total_paid)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-semibold">{formatCurrency(data.total_balance)}</p>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Concession</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.balances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No fee structures configured for this class.
                  </TableCell>
                </TableRow>
              ) : (
                data.balances.map((item) => (
                  <TableRow key={item.fee_structure_id}>
                    <TableCell className="font-medium">{item.category_name}</TableCell>
                    <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                    <TableCell>{formatCurrency(item.concession_amount)}</TableCell>
                    <TableCell>{formatCurrency(item.total_paid)}</TableCell>
                    <TableCell>{formatCurrency(item.balance_due)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell>{item.due_date || '-'}</TableCell>
                    <TableCell className="text-right">
                      {onSelectStructure ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            selectedStructureId === item.fee_structure_id ? 'default' : 'outline'
                          }
                          onClick={() => onSelectStructure(item.fee_structure_id)}
                        >
                          {selectedStructureId === item.fee_structure_id ? 'Selected' : 'Pay'}
                        </Button>
                      ) : null}
                    </TableCell>
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
