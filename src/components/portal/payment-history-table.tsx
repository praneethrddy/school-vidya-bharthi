"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/fee-utils'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PaymentHistoryTable({ payments }: { payments: any[] }) {
  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-12 border rounded-md bg-muted/20">
        <p className="text-muted-foreground">No payments recorded yet.</p>
      </div>
    )
  }

  const sortedPayments = [...payments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Receipt No.</TableHead>
            <TableHead>Fee Category</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPayments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium">{payment.receipt_number}</TableCell>
              <TableCell>{payment.category_name}</TableCell>
              <TableCell>{payment.payment_mode}</TableCell>
              <TableCell className="text-right font-semibold text-green-600">{formatCurrency(payment.amount_paid)}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/fees/${payment.id}/receipt`} target="_blank" rel="noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
