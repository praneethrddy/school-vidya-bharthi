'use client'

import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/fee-utils'

export interface AdminPaymentHistoryItem {
  id: string
  receipt_number: string
  student_name: string
  class_name: string
  amount_paid: number
  payment_mode: string
  payment_date: string
  collected_by: string
  receipt_url?: string | null
}

interface PaymentHistoryTableProps {
  payments: AdminPaymentHistoryItem[]
  loading?: boolean
  onViewReceipt?: (payment: AdminPaymentHistoryItem) => void
}

export function PaymentHistoryTable({
  payments,
  loading,
  onViewReceipt,
}: PaymentHistoryTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Receipt #</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Collected By</TableHead>
            <TableHead className="text-right">Receipt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Loading payment history...
              </TableCell>
            </TableRow>
          ) : payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No payments found for the selected filters.
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">{payment.receipt_number}</TableCell>
                <TableCell>{payment.student_name}</TableCell>
                <TableCell>{payment.class_name}</TableCell>
                <TableCell>{formatCurrency(payment.amount_paid)}</TableCell>
                <TableCell>{payment.payment_mode}</TableCell>
                <TableCell>{payment.payment_date}</TableCell>
                <TableCell>{payment.collected_by}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewReceipt?.(payment)}
                    disabled={!payment.receipt_url && !onViewReceipt}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
