'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, isOverpayment } from '@/lib/fee-utils'
import {
  StudentFeeBalance,
  type StudentFeeBalancePayload,
} from '@/components/admin/student-fee-balance'

interface StudentLookupItem {
  id: string
  name: string
  admission_number: string
  class_name: string
}

interface PaymentRecordResponse {
  id: string
  receipt_number: string
  receipt_url: string | null
  balance_before_payment: number
  balance_after_payment: number
  overpayment_warning: boolean
}

interface PaymentFormProps {
  onSearchStudents: (query: string) => Promise<StudentLookupItem[]>
  onFetchBalance: (studentId: string) => Promise<StudentFeeBalancePayload>
  onRecordPayment: (payload: {
    student_id: string
    fee_structure_id: string
    amount_paid: number
    payment_date: string
    payment_mode: 'CASH' | 'CHEQUE' | 'DD' | 'BANK_TRANSFER' | 'OTHER'
    reference_number?: string
    remarks?: string
  }) => Promise<PaymentRecordResponse>
  onPaymentSaved?: () => Promise<void> | void
}

const paymentModes: Array<'CASH' | 'CHEQUE' | 'DD' | 'BANK_TRANSFER' | 'OTHER'> = [
  'CASH',
  'CHEQUE',
  'DD',
  'BANK_TRANSFER',
  'OTHER',
]

export function PaymentForm({
  onSearchStudents,
  onFetchBalance,
  onRecordPayment,
  onPaymentSaved,
}: PaymentFormProps) {
  const [searchText, setSearchText] = useState('')
  const [searching, setSearching] = useState(false)
  const [students, setStudents] = useState<StudentLookupItem[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentLookupItem | null>(null)

  const [loadingBalance, setLoadingBalance] = useState(false)
  const [balanceData, setBalanceData] = useState<StudentFeeBalancePayload | null>(null)
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CHEQUE' | 'DD' | 'BANK_TRANSFER' | 'OTHER'>('CASH')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [pendingPayload, setPendingPayload] = useState<{
    student_id: string
    fee_structure_id: string
    amount_paid: number
    payment_date: string
    payment_mode: 'CASH' | 'CHEQUE' | 'DD' | 'BANK_TRANSFER' | 'OTHER'
    reference_number?: string
    remarks?: string
  } | null>(null)

  const [receiptResult, setReceiptResult] = useState<PaymentRecordResponse | null>(null)

  const selectedStructure = useMemo(() => {
    if (!balanceData || !selectedStructureId) return null
    return balanceData.balances.find((item) => item.fee_structure_id === selectedStructureId) || null
  }, [balanceData, selectedStructureId])

  const amountNumber = Number(amount || 0)
  const showOverpaymentWarning = Boolean(
    selectedStructure && amount && Number.isFinite(amountNumber) && isOverpayment(amountNumber, selectedStructure.balance_due)
  )

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

  const handleSelectStudent = async (student: StudentLookupItem) => {
    setSelectedStudent(student)
    setSelectedStructureId(null)
    setBalanceData(null)
    setReceiptResult(null)

    setLoadingBalance(true)
    try {
      const result = await onFetchBalance(student.id)
      setBalanceData(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch student fee balance'
      toast.error(message)
    } finally {
      setLoadingBalance(false)
    }
  }

  const submitPayment = async (payload: {
    student_id: string
    fee_structure_id: string
    amount_paid: number
    payment_date: string
    payment_mode: 'CASH' | 'CHEQUE' | 'DD' | 'BANK_TRANSFER' | 'OTHER'
    reference_number?: string
    remarks?: string
  }) => {
    setSubmitting(true)
    try {
      const result = await onRecordPayment(payload)
      setReceiptResult(result)
      toast.success('Payment recorded successfully')
      setAmount('')
      setReferenceNumber('')
      setRemarks('')
      if (selectedStudent) {
        const refreshedBalance = await onFetchBalance(selectedStudent.id)
        setBalanceData(refreshedBalance)
      }
      await onPaymentSaved?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record payment'
      toast.error(message)
    } finally {
      setSubmitting(false)
      setPendingPayload(null)
    }
  }

  const handleSubmit = async () => {
    if (!selectedStudent) {
      toast.error('Select a student first')
      return
    }
    if (!selectedStructureId) {
      toast.error('Select a fee structure to pay')
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid amount greater than 0')
      return
    }

    const payload = {
      student_id: selectedStudent.id,
      fee_structure_id: selectedStructureId,
      amount_paid: parsedAmount,
      payment_date: paymentDate,
      payment_mode: paymentMode,
      reference_number: referenceNumber.trim() || undefined,
      remarks: remarks.trim() || undefined,
    }

    if (selectedStructure && isOverpayment(parsedAmount, selectedStructure.balance_due)) {
      setPendingPayload(payload)
      return
    }

    await submitPayment(payload)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Record Payment</CardTitle>
          <CardDescription>
            Search student, review live balances, and record offline fee collection.
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
                    onClick={() => handleSelectStudent(student)}
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

          <StudentFeeBalance
            data={balanceData}
            loading={loadingBalance}
            selectedStructureId={selectedStructureId}
            onSelectStructure={setSelectedStructureId}
          />

          {selectedStructure ? (
            <div className="rounded-lg border p-3 text-sm">
              <p>
                Selected Category: <span className="font-medium">{selectedStructure.category_name}</span>
              </p>
              <p>
                Current Balance: <span className="font-medium">{formatCurrency(selectedStructure.balance_due)}</span>
              </p>
              {selectedStructure.status === 'PAID' ? (
                <p className="text-xs text-muted-foreground">
                  This category is already paid in full. Additional payments will be treated as overpayment.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select
                value={paymentMode}
                onValueChange={(value) =>
                  setPaymentMode(value as 'CASH' | 'CHEQUE' | 'DD' | 'BANK_TRANSFER' | 'OTHER')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Cheque/DD/Bank reference"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional remarks"
              rows={3}
            />
          </div>

          {showOverpaymentWarning ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Overpayment warning</AlertTitle>
              <AlertDescription>
                Entered amount is greater than current balance ({formatCurrency(
                  selectedStructure?.balance_due || 0
                )}). You can still proceed to track this as overpayment.
              </AlertDescription>
            </Alert>
          ) : null}

          {receiptResult ? (
            <Alert>
              <AlertTitle>Receipt generated</AlertTitle>
              <AlertDescription>
                Receipt Number: <strong>{receiptResult.receipt_number}</strong>
                {receiptResult.receipt_url ? (
                  <>
                    {' '}
                    •{' '}
                    <a
                      href={receiptResult.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      View receipt PDF
                    </a>
                  </>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Recording...' : 'Receive Payment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(pendingPayload)} onOpenChange={(open) => !open && setPendingPayload(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Overpayment</AlertDialogTitle>
            <AlertDialogDescription>
              This payment is greater than the current balance and will create an overpaid state. Do
              you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => (pendingPayload ? void submitPayment(pendingPayload) : undefined)}
              disabled={submitting}
            >
              {submitting ? 'Recording...' : 'Proceed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
