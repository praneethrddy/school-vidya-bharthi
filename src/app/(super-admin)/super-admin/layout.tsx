import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BarChart3, Building2, CreditCard, Shield } from 'lucide-react'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'

const navItems = [
  {
    href: '/super-admin/dashboard',
    label: 'Dashboard',
    icon: BarChart3,
  },
  {
    href: '/super-admin/schools',
    label: 'Schools',
    icon: Building2,
  },
  {
    href: '/super-admin/billing',
    label: 'Billing',
    icon: CreditCard,
  },
]

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?callbackUrl=%2Fsuper-admin%2Fdashboard')
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Platform Control
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  SchoolOS Super Admin
                </h1>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Oversee tenant health, onboarding, billing signals, and school activation state.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Button key={item.href} asChild variant="outline" className="rounded-full">
                  <Link href={item.href}>
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
