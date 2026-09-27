import { beforeEach, describe, expect, it } from 'vitest'
import { usePermissionStore } from '@/store/permission-store'

describe('permission-store', () => {
  beforeEach(() => {
    usePermissionStore.setState({
      permissions: [],
      role: null,
      loading: false,
      initialized: false,
    })
  })

  it('TEST-STORE-009: setPermissionPayload() stores permissions array + role', () => {
    usePermissionStore.getState().setPermissionPayload({
      permissions: ['STUDENTS.view', 'FEES.collect'],
      role: 'ADMIN',
    })
    const state = usePermissionStore.getState()
    expect(state.permissions).toEqual(['STUDENTS.view', 'FEES.collect'])
    expect(state.role).toBe('ADMIN')
  })

  it('TEST-STORE-010: setPermissionPayload() sets initialized = true', () => {
    usePermissionStore.getState().setPermissionPayload({
      permissions: [],
      role: null,
    })
    expect(usePermissionStore.getState().initialized).toBe(true)
  })

  it('TEST-STORE-011: hasPermission(\'STUDENTS.view\') → true when in permissions', () => {
    usePermissionStore.setState({ permissions: ['STUDENTS.view'] })
    expect(usePermissionStore.getState().hasPermission('STUDENTS.view')).toBe(true)
  })

  it('TEST-STORE-012: hasPermission(\'STUDENTS.delete\') → false when not in permissions', () => {
    usePermissionStore.setState({ permissions: ['STUDENTS.view'] })
    expect(usePermissionStore.getState().hasPermission('STUDENTS.delete')).toBe(false)
  })

  it('TEST-STORE-013: hasPermission() on empty permissions → always false', () => {
    usePermissionStore.setState({ permissions: [] })
    expect(usePermissionStore.getState().hasPermission('STUDENTS.view')).toBe(false)
  })

  it('TEST-STORE-014: setLoading() toggles loading state', () => {
    usePermissionStore.getState().setLoading(true)
    expect(usePermissionStore.getState().loading).toBe(true)
    usePermissionStore.getState().setLoading(false)
    expect(usePermissionStore.getState().loading).toBe(false)
  })

  it('TEST-STORE-015: clearPermissions() resets all to defaults', () => {
    usePermissionStore.setState({
      permissions: ['SETTINGS.manage'],
      role: 'PRINCIPAL',
      loading: true,
      initialized: true,
    })
    usePermissionStore.getState().clearPermissions()
    const state = usePermissionStore.getState()
    expect(state.permissions).toEqual([])
    expect(state.role).toBeNull()
    expect(state.loading).toBe(false)
  })

  it('TEST-STORE-016: clearPermissions() sets initialized = false', () => {
    usePermissionStore.setState({ initialized: true })
    usePermissionStore.getState().clearPermissions()
    expect(usePermissionStore.getState().initialized).toBe(false)
  })
})
