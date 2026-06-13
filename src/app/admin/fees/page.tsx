'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConcessionApproval, type ConcessionRequestItem } from '@/components/admin/concession-approval'
import { ConcessionForm } from '@/components/admin/concession-form'
import { DefaulterTable, type DefaulterItem } from '@/components/admin/defaulter-table'
import { FeeStructureTable, type FeeStructureRow } from '@/components/admin/fee-structure-table'
import { PaymentForm } from '@/components/admin/payment-form'
import { PaymentHistoryTable, type AdminPaymentHistoryItem } from '@/components/admin/payment-history-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/use-permissions'
import type { StudentFeeBalancePayload } from '@/components/admin/student-fee-balance'

interface MetaPayload {
  academic_years: Array<{ id: string; name: string; is_current: boolean }>
  classes: Array<{ id: string; name: string; academic_year_id: string }>
  categories: Array<{ id: string; name: string; description?: string | null }>
  current_academic_year_id: string | null
}

interface PaymentsResponse {
  payments: AdminPaymentHistoryItem[]
  pagination: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

interface DefaultersResponse {
  defaulters: DefaulterItem[]
  pagination: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
  total_outstanding: number
}

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

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }

  if (payload?.success && payload.data !== undefined) {
    return payload.data as T
  }

  return payload as T
}

