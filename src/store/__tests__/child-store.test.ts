import { beforeEach, describe, expect, it } from 'vitest'
import { useChildStore } from '@/store/child-store'

const childrenFixture = [
  {
    student_id: 'child-1',
    name: 'Aryan Singh',
    class_name: '6-A',
    photo_url: null,
    roll_number: 'R-001',
    is_primary: true,
  },
  {
    student_id: 'child-2',
    name: 'Mira Singh',
    class_name: '3-B',
    photo_url: null,
    roll_number: 'R-002',
    is_primary: false,
  },
]

describe('child-store', () => {
  beforeEach(() => {
    useChildStore.setState({ children: [], selectedChildId: null })
  })

  it('TEST-STORE-001: setChildren() stores children array', () => {
    useChildStore.getState().setChildren(childrenFixture)
    expect(useChildStore.getState().children).toEqual(childrenFixture)
  })

  it('TEST-STORE-002: setChildren() auto-selects primary child (is_primary=true)', () => {
    useChildStore.getState().setChildren(childrenFixture)
    expect(useChildStore.getState().selectedChildId).toBe('child-1')
  })

  it('TEST-STORE-003: setChildren() falls back to first child if no primary', () => {
    useChildStore.getState().setChildren([
      { ...childrenFixture[0], student_id: 'child-3', is_primary: false },
      { ...childrenFixture[1], student_id: 'child-4', is_primary: false },
    ])
    expect(useChildStore.getState().selectedChildId).toBe('child-3')
  })

  it('TEST-STORE-004: setChildren() with empty array → selectedChildId = null', () => {
    useChildStore.getState().setChildren(childrenFixture)
    useChildStore.getState().setChildren([])
    expect(useChildStore.getState().selectedChildId).toBeNull()
  })

  it('TEST-STORE-005: selectChild() updates selectedChildId', () => {
    useChildStore.getState().setChildren(childrenFixture)
    useChildStore.getState().selectChild('child-2')
    expect(useChildStore.getState().selectedChildId).toBe('child-2')
  })

  it('TEST-STORE-006: selectedChild() returns the correct child object', () => {
    useChildStore.getState().setChildren(childrenFixture)
    useChildStore.getState().selectChild('child-2')
    const selected = useChildStore.getState().selectedChild()
    expect(selected?.student_id).toBe('child-2')
    expect(selected?.name).toBe('Mira Singh')
  })

  it('TEST-STORE-007: selectedChild() returns undefined when no match', () => {
    useChildStore.getState().setChildren([])
    expect(useChildStore.getState().selectedChild()).toBeUndefined()
  })

  it('TEST-STORE-008: selectChild() with invalid ID → selectedChild() returns undefined', () => {
    useChildStore.getState().setChildren(childrenFixture)
    useChildStore.getState().selectChild('invalid-id')
    expect(useChildStore.getState().selectedChild()).toBeUndefined()
  })
})
