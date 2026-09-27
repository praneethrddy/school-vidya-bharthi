import { create } from 'zustand'

interface Child {
  student_id: string
  name: string
  class_name: string
  photo_url: string | null
  roll_number: string
  is_primary: boolean
}

interface ChildState {
  children: Child[]
  selectedChildId: string | null
  setChildren: (children: Child[]) => void
  selectChild: (studentId: string) => void
  selectedChild: () => Child | undefined
}

export const useChildStore = create<ChildState>((set, get) => ({
  children: [],
  selectedChildId: null,
  setChildren: (children) => {
    const primary = children.find((c) => c.is_primary)
    set({
      children,
      selectedChildId: primary?.student_id || children[0]?.student_id || null,
    })
  },
  selectChild: (studentId) => set({ selectedChildId: studentId }),
  selectedChild: () => get().children.find((c) => c.student_id === get().selectedChildId),
}))
