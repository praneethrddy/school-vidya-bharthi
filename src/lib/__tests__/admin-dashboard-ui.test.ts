import { describe, expect, it } from 'vitest'
import {
  buildAttendanceChartData,
  buildEnrollmentChartData,
  buildFeeChartData,
  formatCurrencyINR,
  getAdminRouteTitle,
  getAttendanceTone,
  getPendingActionTotal,
} from '@/lib/admin-dashboard-ui'

describe('admin-dashboard-ui helpers', () => {
  it('TEST-ADUI-001 getAdminRouteTitle maps standard and fallback pathnames', () => {
    expect(getAdminRouteTitle('/admin/dashboard')).toBe('Dashboard')
    expect(getAdminRouteTitle('/admin/fees')).toBe('Fees')
    expect(getAdminRouteTitle('/admin/custom-report-builder')).toBe('Custom Report Builder')
  })

  it('TEST-ADUI-002 getAttendanceTone uses success/warning/danger thresholds', () => {
    expect(getAttendanceTone(90)).toBe('success')
    expect(getAttendanceTone(89.9)).toBe('warning')
    expect(getAttendanceTone(75)).toBe('warning')
    expect(getAttendanceTone(74.9)).toBe('danger')
  })

  it('TEST-ADUI-003 buildAttendanceChartData filters zero values', () => {
    expect(
      buildAttendanceChartData({
        total_students: 100,
        present: 85,
        absent: 15,
        late: 0,
        percentage: 85,
        not_marked: 0,
      })
    ).toEqual([
      { name: 'Present', value: 85, fill: '#2563eb' },
      { name: 'Absent', value: 15, fill: '#ef4444' },
    ])
    expect(buildAttendanceChartData(null)).toEqual([])
  })

  it('TEST-ADUI-004 buildFeeChartData returns collected and outstanding slices', () => {
    expect(
      buildFeeChartData({
        total_expected: 200000,
        total_collected: 120000,
        total_outstanding: 80000,
        collection_percentage: 60,
        this_month_collected: 15000,
      })
    ).toEqual([
      { name: 'Collected', amount: 120000, fill: '#0f766e' },
      { name: 'Outstanding', amount: 80000, fill: '#fb923c' },
    ])
    expect(buildFeeChartData(null)).toEqual([])
  })

  it('TEST-ADUI-005 buildEnrollmentChartData maps class-wise data', () => {
    expect(
      buildEnrollmentChartData({
        total_students: 120,
        total_staff: 15,
        total_classes: 4,
        class_wise: [
          { class_id: 'class-1', class_name: 'Grade 6 A', student_count: 32 },
          { class_id: 'class-2', class_name: 'Grade 7 A', student_count: 30 },
        ],
      })
    ).toEqual([
      { name: 'Grade 6 A', students: 32 },
      { name: 'Grade 7 A', students: 30 },
    ])
    expect(buildEnrollmentChartData(null)).toEqual([])
  })

  it('TEST-ADUI-006 getPendingActionTotal sums all pending buckets', () => {
    expect(
      getPendingActionTotal({
        pending_admissions: 5,
        pending_concessions: 2,
        overdue_books: 1,
      })
    ).toBe(8)
    expect(getPendingActionTotal(null)).toBe(0)
  })

  it('TEST-ADUI-007 formatCurrencyINR formats with INR currency conventions', () => {
    const formatted = formatCurrencyINR(125000)
    expect(formatted).toContain('1,25,000')
    expect(formatted).toMatch(/\d/)
  })
})
