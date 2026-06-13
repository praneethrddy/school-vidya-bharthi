import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PortalNotFound() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-4">
      <div className="flex max-w-md flex-col items-center text-center space-y-4">
        <div className="rounded-full bg-muted p-4">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Page not found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>
        </div>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
