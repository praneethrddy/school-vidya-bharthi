import { useSession } from 'next-auth/react'

export interface CurrentUser {
  id: string
  email: string
  role: string
  schoolId: string | null
  name?: string | null
}

export function useCurrentUser() {
  const { data: session, status } = useSession()
  
  const user = session?.user as CurrentUser | undefined
  
  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  }
}
