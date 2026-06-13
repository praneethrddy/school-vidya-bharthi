import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have permission to access this page. Contact your school administrator.
        </p>
        <Button asChild className="mt-6">
          <Link href="/admin/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
