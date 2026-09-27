'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { adminNavItems } from '@/lib/admin-nav'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BadgeIndianRupee,
  BookOpenText,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Library,
  Map,
  Settings,
  Shield,
  UserCog,
  Users,
} from 'lucide-react'

const iconByKey = {
  dashboard: LayoutDashboard,
  students: Users,
  staff: UserCog,
  attendance: ClipboardCheck,
  grades: BookOpenText,
  fees: BadgeIndianRupee,
  timetable: CalendarClock,
  admissions: GraduationCap,
  library: Library,
  transport: Map,
  reports: BookOpenText,
  settings: Settings,
  permissions: Shield,
} as const

export function AdminSidebar() {
  const pathname = usePathname()
  const { can, loading, role } = usePermissions()

  const visibleItems = adminNavItems.filter((item) => {
    if (item.principalOnly) {
      return role === 'PRINCIPAL' || role === 'SUPER_ADMIN'
    }
    if (!item.permissions) {
      return true
    }
    return item.permissions.some((permission) => can(permission))
  })

  return (
    <>
      <div className="border-b bg-background px-4 py-3 md:hidden">
        {loading ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 min-w-24 rounded-md" />
            ))}
          </div>
        ) : (
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {visibleItems.map((item) => {
              const Icon = iconByKey[item.key as keyof typeof iconByKey]
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    'inline-flex min-w-fit items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium',
                    isActive ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                  {item.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>

      <aside className="hidden w-64 shrink-0 border-r bg-muted/20 md:block">
        <div className="border-b px-4 py-4">
          <p className="text-sm font-semibold">Admin Panel</p>
          <p className="text-xs text-muted-foreground">Role-based navigation</p>
        </div>
        <nav className="space-y-1 p-3">
          {loading
            ? Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-full rounded-md" />
              ))
            : visibleItems.map((item) => {
                const Icon = iconByKey[item.key as keyof typeof iconByKey]
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    {item.label}
                  </Link>
                )
              })}
        </nav>
      </aside>
    </>
  )
}
