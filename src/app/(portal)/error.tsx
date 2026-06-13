'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Portal Error Boundary:', error)
  }, [error])

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-4">
      <div className="flex max-w-md flex-col items-center text-center space-y-4 p-8 border rounded-xl bg-card shadow-sm">
        <div className="rounded-full bg-red-100 p-3">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || 'An unexpected error occurred while loading this page.'}
          </p>
        </div>
        <div className="flex w-full gap-3 mt-4">
          <Button variant="outline" className="w-full" asChild>
             <a href="/dashboard">Back to Dashboard</a>
          </Button>
          <Button onClick={() => reset()} className="w-full">
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
