import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { PortalSidebar } from '@/components/layout/portal-sidebar'
import { PortalHeader } from '@/components/layout/portal-header'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Ensure only STUDENT and PARENT can access the portal layout.
  if (session.user.role !== 'STUDENT' && session.user.role !== 'PARENT') {
    // If they are an admin/staff role, redirect them to the admin dashboard (assuming it exists later or /admin)
    redirect('/admin')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PortalSidebar role={session.user.role} />
      <div className="flex w-full flex-1 flex-col overflow-hidden">
        <PortalHeader user={session.user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
