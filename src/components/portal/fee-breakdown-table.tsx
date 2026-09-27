"use client"

import { useState, Fragment } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/fee-utils'
import { FeeStatusBadge } from './fee-status-badge'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function FeeBreakdownTable({ feeDetails }: { feeDetails: any[] }) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string, e: React.MouseEvent) => {
    // Only toggle if not clicking a button
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id)
    } else {
      newExpandedRows.add(id)
    }
    setExpandedRows(newExpandedRows)
  }

  if (!feeDetails || feeDetails.length === 0) {
    return (
      <div className="text-center py-12 border rounded-md bg-muted/20">
        <p className="text-muted-foreground">No fees configured for your class yet.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-md border-b-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Fee Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Concession</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Due</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feeDetails.map((fee) => {
            const isExpanded = expandedRows.has(fee.fee_structure_id)
            return (
              <Fragment key={fee.fee_structure_id}>
                <TableRow className="hover:bg-muted/50 cursor-pointer border-b" onClick={(e) => toggleRow(fee.fee_structure_id, e)}>
                  <TableCell>
                    {fee.payments.length > 0 ? (
                      isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <span className="w-4 inline-block"></span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {fee.category_name}
                    {fee.concession && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {fee.concession.type === 'PERCENTAGE' 
                            ? `${fee.concession.value}% Discount` 
                            : `${formatCurrency(fee.concession.value)} Discount`}
                        {fee.concession.status !== 'APPROVED' && (
                           <Badge variant="outline" className="ml-2 text-[10px] h-4 leading-3 py-0">
                             {fee.concession.status}
                           </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(fee.amount)}</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {fee.concession?.deduction ? `-${formatCurrency(fee.concession.deduction)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(fee.total_paid)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(fee.balance)}</TableCell>
                  <TableCell className="text-center">
                    <FeeStatusBadge status={fee.status} />
                  </TableCell>
                </TableRow>
                {isExpanded && fee.payments.length > 0 && (
                  <TableRow className="bg-muted/30 border-b">
                    <TableCell colSpan={7} className="p-0">
                      <div className="pl-12 py-3 pr-4 border-l-2 border-primary/20 bg-background">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Payment History</h4>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b-muted">
                              <TableHead className="h-8 text-xs">Date</TableHead>
                              <TableHead className="h-8 text-xs">Receipt No.</TableHead>
                              <TableHead className="h-8 text-xs">Mode</TableHead>
                              <TableHead className="h-8 text-xs text-right">Amount</TableHead>
                              <TableHead className="h-8 w-[100px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fee.payments.map((payment: any) => (
                              <TableRow key={payment.id} className="border-none">
                                <TableCell className="py-2 text-sm">{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                <TableCell className="py-2 text-sm">{payment.receipt_number}</TableCell>
                                <TableCell className="py-2 text-sm">{payment.payment_mode}</TableCell>
                                <TableCell className="py-2 text-right text-sm font-medium">{formatCurrency(payment.amount_paid)}</TableCell>
                                <TableCell className="py-2 text-right">
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                                    <a href={`/api/fees/${payment.id}/receipt`} target="_blank" rel="noreferrer">
                                      <FileText className="h-3 w-3 mr-1" />
                                      Receipt
                                    </a>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
