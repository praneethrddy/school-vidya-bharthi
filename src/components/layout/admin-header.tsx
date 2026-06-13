'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { UserMenu } from './user-menu'
import { AdminMobileNav } from './admin-mobile-nav'
import { NotificationBadge } from '@/components/shared/notification-badge'
import { getAdminRouteTitle } from '@/lib/admin-dashboard-ui'

interface AdminHeaderProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    role?: string
  }
  schoolInfo?: {
    name: string
    academicYear: string
    term?: string
  }
  permissions: string[]
}

export function AdminHeader({ user, schoolInfo, permissions }: AdminHeaderProps) {
  const notificationsEnabled = user.role !== 'SUPER_ADMIN'
  const pathname = usePathname()
  const pageTitle = getAdminRouteTitle(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-4">
        <AdminMobileNav
          role={user.role as string}
          permissions={permissions}
          schoolName={schoolInfo?.name}
        />
        <div className="flex flex-col">
          <h1 className="font-semibold text-lg">{pageTitle}</h1>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate max-w-[220px]">
            {schoolInfo?.name || 'Vidhya Bharthi High School'}
            </span>
            <span>•</span>
            <span>A.Y. {schoolInfo?.academicYear || 'Current Year'}</span>
            {schoolInfo?.term ? (
              <>
                <span>•</span>
                <span>{schoolInfo.term}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBadge enabled={notificationsEnabled} />
        {user.role ? (
          <Badge variant="secondary" className="hidden md:inline-flex uppercase">
            {user.role.replace(/_/g, ' ')}
          </Badge>
        ) : null}
        <UserMenu user={user} />
      </div>
    </header>
  )
}
