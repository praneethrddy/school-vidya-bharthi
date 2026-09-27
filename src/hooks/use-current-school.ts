import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export interface CurrentSchool {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

export function useCurrentSchool() {
  const { data: session } = useSession()
  const schoolId = (session?.user as any)?.schoolId as string | undefined

  const [school, setSchool] = useState<CurrentSchool | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (schoolId) {
      setIsLoading(true)
      // Stub: fetch school details based on schoolId
      // fetch(`/api/schools/${schoolId}`).then(res => res.json()).then(data => setSchool(data))
      
      // Temporary mock
      setSchool({
        id: schoolId,
        name: 'Vidhya Bharthi High School',
        slug: 'vbhs',
        logo_url: null
      })
      setIsLoading(false)
    }
  }, [schoolId])

  return { school, isLoading, schoolId }
}