export default function AdminFeesPage() {
  const { can, role, loading: permissionLoading } = usePermissions()

  const canRecordPayment = can('FEES.record_payment')
  const canViewStructures = can('FEES.view_structure')
  const canConfigureStructure = role === 'PRINCIPAL' || role === 'SUPER_ADMIN' || can('FEES.configure_structure')
  const canCreateConcession = can('FEES.create_concession_request')
  const canApproveConcession = role === 'PRINCIPAL' || role === 'SUPER_ADMIN' || can('FEES.approve_concession')
  const canViewDefaulters = can('FEES.view_defaulters')
  const canViewReports = can('FEES.view_reports')

  const defaultTab = useMemo(() => {
    if (canRecordPayment) return 'record-payment'
    if (canViewStructures) return 'fee-structures'
    if (canCreateConcession || canApproveConcession) return 'concessions'
    if (canViewDefaulters) return 'defaulters'
    if (canViewReports) return 'payment-history'
    return 'record-payment'
  }, [
    canApproveConcession,
    canCreateConcession,
    canRecordPayment,
    canViewDefaulters,
    canViewReports,
    canViewStructures,
  ])

  const [activeTab, setActiveTab] = useState(defaultTab)

  const [meta, setMeta] = useState<MetaPayload | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')

  const [structures, setStructures] = useState<FeeStructureRow[]>([])
  const [loadingStructures, setLoadingStructures] = useState(false)

  const [concessions, setConcessions] = useState<ConcessionRequestItem[]>([])
  const [loadingConcessions, setLoadingConcessions] = useState(false)

  const [defaultersData, setDefaultersData] = useState<DefaultersResponse | null>(null)
  const [loadingDefaulters, setLoadingDefaulters] = useState(false)
  const [defaulterDate, setDefaulterDate] = useState('')
  const [defaulterMinBalance, setDefaulterMinBalance] = useState('0')

  const [paymentsData, setPaymentsData] = useState<PaymentsResponse | null>(null)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [paymentDateFrom, setPaymentDateFrom] = useState('')
  const [paymentDateTo, setPaymentDateTo] = useState('')
  const [paymentStudentId, setPaymentStudentId] = useState('')

  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  const loadMeta = async () => {
    setLoadingMeta(true)
    try {
      const data = await parseApi<MetaPayload>(await fetch('/api/admin/fees/meta', { cache: 'no-store' }))
      setMeta(data)

      const yearId = data.current_academic_year_id || data.academic_years[0]?.id || ''
      const classId = data.classes.find((item) => item.academic_year_id === yearId)?.id || data.classes[0]?.id || ''

      setSelectedAcademicYearId((prev) => prev || yearId)
      setSelectedClassId((prev) => prev || classId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load fee metadata'
      toast.error(message)
      setMeta(null)
    } finally {
      setLoadingMeta(false)
    }
  }

  useEffect(() => {
    if (permissionLoading) return
    if (!canRecordPayment && !canViewStructures && !canCreateConcession && !canApproveConcession && !canViewDefaulters && !canViewReports) {
      setLoadingMeta(false)
      return
    }

    void loadMeta()
  }, [
    canApproveConcession,
    canCreateConcession,
    canRecordPayment,
    canViewDefaulters,
    canViewReports,
    canViewStructures,
    permissionLoading,
  ])

  const loadStructures = async () => {
    if (!canViewStructures || !selectedAcademicYearId || !selectedClassId) return
    setLoadingStructures(true)
    try {
      const params = new URLSearchParams({
        academic_year_id: selectedAcademicYearId,
        class_id: selectedClassId,
      })

      const data = await parseApi<FeeStructureRow[]>(
        await fetch(`/api/admin/fees/structures?${params.toString()}`, { cache: 'no-store' })
      )
      setStructures(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load fee structures'
      toast.error(message)
    } finally {
      setLoadingStructures(false)
    }
  }

  const loadConcessions = async () => {
    if (!canCreateConcession && !canApproveConcession) return
    setLoadingConcessions(true)
    try {
      const data = await parseApi<ConcessionRequestItem[]>(
        await fetch('/api/admin/fees/concessions', { cache: 'no-store' })
      )
      setConcessions(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load concessions'
      toast.error(message)
    } finally {
      setLoadingConcessions(false)
    }
  }

  const loadDefaulters = async () => {
    if (!canViewDefaulters) return

    setLoadingDefaulters(true)
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        min_balance: defaulterMinBalance || '0',
      })

      if (selectedClassId) params.set('class_id', selectedClassId)
      if (defaulterDate) params.set('due_date_before', defaulterDate)

      const data = await parseApi<DefaultersResponse>(
        await fetch(`/api/admin/fees/defaulters?${params.toString()}`, {
          cache: 'no-store',
        })
      )
      setDefaultersData(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load defaulters'
      toast.error(message)
    } finally {
      setLoadingDefaulters(false)
    }
  }

  const loadPayments = async () => {
    if (!canViewReports) return

    setLoadingPayments(true)
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
      })

      if (selectedClassId) params.set('class_id', selectedClassId)
      if (paymentDateFrom) params.set('date_from', paymentDateFrom)
      if (paymentDateTo) params.set('date_to', paymentDateTo)
      if (paymentStudentId.trim()) params.set('student_id', paymentStudentId.trim())

      const data = await parseApi<PaymentsResponse>(
        await fetch(`/api/admin/fees/payments?${params.toString()}`, {
          cache: 'no-store',
        })
      )
      setPaymentsData(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payment history'
      toast.error(message)
    } finally {
      setLoadingPayments(false)
    }
  }

  useEffect(() => {
    if (!meta) return
    if (canViewStructures) {
      void loadStructures()
    }
  }, [canViewStructures, meta, selectedAcademicYearId, selectedClassId])

  useEffect(() => {
    if (!meta) return
    if (canCreateConcession || canApproveConcession) {
      void loadConcessions()
    }
  }, [canApproveConcession, canCreateConcession, meta])

  useEffect(() => {
    if (!meta) return
    if (canViewDefaulters) {
      void loadDefaulters()
    }
  }, [canViewDefaulters, defaulterDate, defaulterMinBalance, meta, selectedClassId])

  useEffect(() => {
    if (!meta) return
    if (canViewReports) {
      void loadPayments()
    }
  }, [canViewReports, meta, paymentDateFrom, paymentDateTo, paymentStudentId, selectedClassId])

  const filteredClasses = useMemo(() => {
    if (!meta) return []
    if (!selectedAcademicYearId) return meta.classes
    return meta.classes.filter((item) => item.academic_year_id === selectedAcademicYearId)
  }, [meta, selectedAcademicYearId])

  const searchStudents = async (query: string): Promise<StudentLookupItem[]> => {
    const params = new URLSearchParams({ q: query, limit: '10' })
    const data = await parseApi<StudentLookupItem[]>(
      await fetch(`/api/admin/fees/students?${params.toString()}`, {
        cache: 'no-store',
      })
    )
    return data
  }

  const fetchBalance = async (studentId: string): Promise<StudentFeeBalancePayload> => {
    return parseApi<StudentFeeBalancePayload>(
      await fetch(`/api/admin/fees/balance?student_id=${studentId}&force_refresh=true`, {
        cache: 'no-store',
      })
    )
  }

  const saveStructure = async (payload: {
    academic_year_id: string
    class_id: string
    fee_category_id: string
    amount: number
    due_date: string | null
    frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  }) => {
    await parseApi(
      await fetch('/api/admin/fees/structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
    await loadStructures()
  }

  const deleteStructure = async (id: string) => {
    await parseApi(
      await fetch(`/api/admin/fees/structures/${id}`, {
        method: 'DELETE',
      })
    )
    await loadStructures()
  }

  const createCategory = async (payload: { name: string; description?: string | null }) => {
    await parseApi(
      await fetch('/api/admin/fees/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )

    await loadMeta()
  }

  const recordPayment = async (payload: {
    student_id: string
    fee_structure_id: string
    amount_paid: number
    payment_date: string
    payment_mode: 'CASH' | 'CHEQUE' | 'DD' | 'BANK_TRANSFER' | 'OTHER'
    reference_number?: string
    remarks?: string
  }): Promise<PaymentRecordResponse> => {
    const response = await parseApi<{ data: PaymentRecordResponse } | PaymentRecordResponse>(
      await fetch('/api/admin/fees/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )

    if ('data' in response) {
      return response.data
    }
    return response
  }

  const createConcession = async (payload: {
    student_id: string
    fee_structure_id: string
    concession_type: 'PERCENTAGE' | 'FIXED_AMOUNT'
    concession_value: number
    reason: string
  }) => {
    await parseApi(
      await fetch('/api/admin/fees/concessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
    await loadConcessions()
  }

  const decideConcession = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    await parseApi(
      await fetch(`/api/admin/fees/concessions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
    )
    await Promise.all([loadConcessions(), loadDefaulters()])
  }

  const openReceipt = (payment: AdminPaymentHistoryItem) => {
    const fallbackRoute = `/api/admin/fees/payments/${payment.id}/receipt`
    window.open(payment.receipt_url || fallbackRoute, '_blank', 'noopener,noreferrer')
  }

  if (permissionLoading || loadingMeta) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Fee Management</h1>
        <p className="text-muted-foreground">Loading module...</p>
      </div>
    )
  }

  const hasAnyFeeAccess =
    canRecordPayment ||
    canViewStructures ||
    canCreateConcession ||
    canApproveConcession ||
    canViewDefaulters ||
    canViewReports

  if (!hasAnyFeeAccess) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Fee Management</h1>
        <p className="text-muted-foreground">
          You do not have permissions to access fee management.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Fee Management</h1>
        <p className="text-sm text-muted-foreground">
          Record offline payments, manage fee structures, process concessions, and track defaulters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Filters</CardTitle>
          <CardDescription>
            Filters below are reused across fee structures, defaulters, and payment history tabs.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Select
              value={selectedAcademicYearId || undefined}
              onValueChange={(value) => {
                setSelectedAcademicYearId(value)
                const nextClass = meta?.classes.find((item) => item.academic_year_id === value)?.id || ''
                setSelectedClassId(nextClass)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                {meta?.academic_years.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={selectedClassId || undefined} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {filteredClasses.map((schoolClass) => (
                  <SelectItem key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-5">
          {canRecordPayment ? <TabsTrigger value="record-payment">Record Payment</TabsTrigger> : null}
          {canViewStructures ? <TabsTrigger value="fee-structures">Fee Structures</TabsTrigger> : null}
          {canCreateConcession || canApproveConcession ? (
            <TabsTrigger value="concessions">Concessions</TabsTrigger>
          ) : null}
          {canViewDefaulters ? <TabsTrigger value="defaulters">Defaulters</TabsTrigger> : null}
          {canViewReports ? <TabsTrigger value="payment-history">Payment History</TabsTrigger> : null}
        </TabsList>

        {canRecordPayment ? (
          <TabsContent value="record-payment" className="pt-4">
            <PaymentForm
              onSearchStudents={searchStudents}
              onFetchBalance={fetchBalance}
              onRecordPayment={recordPayment}
              onPaymentSaved={async () => {
                await Promise.all([loadPayments(), loadDefaulters()])
              }}
            />
          </TabsContent>
        ) : null}

        {canViewStructures ? (
          <TabsContent value="fee-structures" className="pt-4">
            <FeeStructureTable
              structures={structures}
              academicYears={(meta?.academic_years || []).map((item) => ({
                id: item.id,
                name: item.name,
              }))}
              classes={filteredClasses.map((item) => ({ id: item.id, name: item.name }))}
              categories={(meta?.categories || []).map((item) => ({
                id: item.id,
                name: item.name,
                description: item.description,
              }))}
              selectedAcademicYearId={selectedAcademicYearId}
              selectedClassId={selectedClassId}
              loading={loadingStructures}
              canConfigure={canConfigureStructure}
              onAcademicYearChange={(value) => setSelectedAcademicYearId(value)}
              onClassChange={(value) => setSelectedClassId(value)}
              onSaveStructure={saveStructure}
              onDeleteStructure={deleteStructure}
              onCreateCategory={createCategory}
            />
          </TabsContent>
        ) : null}

        {canCreateConcession || canApproveConcession ? (
          <TabsContent value="concessions" className="space-y-4 pt-4">
            {canCreateConcession ? (
              <ConcessionForm
                onSearchStudents={searchStudents}
                onFetchBalance={fetchBalance}
                onCreateConcession={createConcession}
              />
            ) : null}
            <ConcessionApproval
              concessions={concessions}
              loading={loadingConcessions}
              canApprove={canApproveConcession}
              onDecision={decideConcession}
            />
          </TabsContent>
        ) : null}

        {canViewDefaulters ? (
          <TabsContent value="defaulters" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Defaulter Filters</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Due Date Before</Label>
                  <Input
                    type="date"
                    value={defaulterDate}
                    onChange={(event) => setDefaulterDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Balance</Label>
                  <Input
                    type="number"
                    min="0"
                    value={defaulterMinBalance}
                    onChange={(event) => setDefaulterMinBalance(event.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => void loadDefaulters()}>
                    Apply Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            <DefaulterTable
              defaulters={defaultersData?.defaulters || []}
              totalOutstanding={defaultersData?.total_outstanding || 0}
              loading={loadingDefaulters}
            />
          </TabsContent>
        ) : null}

        {canViewReports ? (
          <TabsContent value="payment-history" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>History Filters</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input
                    value={paymentStudentId}
                    onChange={(event) => setPaymentStudentId(event.target.value)}
                    placeholder="Optional student id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={paymentDateFrom}
                    onChange={(event) => setPaymentDateFrom(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={paymentDateTo}
                    onChange={(event) => setPaymentDateTo(event.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => void loadPayments()}>
                    Apply Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            <PaymentHistoryTable
              payments={paymentsData?.payments || []}
              loading={loadingPayments}
              onViewReceipt={openReceipt}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
